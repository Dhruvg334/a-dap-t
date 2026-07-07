from __future__ import annotations

from typing import Any

SCANNER_VERSION = "v3-security-posture-score-1"

SEVERITY_POINTS = {"critical": 8, "high": 4, "medium": 2, "low": 1, "info": 0}


def _safe_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _safe_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _severity_penalty(summary: dict[str, Any], *, cap: int) -> int:
    total = 0
    for severity, count in _safe_dict(summary).items():
        total += SEVERITY_POINTS.get(str(severity).lower(), 0) * _int(count)
    return min(total, cap)


def _risk_level_penalty(risk_counts: dict[str, Any], *, cap: int) -> int:
    total = 0
    for level, count in _safe_dict(risk_counts).items():
        total += SEVERITY_POINTS.get(str(level).lower(), 0) * _int(count)
    return min(total, cap)


def _status_penalty(control: dict[str, Any]) -> int:
    status = str(control.get("status") or "unknown").lower()
    risk_instances = _int(control.get("risk_instances"))
    risk_level = str(control.get("risk_level") or "info").lower()

    if status in {"strong", "not_applicable"} or risk_instances <= 0:
        return 0

    base = {
        "critical": 8,
        "high": 5,
        "medium": 3,
        "low": 1,
        "info": 1,
    }.get(risk_level, 2)

    status_boost = 3 if status in {"weak", "missing", "unknown"} else 1
    return min(base + status_boost + min(risk_instances, 5), 14)


def compute_v3_security_posture(report: dict[str, Any]) -> dict[str, Any]:
    """Compute the v3 security-posture score from v3 artifacts.

    The legacy safety_score only covers the original six AI-agent finding categories.
    v3 adds dependency, API, AppSec, context, capability, and guardrail signals, so we keep
    this score separate instead of silently changing the old frontend contract.
    """
    legacy_score = _int(report.get("safety_score"), 100)
    dependency_risks = _safe_dict(report.get("dependency_risks"))
    api_surface = _safe_dict(report.get("api_surface"))
    context_risks = _safe_dict(report.get("context_poisoning_risks"))
    appsec_risks = _safe_dict(report.get("appsec_risks"))
    capability_map = _safe_dict(report.get("capability_map"))
    trust_boundaries = _safe_dict(report.get("trust_boundaries"))
    guardrail_matrix = _safe_dict(report.get("guardrail_matrix"))

    penalties: list[dict[str, Any]] = []

    dep_summary = _safe_dict(dependency_risks.get("summary"))
    dep_penalty = min(_int(dep_summary.get("risky_dependencies")) * 2, 18)
    if dep_penalty:
        penalties.append({"source": "dependency_risks", "penalty": dep_penalty, "reason": "Risky or weak dependency specifications were detected."})

    api_penalty = _severity_penalty(_safe_dict(api_surface.get("summary")).get("severity_counts", {}), cap=24)
    if api_penalty:
        penalties.append({"source": "api_surface", "penalty": api_penalty, "reason": "API endpoints have visible auth, rate-limit, CORS, or upload-control gaps."})

    context_penalty = _severity_penalty(_safe_dict(context_risks.get("summary")).get("severity_counts", {}), cap=22)
    if context_penalty:
        penalties.append({"source": "context_poisoning_risks", "penalty": context_penalty, "reason": "Memory, RAG, or retrieved-context risks can influence later agent behavior."})

    appsec_penalty = _severity_penalty(_safe_dict(appsec_risks.get("summary")).get("severity_counts", {}), cap=30)
    if appsec_penalty:
        penalties.append({"source": "appsec_risks", "penalty": appsec_penalty, "reason": "Traditional AppSec sinks were detected in the project code."})

    concrete_penalty = dep_penalty + api_penalty + context_penalty + appsec_penalty
    heuristic_cap = 8 if concrete_penalty else 4
    guardrail_cap = 28 if concrete_penalty else 10
    boundary_cap = 12 if concrete_penalty else 4

    cap_summary = _safe_dict(capability_map.get("summary"))
    cap_penalty = _risk_level_penalty(cap_summary.get("risk_counts", {}), cap=20)
    # Capability count alone should not destroy a score. If there are no concrete API/AppSec/
    # dependency/context risks, capability gaps are treated as review pressure, not proof of danger.
    cap_penalty = min(cap_penalty, heuristic_cap + min(_int(cap_summary.get("approval_missing_count")) // 6, 4))
    if cap_penalty:
        penalties.append({"source": "capability_map", "penalty": cap_penalty, "reason": "High-impact capabilities were detected and need visible controls."})

    boundary_summary = _safe_dict(trust_boundaries.get("summary"))
    boundary_penalty = min(_int(boundary_summary.get("weak_boundaries")) // 3, boundary_cap)
    if boundary_penalty:
        penalties.append({"source": "trust_boundaries", "penalty": boundary_penalty, "reason": "Weak trust-boundary crossings were detected."})

    guardrail_penalty = 0
    for control in _safe_list(guardrail_matrix.get("controls")):
        guardrail_penalty += _status_penalty(_safe_dict(control))
    guardrail_penalty = min(guardrail_penalty, guardrail_cap)
    if guardrail_penalty:
        penalties.append({"source": "guardrail_matrix", "penalty": guardrail_penalty, "reason": "Required guardrails have weak or partial visible coverage."})

    total_penalty = min(sum(item["penalty"] for item in penalties), 85)
    # Blend with the legacy score so v2 findings still matter, but v3 artifacts can lower an
    # overly optimistic legacy score when API/AppSec/dependency risks are present.
    v3_score = max(0, min(100, min(legacy_score, 100 - total_penalty)))

    if v3_score <= 25:
        status = "Critical Risk"
    elif v3_score <= 50:
        status = "High Risk"
    elif v3_score <= 75:
        status = "Moderate Risk"
    elif v3_score <= 90:
        status = "Low Risk"
    else:
        status = "Strong"

    top_penalties = sorted(penalties, key=lambda item: -int(item["penalty"]))[:5]
    return {
        "v3_security_score": v3_score,
        "v3_status": status,
        "legacy_safety_score": legacy_score,
        "total_penalty": total_penalty,
        "top_penalties": top_penalties,
        "penalties": penalties,
        "scanner_version": SCANNER_VERSION,
        "notes": [
            "v3_security_score combines legacy AI-agent findings with dependency, API, AppSec, context, capability, trust-boundary, and guardrail signals.",
            "The legacy safety_score is kept unchanged for frontend/backward compatibility.",
        ],
    }
