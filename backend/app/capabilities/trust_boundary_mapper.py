from __future__ import annotations

import hashlib
from collections import Counter
from typing import Any


def _stable_id(prefix: str, *parts: object) -> str:
    raw = "::".join(str(part) for part in parts)
    return f"{prefix}_{hashlib.sha1(raw.encode('utf-8', errors='ignore')).hexdigest()[:10]}"


def _severity_to_status(severity: str) -> str:
    sev = (severity or "").lower()
    if sev in {"critical", "high"}:
        return "weak"
    if sev == "medium":
        return "partial"
    return "review"


def _add_boundary(boundaries: list[dict[str, Any]], *, source: str, target: str, risk_type: str, status: str, severity: str, evidence: str = "", file: str = "", line: int = 1, related_capabilities: list[str] | None = None, related_risks: list[str] | None = None, recommended_control: str = "") -> None:
    boundaries.append({
        "id": _stable_id("boundary", source, target, risk_type, file, line, evidence),
        "source": source,
        "target": target,
        "risk_type": risk_type,
        "status": status,
        "severity": severity or "Medium",
        "file": file,
        "line": line,
        "evidence": (evidence or "")[:260],
        "related_capabilities": related_capabilities or [],
        "related_risks": related_risks or [],
        "recommended_control": recommended_control,
    })


def build_trust_boundaries(*, capability_map: dict[str, Any] | None = None, api_surface: dict[str, Any] | None = None, context_poisoning_risks: dict[str, Any] | None = None, appsec_risks: dict[str, Any] | None = None) -> dict[str, Any]:
    """Build a static trust-boundary map from the v3 security artifacts.

    This gives the report a flow-level view: where untrusted input, APIs, agent
    reasoning, memory, tools, files, databases, and external systems meet.
    """
    boundaries: list[dict[str, Any]] = []

    for endpoint in (api_surface or {}).get("endpoints", []) or []:
        tags = set(endpoint.get("tags") or [])
        if endpoint.get("auth_status") == "missing":
            _add_boundary(
                boundaries,
                source="External User",
                target=f"API {endpoint.get('method')} {endpoint.get('path')}",
                risk_type="unauthenticated_api_boundary",
                status="weak",
                severity="High" if endpoint.get("risk_level") in {"high", "critical"} else "Medium",
                file=endpoint.get("file", ""),
                line=endpoint.get("line", 1),
                evidence=endpoint.get("evidence", ""),
                related_risks=[endpoint.get("id", "")],
                recommended_control="Require authentication before external input reaches this endpoint.",
            )
        if endpoint.get("rate_limit_status") == "missing" and ("llm_call" in tags or endpoint.get("method") in {"POST", "PUT", "PATCH", "DELETE"}):
            _add_boundary(
                boundaries,
                source=f"API {endpoint.get('method')} {endpoint.get('path')}",
                target="Costly or state-changing backend action",
                risk_type="missing_abuse_throttle_boundary",
                status="partial",
                severity="Medium",
                file=endpoint.get("file", ""),
                line=endpoint.get("line", 1),
                evidence=endpoint.get("evidence", ""),
                related_risks=[endpoint.get("id", "")],
                recommended_control="Add per-user and per-IP rate limits before expensive or mutating actions.",
            )

    for cap in (capability_map or {}).get("capabilities", []) or []:
        gaps = set(cap.get("control_gaps") or [])
        if cap.get("requires_approval") and "missing_human_approval" in gaps:
            _add_boundary(
                boundaries,
                source="Agent / Application Logic",
                target=cap.get("label") or cap.get("name") or "Privileged capability",
                risk_type="privileged_action_without_approval",
                status="weak",
                severity="Critical" if cap.get("risk_level") == "critical" else "High",
                file=cap.get("file", ""),
                line=cap.get("line", 1),
                evidence=cap.get("evidence", ""),
                related_capabilities=[cap.get("id", "")],
                recommended_control="Place a human approval gate or policy decision before this capability executes.",
            )
        if cap.get("external_effect") and "missing_audit_logging" in gaps:
            _add_boundary(
                boundaries,
                source=cap.get("label") or cap.get("name") or "External-effect capability",
                target="Audit / Observability Layer",
                risk_type="external_effect_without_audit",
                status="partial",
                severity="Medium",
                file=cap.get("file", ""),
                line=cap.get("line", 1),
                evidence=cap.get("evidence", ""),
                related_capabilities=[cap.get("id", "")],
                recommended_control="Log the actor, request ID, capability, redacted inputs, approval ID, and result.",
            )
        if cap.get("data_touched") and "sensitive_data_without_visible_masking" in gaps:
            _add_boundary(
                boundaries,
                source="Sensitive Data",
                target=cap.get("label") or cap.get("name") or "Application capability",
                risk_type="sensitive_data_without_masking",
                status="weak",
                severity="High",
                file=cap.get("file", ""),
                line=cap.get("line", 1),
                evidence=cap.get("evidence", ""),
                related_capabilities=[cap.get("id", "")],
                recommended_control="Mask or minimize sensitive fields before they enter prompts, tool outputs, or user-visible responses.",
            )

    for risk in (context_poisoning_risks or {}).get("risks", []) or []:
        _add_boundary(
            boundaries,
            source="Untrusted Context / Memory",
            target="Agent Reasoning or Tool Choice",
            risk_type=risk.get("risk_type", "context_poisoning"),
            status=_severity_to_status(risk.get("severity", "Medium")),
            severity=risk.get("severity", "Medium"),
            file=risk.get("file", ""),
            line=risk.get("line", 1),
            evidence=risk.get("evidence", ""),
            related_risks=[risk.get("id", "")],
            recommended_control=risk.get("recommended_fix", "Add source-trust metadata, sanitization, and context isolation.")
        )

    for risk in (appsec_risks or {}).get("risks", []) or []:
        if risk.get("risk_type") in {"ssrf", "rce_or_command_execution", "path_traversal", "unsafe_archive_extraction", "sql_injection"}:
            _add_boundary(
                boundaries,
                source="User-Controlled Input",
                target=risk.get("sink") or risk.get("risk_type"),
                risk_type=risk.get("risk_type", "appsec_risk"),
                status=_severity_to_status(risk.get("severity", "Medium")),
                severity=risk.get("severity", "Medium"),
                file=risk.get("file", ""),
                line=risk.get("line", 1),
                evidence=risk.get("evidence", ""),
                related_risks=[risk.get("id", "")],
                recommended_control=risk.get("recommended_fix", "Add validation and isolation before the sink is reached."),
            )

    # Dedupe exact repeated boundaries while preserving first evidence.
    seen = set()
    unique = []
    for boundary in boundaries:
        key = (boundary["source"], boundary["target"], boundary["risk_type"], boundary["file"], boundary["line"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(boundary)

    status_counts = Counter(boundary["status"] for boundary in unique)
    severity_counts = Counter(boundary["severity"] for boundary in unique)
    return {
        "summary": {
            "total_boundaries": len(unique),
            "weak_boundaries": status_counts.get("weak", 0),
            "partial_boundaries": status_counts.get("partial", 0),
            "review_boundaries": status_counts.get("review", 0),
            "severity_counts": dict(sorted(severity_counts.items())),
        },
        "boundaries": unique,
        "scanner_version": "v3-trust-boundary-map-1",
        "notes": [
            "Trust boundaries are derived from static scanner artifacts and should be reviewed with the application owner.",
            "A weak boundary means A-DAP-T did not find a visible control at an important crossing point.",
        ],
    }
