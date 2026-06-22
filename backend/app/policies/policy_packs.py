from __future__ import annotations

from copy import deepcopy
from typing import Any

SCANNER_VERSION = "v3-policy-packs-1"

# Keep the policies explicit. A-DAP-T needs to explain *why* a release is blocked,
# not hide policy behavior inside vague scoring math.
POLICY_PACKS: dict[str, dict[str, Any]] = {
    "general_ai_app": {
        "policy_id": "general_ai_app",
        "label": "General AI App",
        "description": "Balanced baseline for AI-powered applications with limited external actions.",
        "minimum_safety_score": 75,
        "required_controls": [
            "authentication",
            "secrets_management",
            "input_validation",
            "audit_logging",
            "rate_limiting",
        ],
        "hard_block_controls": ["authentication", "secrets_management", "command_execution_sandboxing"],
        "hard_block_risk_types": ["rce_or_command_execution", "secret_exposure"],
        "review_controls": ["dependency_security", "prompt_injection_defense", "output_encoding"],
        "weights": {
            "critical_control_gap": 12,
            "high_risk_control_gap": 8,
            "medium_risk_control_gap": 4,
        },
    },
    "agent_with_tools": {
        "policy_id": "agent_with_tools",
        "label": "AI Agent with Tools",
        "description": "For agents that can call tools, APIs, files, databases, or external actions.",
        "minimum_safety_score": 80,
        "required_controls": [
            "authentication",
            "authorization",
            "tool_allowlist",
            "human_approval",
            "audit_logging",
            "prompt_injection_defense",
            "memory_context_isolation",
            "rate_limiting",
        ],
        "hard_block_controls": [
            "authentication",
            "authorization",
            "human_approval",
            "tool_allowlist",
            "command_execution_sandboxing",
        ],
        "hard_block_risk_types": [
            "rce_or_command_execution",
            "retrieved_context_can_influence_tool_use",
            "persistent_memory_without_sanitization",
        ],
        "review_controls": ["pii_masking", "dependency_security", "output_encoding"],
        "weights": {
            "critical_control_gap": 14,
            "high_risk_control_gap": 9,
            "medium_risk_control_gap": 5,
        },
    },
    "ai_coding_agent": {
        "policy_id": "ai_coding_agent",
        "label": "AI Coding Agent",
        "description": "Strict policy for agents that can edit repositories, run commands, or touch developer infrastructure.",
        "minimum_safety_score": 85,
        "required_controls": [
            "authentication",
            "authorization",
            "tool_allowlist",
            "human_approval",
            "audit_logging",
            "command_execution_sandboxing",
            "secrets_management",
            "dependency_security",
            "memory_context_isolation",
        ],
        "hard_block_controls": [
            "authentication",
            "authorization",
            "tool_allowlist",
            "human_approval",
            "command_execution_sandboxing",
            "secrets_management",
        ],
        "hard_block_risk_types": [
            "rce_or_command_execution",
            "unsafe_deserialization",
            "unsafe_archive_extraction",
            "path_traversal",
            "direct_source_dependency",
        ],
        "review_controls": ["rate_limiting", "input_validation", "dependency_security"],
        "weights": {
            "critical_control_gap": 16,
            "high_risk_control_gap": 10,
            "medium_risk_control_gap": 5,
        },
    },
    "customer_support_agent": {
        "policy_id": "customer_support_agent",
        "label": "Customer Support Agent",
        "description": "For support agents that may read customer context or trigger customer-facing actions.",
        "minimum_safety_score": 80,
        "required_controls": [
            "authentication",
            "authorization",
            "human_approval",
            "audit_logging",
            "pii_masking",
            "tool_allowlist",
            "prompt_injection_defense",
        ],
        "hard_block_controls": ["authentication", "authorization", "human_approval", "pii_masking"],
        "hard_block_risk_types": ["sensitive_data_without_masking", "xss", "sql_injection"],
        "review_controls": ["rate_limiting", "dependency_security", "memory_context_isolation"],
        "weights": {
            "critical_control_gap": 14,
            "high_risk_control_gap": 9,
            "medium_risk_control_gap": 5,
        },
    },
    "data_sensitive_app": {
        "policy_id": "data_sensitive_app",
        "label": "Data-Sensitive App",
        "description": "For apps handling PII, customer records, secrets, payment data, or regulated data.",
        "minimum_safety_score": 85,
        "required_controls": [
            "authentication",
            "authorization",
            "pii_masking",
            "secrets_management",
            "audit_logging",
            "input_validation",
            "memory_context_isolation",
        ],
        "hard_block_controls": ["authentication", "authorization", "pii_masking", "secrets_management"],
        "hard_block_risk_types": ["secret_exposure", "sql_injection", "path_traversal"],
        "review_controls": ["dependency_security", "output_encoding", "rate_limiting"],
        "weights": {
            "critical_control_gap": 15,
            "high_risk_control_gap": 10,
            "medium_risk_control_gap": 5,
        },
    },
    "public_saas_api": {
        "policy_id": "public_saas_api",
        "label": "Public SaaS API",
        "description": "For externally reachable web APIs where abuse, auth, CORS, and rate-limit posture matter most.",
        "minimum_safety_score": 80,
        "required_controls": [
            "authentication",
            "authorization",
            "rate_limiting",
            "cors_policy",
            "input_validation",
            "file_upload_safety",
            "audit_logging",
        ],
        "hard_block_controls": ["authentication", "authorization", "rate_limiting", "file_upload_safety"],
        "hard_block_risk_types": ["ssrf", "unsafe_file_upload", "path_traversal", "rce_or_command_execution"],
        "review_controls": ["dependency_security", "output_encoding", "secrets_management"],
        "weights": {
            "critical_control_gap": 14,
            "high_risk_control_gap": 9,
            "medium_risk_control_gap": 4,
        },
    },
}

CONTROL_TO_LABEL: dict[str, str] = {
    "authentication": "Authentication",
    "authorization": "Authorization / policy checks",
    "rate_limiting": "Rate limiting",
    "cors_policy": "CORS policy",
    "file_upload_safety": "File upload safety",
    "input_validation": "Input validation",
    "output_encoding": "Output encoding",
    "prompt_injection_defense": "Prompt injection defense",
    "tool_allowlist": "Tool allowlist / scoped permissions",
    "human_approval": "Human approval",
    "audit_logging": "Audit logging",
    "secrets_management": "Secrets management",
    "dependency_security": "Dependency security",
    "memory_context_isolation": "Memory/context isolation",
    "pii_masking": "PII masking",
    "command_execution_sandboxing": "Command execution sandboxing",
}


def list_policy_packs() -> list[dict[str, Any]]:
    return [
        {
            "policy_id": policy["policy_id"],
            "label": policy["label"],
            "description": policy["description"],
            "minimum_safety_score": policy["minimum_safety_score"],
            "required_controls": list(policy["required_controls"]),
        }
        for policy in POLICY_PACKS.values()
    ]


def get_policy_pack(policy_id: str | None = None) -> dict[str, Any]:
    selected = (policy_id or "general_ai_app").strip().lower()
    policy = POLICY_PACKS.get(selected) or POLICY_PACKS["general_ai_app"]
    return deepcopy(policy)


def _safe_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _safe_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _severity_rank(value: Any) -> int:
    return {"critical": 4, "high": 3, "medium": 2, "low": 1, "info": 0}.get(str(value or "").lower(), 0)


def _control_map(guardrail_matrix: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        str(control.get("control_id") or ""): control
        for control in _safe_list(guardrail_matrix.get("controls"))
        if control.get("control_id")
    }


def _risk_type_counts(report: dict[str, Any], artifact_name: str) -> dict[str, int]:
    artifact = _safe_dict(report.get(artifact_name))
    counts: dict[str, int] = {}
    for risk in _safe_list(artifact.get("risks")):
        risk_type = str(risk.get("risk_type") or "unknown")
        counts[risk_type] = counts.get(risk_type, 0) + 1
    return counts


def _find_matching_risk_types(report: dict[str, Any], policy: dict[str, Any]) -> list[str]:
    target_types = set(policy.get("hard_block_risk_types") or [])
    if not target_types:
        return []

    counts: dict[str, int] = {}
    for artifact_name in ("appsec_risks", "context_poisoning_risks", "dependency_risks"):
        for risk_type, count in _risk_type_counts(report, artifact_name).items():
            if risk_type in target_types:
                counts[risk_type] = counts.get(risk_type, 0) + count

    # Also bridge older v2-style finding categories into v3 policy language.
    for finding in _safe_list(report.get("findings")):
        category = str(finding.get("category") or "").lower()
        if "secret exposure" in category and "secret_exposure" in target_types:
            counts["secret_exposure"] = counts.get("secret_exposure", 0) + 1

    return [f"{risk_type} ({count})" for risk_type, count in sorted(counts.items())]


def evaluate_policy_pack(report: dict[str, Any], policy_id: str | None = None) -> dict[str, Any]:
    policy = get_policy_pack(policy_id or report.get("policy_id"))
    controls = _control_map(_safe_dict(report.get("guardrail_matrix")))
    safety_score = int(report.get("safety_score") or 0)
    minimum = int(policy.get("minimum_safety_score") or 75)

    passed_controls: list[str] = []
    review_controls: list[str] = []
    missing_required_controls: list[dict[str, Any]] = []
    hard_blockers: list[dict[str, Any]] = []

    for control_id in policy.get("required_controls") or []:
        control = controls.get(control_id, {})
        status = str(control.get("status") or "unknown")
        risk_instances = int(control.get("risk_instances") or 0)
        risk_level = str(control.get("risk_level") or "info")
        label = CONTROL_TO_LABEL.get(control_id, control_id.replace("_", " ").title())
        entry = {
            "control_id": control_id,
            "label": label,
            "status": status,
            "coverage_percent": control.get("coverage_percent"),
            "risk_instances": risk_instances,
            "risk_level": risk_level,
            "recommended_action": control.get("recommended_action") or "Add visible control evidence and re-scan.",
        }
        if status in {"strong", "not_applicable"} or (status == "partial" and risk_instances == 0):
            passed_controls.append(control_id)
        elif control_id in set(policy.get("hard_block_controls") or []) and risk_instances > 0:
            hard_blockers.append({**entry, "reason": "Required hard-block control has visible risk instances."})
        elif status in {"weak", "missing", "unknown"}:
            missing_required_controls.append(entry)
        else:
            review_controls.append(control_id)

    matching_risk_types = _find_matching_risk_types(report, policy)
    for risk_label in matching_risk_types:
        hard_blockers.append({
            "control_id": "risk_type_blocker",
            "label": "Policy risk-type blocker",
            "status": "weak",
            "coverage_percent": None,
            "risk_instances": 1,
            "risk_level": "high",
            "recommended_action": "Fix or explicitly remove the policy-blocking risk path before release.",
            "reason": f"Policy blocks this risk type: {risk_label}.",
        })

    score_passed = safety_score >= minimum
    # Use the guardrail matrix as the main v3 policy signal. We still include the legacy score because users expect it.
    if hard_blockers or not score_passed:
        decision = "BLOCK"
    elif missing_required_controls or review_controls:
        decision = "REVIEW"
    else:
        decision = "ALLOW"

    required = len(policy.get("required_controls") or [])
    passed = len(passed_controls)
    blocker_count = len(hard_blockers) + (0 if score_passed else 1)
    review_count = len(missing_required_controls) + len(review_controls)
    weights = policy.get("weights") or {}
    penalty = 0
    for blocker in hard_blockers:
        level = blocker.get("risk_level")
        if level == "critical":
            penalty += int(weights.get("critical_control_gap", 12))
        elif level == "high":
            penalty += int(weights.get("high_risk_control_gap", 8))
        else:
            penalty += int(weights.get("medium_risk_control_gap", 4))
    if not score_passed:
        penalty += max(5, min(25, minimum - safety_score))
    v3_gate_score = max(0, min(100, safety_score - penalty))

    if decision == "BLOCK":
        summary = "Release is blocked under the selected v3 policy. Fix hard blockers and re-scan."
    elif decision == "REVIEW":
        summary = "Release needs manual review under the selected v3 policy. Required controls are not fully covered."
    else:
        summary = "Release is allowed under the selected v3 policy based on visible static evidence."

    return {
        "selected_policy": policy,
        "available_policies": list_policy_packs(),
        "decision": decision,
        "summary": summary,
        "minimum_safety_score": minimum,
        "safety_score": safety_score,
        "score_passed": score_passed,
        "v3_gate_score": v3_gate_score,
        "required_controls_total": required,
        "required_controls_passed": passed,
        "required_controls_missing": max(required - passed, 0),
        "passed_controls": passed_controls,
        "review_controls": review_controls,
        "missing_required_controls": missing_required_controls,
        "hard_blockers": hard_blockers,
        "blocker_count": blocker_count,
        "review_count": review_count,
        "scanner_version": SCANNER_VERSION,
        "notes": [
            "v3 policy evaluation uses static evidence from guardrail_matrix and related scan artifacts.",
            "It does not prove runtime safety and should be used as a release-review signal.",
        ],
    }
