from __future__ import annotations

import hashlib
from typing import Any

SCANNER_VERSION = "v3-remedy-plan-1"

CONTROL_PRIORITY = {
    "authentication": 95,
    "authorization": 92,
    "command_execution_sandboxing": 90,
    "secrets_management": 88,
    "human_approval": 86,
    "tool_allowlist": 84,
    "pii_masking": 80,
    "memory_context_isolation": 78,
    "rate_limiting": 72,
    "input_validation": 70,
    "file_upload_safety": 68,
    "dependency_security": 60,
    "audit_logging": 58,
    "prompt_injection_defense": 56,
    "cors_policy": 50,
    "output_encoding": 48,
}

CONTROL_TITLES = {
    "authentication": "Lock down unauthenticated endpoints",
    "authorization": "Add authorization checks before privileged actions",
    "command_execution_sandboxing": "Sandbox or remove command/code execution paths",
    "secrets_management": "Move secrets into managed configuration and rotate exposed values",
    "human_approval": "Add human approval gates for high-impact actions",
    "tool_allowlist": "Restrict tools and external actions with allowlists",
    "pii_masking": "Mask sensitive data before prompts, logs, and responses",
    "memory_context_isolation": "Isolate and validate persistent memory or retrieved context",
    "rate_limiting": "Add abuse throttles to costly or mutating endpoints",
    "input_validation": "Validate user-controlled input before dangerous sinks",
    "file_upload_safety": "Constrain upload and archive handling paths",
    "dependency_security": "Pin and review risky dependencies",
    "audit_logging": "Add audit logs for sensitive actions and tool calls",
    "prompt_injection_defense": "Add prompt-injection and instruction-boundary controls",
    "cors_policy": "Restrict CORS origins for browser-facing APIs",
    "output_encoding": "Encode or sanitize user-controlled output",
}


def _safe_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _safe_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _stable_id(prefix: str, *parts: object) -> str:
    raw = "::".join(str(part) for part in parts)
    digest = hashlib.sha1(raw.encode("utf-8", errors="ignore")).hexdigest()[:10]
    return f"{prefix}_{digest}"


def _effort(control_id: str, risk_instances: int) -> str:
    if control_id in {"command_execution_sandboxing", "authorization", "memory_context_isolation"}:
        return "high" if risk_instances > 2 else "medium"
    if control_id in {"dependency_security", "cors_policy", "rate_limiting"}:
        return "low" if risk_instances <= 2 else "medium"
    return "medium" if risk_instances > 1 else "low"


def _impact(control_id: str, policy_eval: dict[str, Any]) -> str:
    blocker_ids = {item.get("control_id") for item in _safe_list(policy_eval.get("hard_blockers"))}
    missing_ids = {item.get("control_id") for item in _safe_list(policy_eval.get("missing_required_controls"))}
    if control_id in blocker_ids:
        return "Can remove a hard policy blocker and may move the release from BLOCK to REVIEW."
    if control_id in missing_ids:
        return "Improves required policy coverage and may reduce manual review pressure."
    return "Improves security posture and should reduce residual review risk."


def _validation_steps(control_id: str) -> list[str]:
    base = ["Apply the fix in code.", "Run the affected unit/integration tests.", "Re-run A-DAP-T and compare the new report."]
    extra = {
        "authentication": ["Confirm protected endpoints now show authentication evidence."],
        "authorization": ["Confirm privileged actions have explicit policy or role checks."],
        "human_approval": ["Confirm write/external actions fail closed without approval metadata."],
        "tool_allowlist": ["Confirm only expected tools/actions are reachable from agent logic."],
        "rate_limiting": ["Confirm costly or mutating endpoints show rate-limit evidence."],
        "dependency_security": ["Confirm dependency risks decrease and lockfiles are present."],
        "memory_context_isolation": ["Confirm retrieved or stored context has source/sanitization controls."],
        "command_execution_sandboxing": ["Confirm command execution is removed, sandboxed, or allowlisted."],
    }.get(control_id, [])
    return base + extra


def _evidence_from_control(control: dict[str, Any]) -> list[dict[str, Any]]:
    evidence = []
    for item in _safe_list(control.get("evidence"))[:3]:
        evidence.append({
            "file": item.get("file") or "",
            "line": item.get("line") or 1,
            "evidence": str(item.get("evidence") or "")[:220],
        })
    return evidence


def _control_steps(guardrail_matrix: dict[str, Any], policy_eval: dict[str, Any]) -> list[dict[str, Any]]:
    controls = _safe_list(guardrail_matrix.get("controls"))
    policy_blockers = {item.get("control_id") for item in _safe_list(policy_eval.get("hard_blockers"))}
    policy_missing = {item.get("control_id") for item in _safe_list(policy_eval.get("missing_required_controls"))}
    steps: list[dict[str, Any]] = []

    for control in controls:
        control_id = str(control.get("control_id") or "")
        status = str(control.get("status") or "unknown")
        risk_instances = int(control.get("risk_instances") or 0)
        if status in {"strong", "not_applicable"} or risk_instances <= 0:
            continue

        base_priority = CONTROL_PRIORITY.get(control_id, 40)
        if control_id in policy_blockers:
            base_priority += 20
        elif control_id in policy_missing:
            base_priority += 10
        if status == "weak":
            base_priority += 6
        base_priority += min(risk_instances * 2, 10)

        steps.append({
            "id": _stable_id("remedy", "control", control_id, risk_instances, status),
            "source": "guardrail_matrix",
            "priority_score": min(base_priority, 120),
            "title": CONTROL_TITLES.get(control_id, f"Improve {control_id.replace('_', ' ')}"),
            "severity": "Critical" if control_id in policy_blockers else ("High" if str(control.get("risk_level")) == "high" else "Medium"),
            "control_id": control_id,
            "affected_capabilities": [],
            "related_artifacts": list(control.get("related_artifacts") or [])[:12],
            "risk_instances": risk_instances,
            "recommended_fix": control.get("recommended_action") or "Add visible control evidence and re-scan.",
            "why_it_matters": f"{control.get('label') or control_id} is {status} across {risk_instances} visible risk instance(s).",
            "estimated_effort": _effort(control_id, risk_instances),
            "expected_gate_impact": _impact(control_id, policy_eval),
            "validation_steps": _validation_steps(control_id),
            "evidence": _evidence_from_control(control),
            "manual_review_required": True,
        })
    return steps


def _capability_steps(capability_map: dict[str, Any], policy_eval: dict[str, Any]) -> list[dict[str, Any]]:
    caps = _safe_list(capability_map.get("capabilities"))
    steps: list[dict[str, Any]] = []
    for cap in caps:
        gaps = set(cap.get("control_gaps") or [])
        if not gaps:
            continue
        risk = str(cap.get("risk_level") or "low").lower()
        if risk not in {"critical", "high"}:
            continue
        title = f"Reduce risk around {cap.get('label') or cap.get('name') or 'privileged capability'}"
        fixes = []
        if "missing_human_approval" in gaps:
            fixes.append("require approval metadata before execution")
        if "missing_audit_logging" in gaps:
            fixes.append("log the action with actor, request ID, redacted inputs, and result")
        if "missing_allowlist_or_scope" in gaps:
            fixes.append("restrict the capability through an allowlist or scoped policy")
        if "sensitive_data_without_visible_masking" in gaps:
            fixes.append("mask or redact sensitive fields before prompts, logs, and responses")
        steps.append({
            "id": _stable_id("remedy", "capability", cap.get("id"), ",".join(sorted(gaps))),
            "source": "capability_map",
            "priority_score": 82 if risk == "critical" else 72,
            "title": title,
            "severity": "Critical" if risk == "critical" else "High",
            "control_id": "capability_control_gaps",
            "affected_capabilities": [cap.get("id") or cap.get("name") or "unknown"],
            "related_artifacts": [cap.get("id") or ""],
            "risk_instances": len(gaps),
            "recommended_fix": "Add the missing capability controls: " + "; ".join(fixes) + ".",
            "why_it_matters": "This capability appears able to perform a high-impact action without all expected release controls.",
            "estimated_effort": "medium",
            "expected_gate_impact": "Reduces capability-level risk and improves guardrail coverage for policy evaluation.",
            "validation_steps": [
                "Add the missing controls near the capability implementation.",
                "Re-run A-DAP-T and confirm the capability control gaps are removed.",
                "Verify the related guardrail matrix rows improve.",
            ],
            "evidence": [{"file": cap.get("file") or "", "line": cap.get("line") or 1, "evidence": str(cap.get("evidence") or "")[:220]}],
            "manual_review_required": True,
        })
    return steps


def _dedupe_steps(steps: list[dict[str, Any]]) -> list[dict[str, Any]]:
    deduped = []
    seen: set[tuple[str, str]] = set()
    for step in sorted(steps, key=lambda item: (-int(item.get("priority_score") or 0), str(item.get("title") or ""))):
        key = (str(step.get("control_id") or ""), str(step.get("title") or ""))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(step)
    for idx, step in enumerate(deduped, start=1):
        step["priority"] = idx
    return deduped


def build_remedy_plan(report: dict[str, Any], policy_evaluation: dict[str, Any] | None = None) -> dict[str, Any]:
    policy_eval = _safe_dict(policy_evaluation or report.get("policy_evaluation"))
    guardrail_matrix = _safe_dict(report.get("guardrail_matrix"))
    capability_map = _safe_dict(report.get("capability_map"))

    steps = _dedupe_steps(
        _control_steps(guardrail_matrix, policy_eval)
        + _capability_steps(capability_map, policy_eval)
    )

    by_severity: dict[str, int] = {}
    for step in steps:
        severity = str(step.get("severity") or "Medium")
        by_severity[severity] = by_severity.get(severity, 0) + 1

    if not steps:
        summary = "No priority remedy actions were generated from the current v3 policy and guardrail evidence."
        release_path = ["Keep current release checks in place.", "Re-scan after any security-sensitive code changes."]
    else:
        summary = f"Generated {len(steps)} prioritized remedy action(s), starting with {steps[0].get('title')}."
        release_path = [
            "Fix hard blockers first.",
            "Re-scan the project after each high-impact control change.",
            "Use Release Diff to confirm blocker and coverage movement.",
            "Only move to deployment review after policy_evaluation no longer returns BLOCK.",
        ]

    return {
        "summary": {
            "total_steps": len(steps),
            "critical_steps": by_severity.get("Critical", 0),
            "high_steps": by_severity.get("High", 0),
            "medium_steps": by_severity.get("Medium", 0),
            "policy_decision": policy_eval.get("decision") or "unknown",
            "top_priority": steps[0].get("title") if steps else "",
        },
        "steps": steps[:20],
        "release_path": release_path,
        "summary_text": summary,
        "scanner_version": SCANNER_VERSION,
        "notes": [
            "Remedy priority is deterministic: policy blockers first, then high-risk controls and capabilities.",
            "Patch previews may still help with code examples, but this plan is the main release-fix sequence.",
        ],
    }
