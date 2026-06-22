from __future__ import annotations

from collections import Counter
from typing import Any

CONTROL_VERSION = "v3-guardrail-matrix-1"


def _safe_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _safe_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _risk_level_from_status(status: str) -> str:
    if status in {"missing", "weak"}:
        return "high"
    if status == "partial":
        return "medium"
    if status in {"good", "strong"}:
        return "low"
    return "info"


def _status_from_coverage(coverage: int | None, *, relevant: int, risky: int = 0) -> str:
    if relevant <= 0:
        return "not_applicable"
    if coverage is None:
        return "unknown"
    if risky > 0 and coverage < 50:
        return "weak"
    if coverage >= 85:
        return "strong"
    if coverage >= 55:
        return "partial"
    return "weak"


def _pct(protected: int, relevant: int) -> int | None:
    if relevant <= 0:
        return None
    return max(0, min(100, round((protected / relevant) * 100)))


def _first_evidence(items: list[dict[str, Any]], *, limit: int = 3) -> list[dict[str, Any]]:
    evidence: list[dict[str, Any]] = []
    seen: set[tuple[str, int, str]] = set()
    for item in items:
        file = str(item.get("file") or "")
        try:
            line = int(item.get("line") or 1)
        except (TypeError, ValueError):
            line = 1
        snippet = str(item.get("evidence") or item.get("title") or item.get("label") or item.get("path") or "")[:220]
        if not file and not snippet:
            continue
        key = (file, line, snippet)
        if key in seen:
            continue
        seen.add(key)
        evidence.append({"file": file, "line": line, "evidence": snippet})
        if len(evidence) >= limit:
            break
    return evidence


def _control(
    *,
    control_id: str,
    label: str,
    category: str,
    relevant_instances: int,
    protected_instances: int,
    risk_instances: int,
    evidence: list[dict[str, Any]],
    recommended_action: str,
    related_artifacts: list[str] | None = None,
    notes: list[str] | None = None,
) -> dict[str, Any]:
    relevant_instances = max(0, int(relevant_instances or 0))
    protected_instances = max(0, min(int(protected_instances or 0), relevant_instances)) if relevant_instances else 0
    risk_instances = max(0, int(risk_instances or 0))
    coverage = _pct(protected_instances, relevant_instances)
    status = _status_from_coverage(coverage, relevant=relevant_instances, risky=risk_instances)
    return {
        "control_id": control_id,
        "label": label,
        "category": category,
        "status": status,
        "coverage_percent": coverage,
        "relevant_instances": relevant_instances,
        "protected_instances": protected_instances,
        "risk_instances": risk_instances,
        "risk_level": _risk_level_from_status(status),
        "evidence": evidence,
        "recommended_action": recommended_action,
        "related_artifacts": [artifact for artifact in (related_artifacts or []) if artifact][:12],
        "notes": notes or [],
    }


def _findings_by_category(findings: list[dict[str, Any]]) -> Counter[str]:
    return Counter(str(finding.get("category") or "") for finding in findings)


def _capabilities_with(capabilities: list[dict[str, Any]], gap: str | None = None) -> list[dict[str, Any]]:
    matched = []
    for cap in capabilities:
        gaps = set(cap.get("control_gaps") or [])
        if gap and gap not in gaps:
            continue
        matched.append(cap)
    return matched


def _capabilities_requiring_approval(capabilities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [cap for cap in capabilities if bool(cap.get("requires_approval"))]


def _mutation_or_sensitive_endpoints(endpoints: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sensitive_words = ("admin", "delete", "refund", "payment", "upload", "assistant", "scan", "report", "token")
    selected = []
    for endpoint in endpoints:
        method = str(endpoint.get("method") or "").upper()
        path = str(endpoint.get("path") or "").lower()
        tags = set(endpoint.get("tags") or [])
        if method in {"POST", "PUT", "PATCH", "DELETE"} or tags.intersection({"mutation", "sensitive_action", "llm_call"}) or any(word in path for word in sensitive_words):
            selected.append(endpoint)
    return selected


def _upload_endpoints(endpoints: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [endpoint for endpoint in endpoints if "upload" in str(endpoint.get("path") or "").lower() or "upload" in set(endpoint.get("tags") or [])]


def _dependency_total(dependency_risks: dict[str, Any]) -> int:
    summary = _safe_dict(dependency_risks.get("summary"))
    return int(summary.get("total_dependencies") or len(_safe_list(dependency_risks.get("dependencies"))))


def build_guardrail_matrix(
    *,
    findings: list[dict[str, Any]] | None = None,
    dependency_risks: dict[str, Any] | None = None,
    api_surface: dict[str, Any] | None = None,
    context_poisoning_risks: dict[str, Any] | None = None,
    appsec_risks: dict[str, Any] | None = None,
    capability_map: dict[str, Any] | None = None,
    trust_boundaries: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build the v3 guardrail matrix from deterministic scan artifacts.

    This is deliberately not a runtime guarantee. It counts visible controls and gaps
    in the scanned source so the report can show where the project has coverage and
    where a human should review missing guardrails.
    """
    findings = _safe_list(findings)
    dependency_risks = _safe_dict(dependency_risks)
    api_surface = _safe_dict(api_surface)
    context_poisoning_risks = _safe_dict(context_poisoning_risks)
    appsec_risks = _safe_dict(appsec_risks)
    capability_map = _safe_dict(capability_map)
    trust_boundaries = _safe_dict(trust_boundaries)

    endpoints = _safe_list(api_surface.get("endpoints"))
    api_risks = _safe_list(api_surface.get("risks"))
    dependency_risk_items = _safe_list(dependency_risks.get("risks"))
    context_risk_items = _safe_list(context_poisoning_risks.get("risks"))
    appsec_risk_items = _safe_list(appsec_risks.get("risks"))
    capabilities = _safe_list(capability_map.get("capabilities"))
    boundaries = _safe_list(trust_boundaries.get("boundaries"))

    finding_categories = _findings_by_category(findings)
    controls: list[dict[str, Any]] = []

    mutation_endpoints = _mutation_or_sensitive_endpoints(endpoints)
    auth_missing = [ep for ep in endpoints if ep.get("auth_status") == "missing"]
    controls.append(_control(
        control_id="authentication",
        label="Authentication on externally reachable endpoints",
        category="api_security",
        relevant_instances=len(endpoints),
        protected_instances=len([ep for ep in endpoints if ep.get("auth_status") in {"present", "detected"}]),
        risk_instances=len(auth_missing),
        evidence=_first_evidence(auth_missing or endpoints),
        recommended_action="Require authentication before external users can reach scan, report, assistant, upload, or state-changing endpoints.",
        related_artifacts=[risk.get("id", "") for risk in api_risks if risk.get("risk_type") == "missing_auth"],
    ))

    approval_caps = _capabilities_requiring_approval(capabilities)
    policy_or_approval_visible = [cap for cap in approval_caps if cap.get("approval_found") or cap.get("allowlist_found")]
    authz_gaps = [cap for cap in approval_caps if "missing_human_approval" in set(cap.get("control_gaps") or []) and not cap.get("allowlist_found")]
    controls.append(_control(
        control_id="authorization",
        label="Authorization and policy checks before privileged actions",
        category="access_control",
        relevant_instances=len(approval_caps) or len(mutation_endpoints),
        protected_instances=len(policy_or_approval_visible),
        risk_instances=len(authz_gaps),
        evidence=_first_evidence(authz_gaps or approval_caps or mutation_endpoints),
        recommended_action="Add explicit policy, role, or approval checks around write, delete, admin, payment, file, and tool-execution actions.",
        related_artifacts=[cap.get("id", "") for cap in authz_gaps],
    ))

    rate_relevant = [ep for ep in endpoints if str(ep.get("method") or "").upper() in {"POST", "PUT", "PATCH", "DELETE"} or "llm_call" in set(ep.get("tags") or [])]
    rate_missing = [ep for ep in rate_relevant if ep.get("rate_limit_status") == "missing"]
    controls.append(_control(
        control_id="rate_limiting",
        label="Rate limiting on costly or mutating endpoints",
        category="api_security",
        relevant_instances=len(rate_relevant),
        protected_instances=len([ep for ep in rate_relevant if ep.get("rate_limit_status") in {"present", "detected"}]),
        risk_instances=len(rate_missing),
        evidence=_first_evidence(rate_missing or rate_relevant),
        recommended_action="Add per-user and per-IP throttles around LLM calls, scans, uploads, auth-sensitive routes, and mutations.",
        related_artifacts=[risk.get("id", "") for risk in api_risks if risk.get("risk_type") == "missing_rate_limit"],
    ))

    cors_weak = [ep for ep in endpoints if ep.get("cors_status") == "weak"]
    controls.append(_control(
        control_id="cors_policy",
        label="CORS origin restrictions",
        category="api_security",
        relevant_instances=len(endpoints),
        protected_instances=max(len(endpoints) - len(cors_weak), 0),
        risk_instances=len(cors_weak),
        evidence=_first_evidence(cors_weak),
        recommended_action="Avoid wildcard origins on authenticated APIs; define explicit trusted frontend origins per environment.",
        related_artifacts=[risk.get("id", "") for risk in api_risks if risk.get("risk_type") == "weak_cors"],
    ))

    upload_eps = _upload_endpoints(endpoints)
    upload_risks = [risk for risk in api_risks if risk.get("risk_type") == "unsafe_file_upload"] + [risk for risk in appsec_risk_items if risk.get("risk_type") in {"unsafe_archive_extraction", "path_traversal"}]
    controls.append(_control(
        control_id="file_upload_safety",
        label="File upload and archive safety",
        category="input_handling",
        relevant_instances=len(upload_eps) + len(upload_risks),
        protected_instances=max(len(upload_eps) - len(upload_risks), 0),
        risk_instances=len(upload_risks),
        evidence=_first_evidence(upload_risks or upload_eps),
        recommended_action="Enforce file size/type limits, safe extraction, path normalization, depth limits, and cleanup for uploads and archives.",
        related_artifacts=[risk.get("id", "") for risk in upload_risks],
    ))

    injection_risks = [risk for risk in appsec_risk_items if risk.get("risk_type") in {"sql_injection", "path_traversal", "ssrf", "rce_or_command_execution"}]
    controls.append(_control(
        control_id="input_validation",
        label="Input validation before dangerous sinks",
        category="input_handling",
        relevant_instances=len(injection_risks) + len(mutation_endpoints),
        protected_instances=max(len(mutation_endpoints) - len(injection_risks), 0),
        risk_instances=len(injection_risks),
        evidence=_first_evidence(injection_risks or mutation_endpoints),
        recommended_action="Validate and normalize user-controlled paths, URLs, commands, SQL parameters, and request bodies before using them in sinks.",
        related_artifacts=[risk.get("id", "") for risk in injection_risks],
    ))

    xss_risks = [risk for risk in appsec_risk_items if risk.get("risk_type") == "xss"]
    controls.append(_control(
        control_id="output_encoding",
        label="Output encoding and unsafe HTML controls",
        category="output_handling",
        relevant_instances=len(xss_risks),
        protected_instances=0,
        risk_instances=len(xss_risks),
        evidence=_first_evidence(xss_risks),
        recommended_action="Avoid raw HTML rendering; sanitize with a trusted library and encode user-controlled output by default.",
        related_artifacts=[risk.get("id", "") for risk in xss_risks],
    ))

    prompt_items = [finding for finding in findings if finding.get("category") == "Prompt Injection Risk"] + context_risk_items
    prompt_relevant = len(prompt_items)
    controls.append(_control(
        control_id="prompt_injection_defense",
        label="Prompt injection and instruction-boundary controls",
        category="ai_security",
        relevant_instances=prompt_relevant,
        protected_instances=0,
        risk_instances=prompt_relevant,
        evidence=_first_evidence(prompt_items),
        recommended_action="Separate system instructions from untrusted text, constrain tools, add prompt-injection tests, and treat retrieved/user content as data rather than instructions.",
        related_artifacts=[item.get("id", "") for item in prompt_items],
    ))

    tool_caps = [cap for cap in capabilities if cap.get("capability_type") in {"external_action", "code_execution", "file_operation", "write_action", "api_endpoint"}]
    allowlist_missing = _capabilities_with(capabilities, gap="missing_allowlist_or_scope")
    controls.append(_control(
        control_id="tool_allowlist",
        label="Tool allowlist and scope restriction",
        category="agent_controls",
        relevant_instances=len(tool_caps),
        protected_instances=len([cap for cap in tool_caps if cap.get("allowlist_found")]),
        risk_instances=len(allowlist_missing),
        evidence=_first_evidence(allowlist_missing or tool_caps),
        recommended_action="Define allowed tools/actions per policy and block unknown, shell, filesystem, network, or write tools unless explicitly approved.",
        related_artifacts=[cap.get("id", "") for cap in allowlist_missing],
    ))

    approval_missing = _capabilities_with(capabilities, gap="missing_human_approval")
    controls.append(_control(
        control_id="human_approval",
        label="Human approval for privileged or external-effect actions",
        category="agent_controls",
        relevant_instances=len(approval_caps),
        protected_instances=len([cap for cap in approval_caps if cap.get("approval_found")]),
        risk_instances=len(approval_missing),
        evidence=_first_evidence(approval_missing or approval_caps),
        recommended_action="Require approval IDs, reviewer identity, and explicit confirmation before write, refund, email, delete, shell, or external API actions.",
        related_artifacts=[cap.get("id", "") for cap in approval_missing],
    ))

    external_caps = [cap for cap in capabilities if cap.get("external_effect")]
    audit_missing = _capabilities_with(capabilities, gap="missing_audit_logging")
    audit_findings = [f for f in findings if f.get("category") == "Auditability Risk"]
    controls.append(_control(
        control_id="audit_logging",
        label="Audit logging for security-relevant actions",
        category="observability",
        relevant_instances=len(external_caps) + len(audit_findings),
        protected_instances=len([cap for cap in external_caps if cap.get("audit_logging_found")]),
        risk_instances=len(audit_missing) + len(audit_findings),
        evidence=_first_evidence(audit_missing + audit_findings),
        recommended_action="Log actor, request ID, capability/tool/action, redacted inputs, approval ID, outcome, and timestamp for privileged actions.",
        related_artifacts=[cap.get("id", "") for cap in audit_missing] + [finding.get("id", "") for finding in audit_findings],
    ))

    secret_findings = [finding for finding in findings if finding.get("category") == "Secret Exposure Risk"]
    controls.append(_control(
        control_id="secrets_management",
        label="Secrets management",
        category="secrets",
        relevant_instances=len(secret_findings),
        protected_instances=0,
        risk_instances=len(secret_findings),
        evidence=_first_evidence(secret_findings),
        recommended_action="Move secrets to environment variables or a managed secret store, rotate exposed values, and prevent secrets from entering prompts/logs.",
        related_artifacts=[finding.get("id", "") for finding in secret_findings],
    ))

    total_dependencies = _dependency_total(dependency_risks)
    dep_risky = len(dependency_risk_items)
    controls.append(_control(
        control_id="dependency_security",
        label="Dependency security and version hygiene",
        category="supply_chain",
        relevant_instances=total_dependencies,
        protected_instances=max(total_dependencies - dep_risky, 0) if total_dependencies else 0,
        risk_instances=dep_risky,
        evidence=_first_evidence(dependency_risk_items),
        recommended_action="Pin dependency versions, commit lockfiles, avoid direct git/URL installs unless reviewed, and run vulnerability lookups before release.",
        related_artifacts=[risk.get("id", "") for risk in dependency_risk_items],
        notes=["OSV/CVE lookup is planned after the local dependency hygiene layer is stable."] if total_dependencies else [],
    ))

    memory_caps = [cap for cap in capabilities if cap.get("capability_type") in {"memory_operation", "context_to_tool_flow"}]
    controls.append(_control(
        control_id="memory_context_isolation",
        label="Memory and retrieved-context isolation",
        category="ai_security",
        relevant_instances=len(context_risk_items) + len(memory_caps),
        protected_instances=max(len(memory_caps) - len(context_risk_items), 0),
        risk_instances=len(context_risk_items),
        evidence=_first_evidence(context_risk_items or memory_caps),
        recommended_action="Track source trust metadata, sanitize stored memory, isolate user-controlled context, and prevent retrieved content from directly driving privileged tool calls.",
        related_artifacts=[risk.get("id", "") for risk in context_risk_items],
    ))

    pii_caps = _capabilities_with(capabilities, gap="sensitive_data_without_visible_masking")
    data_findings = [f for f in findings if f.get("category") == "Data Exposure Risk"]
    data_caps = [cap for cap in capabilities if cap.get("data_touched")]
    controls.append(_control(
        control_id="pii_masking",
        label="Sensitive data minimization and masking",
        category="data_protection",
        relevant_instances=len(data_caps) + len(data_findings),
        protected_instances=len([cap for cap in data_caps if "sensitive_data_without_visible_masking" not in set(cap.get("control_gaps") or [])]),
        risk_instances=len(pii_caps) + len(data_findings),
        evidence=_first_evidence(pii_caps + data_findings),
        recommended_action="Mask or minimize customer, user, token, payment, and credential fields before they enter prompts, logs, tool outputs, or user-visible responses.",
        related_artifacts=[cap.get("id", "") for cap in pii_caps] + [finding.get("id", "") for finding in data_findings],
    ))

    command_items = [risk for risk in appsec_risk_items if risk.get("risk_type") == "rce_or_command_execution"] + [cap for cap in capabilities if cap.get("capability_type") == "code_execution"]
    sandboxed = [item for item in command_items if "sandbox" in str(item.get("evidence", "")).lower() or "allowlist" in str(item.get("evidence", "")).lower()]
    controls.append(_control(
        control_id="command_execution_sandboxing",
        label="Command execution sandboxing",
        category="execution_safety",
        relevant_instances=len(command_items),
        protected_instances=len(sandboxed),
        risk_instances=max(len(command_items) - len(sandboxed), 0),
        evidence=_first_evidence(command_items),
        recommended_action="Avoid dynamic command/code execution. If unavoidable, use a sandbox, deny shell=True, enforce command allowlists, timeouts, and audit logs.",
        related_artifacts=[item.get("id", "") for item in command_items],
    ))

    weak_boundaries = [b for b in boundaries if b.get("status") == "weak"]
    status_counts = Counter(control["status"] for control in controls)
    category_counts = Counter(control["category"] for control in controls)
    risky_controls = [control for control in controls if control["risk_instances"] > 0 and control["status"] in {"weak", "partial", "unknown"}]
    critical_control_ids = {"authentication", "authorization", "human_approval", "tool_allowlist", "memory_context_isolation", "command_execution_sandboxing"}
    critical_gaps = [control for control in controls if control["control_id"] in critical_control_ids and control["risk_instances"] > 0]

    return {
        "summary": {
            "total_controls": len(controls),
            "strong_controls": status_counts.get("strong", 0),
            "partial_controls": status_counts.get("partial", 0),
            "weak_controls": status_counts.get("weak", 0),
            "not_applicable_controls": status_counts.get("not_applicable", 0),
            "risky_controls": len(risky_controls),
            "critical_control_gaps": len(critical_gaps),
            "weak_trust_boundaries": len(weak_boundaries),
            "categories": dict(sorted(category_counts.items())),
        },
        "controls": controls,
        "scanner_version": CONTROL_VERSION,
        "notes": [
            "Coverage is based on static evidence found in the scanned project, not runtime proof.",
            "A weak control means A-DAP-T found relevant risk instances without nearby visible guardrails.",
            "Controls with no relevant instances are marked not_applicable instead of penalizing the project.",
        ],
    }
