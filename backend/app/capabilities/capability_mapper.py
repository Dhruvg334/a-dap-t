from __future__ import annotations

import hashlib
import os
import re
from collections import Counter
from typing import Any

CODE_EXTENSIONS = {".py", ".js", ".jsx", ".ts", ".tsx"}

PY_FUNC_RE = re.compile(r"(?:async\s+)?def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)", re.IGNORECASE)
JS_FUNC_RE = re.compile(r"(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)", re.IGNORECASE)
JS_ARROW_RE = re.compile(
    r"(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>",
    re.IGNORECASE,
)
PY_CLASS_METHOD_RE = re.compile(r"(?:async\s+)?def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(", re.IGNORECASE)

READ_KEYWORDS = {
    "get", "read", "fetch", "search", "retrieve", "lookup", "list", "query", "find", "load"
}
WRITE_KEYWORDS = {
    "update", "create", "delete", "remove", "write", "save", "set", "insert", "modify", "patch", "upload", "import"
}
EXTERNAL_KEYWORDS = {
    "email", "slack", "webhook", "http", "fetch_url", "api", "payment", "refund", "transfer", "stripe", "send"
}
CODE_EXEC_KEYWORDS = {
    "shell", "command", "execute", "exec", "subprocess", "run_code", "eval", "compile", "python_repl", "terminal"
}
FILE_KEYWORDS = {
    "path", "upload", "download", "archive", "extract", "read_file", "write_file"
}
MEMORY_KEYWORDS = {
    "memory", "history", "chat_history", "messages", "vector", "retriever", "context", "embedding", "store"
}
SENSITIVE_DATA_KEYWORDS = {
    "customer", "email", "phone", "address", "password", "token", "secret", "payment", "card", "ssn",
    "health", "medical", "pii", "credential", "account"
}
APPROVAL_KEYWORDS = {
    "approval", "approve", "human_review", "manual_review", "reviewer", "confirm", "confirmation", "authorize",
    "authorization", "supervisor", "approval_id", "require_approval", "requires_approval"
}
AUDIT_KEYWORDS = {
    "audit", "audit_log", "log_event", "logger", "trace", "trace_id", "tool_call_id", "event_log", "telemetry"
}
ALLOWLIST_KEYWORDS = {"allowlist", "allowed", "denylist", "permission", "scope", "policy", "guardrail"}

SECURITY_HELPER_KEYWORDS = {
    "require_auth", "verify_token", "require_approval", "rate_limit", "sanitize", "mask", "redact",
    "validate_url", "safe_join", "safe_extract", "secure_filename", "validate_upload", "audit_log",
    "allowed", "allowlist", "cors", "jwt", "token", "approval", "review", "policy"
}

CONTROL_HELPER_TERMS = {
    "validate_url", "safe_join", "safe_extract", "secure_filename", "validate_upload_size",
    "mask_pii", "sanitize_prompt", "require_approval", "require_auth", "verify_token",
    "audit_log", "TOOL_ALLOWLIST", "ALLOWED_WEBHOOK_HOSTS", "ALLOWED_FILE_EXTENSIONS"
}

# Scanner reports often use their own labels. Keeping the mapping here makes the capability layer stable
# even when upstream scanners add more specific risk names later.
APPSEC_RISK_TO_CAPABILITY = {
    "rce_or_command_execution": ("code_execution", "critical"),
    "path_traversal": ("file_operation", "high"),
    "unsafe_file_upload": ("file_operation", "high"),
    "unsafe_archive_extraction": ("file_operation", "high"),
    "ssrf": ("external_call", "high"),
    "sql_injection": ("database_access", "high"),
    "xss": ("output_rendering", "medium"),
    "weak_jwt_or_auth_config": ("auth_boundary", "high"),
    "unsafe_deserialization": ("deserialization", "high"),
}


def _norm(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_") or "unknown"


def _stable_id(prefix: str, *parts: object) -> str:
    raw = "::".join(str(part) for part in parts)
    digest = hashlib.sha1(raw.encode("utf-8", errors="ignore")).hexdigest()[:10]
    return f"{prefix}_{digest}"


def _line_window(lines: list[str], line_number: int, radius: int = 12) -> str:
    """Return a bounded function window without leaking heavily into the next handler.

    A fixed before/after window made small demo handlers inherit keywords from the next
    route, which inflated capability risk. We keep a little context above the function,
    then stop once another function/decorator boundary is reached.
    """
    start = max(0, line_number - 1 - min(radius, 4))
    end = min(len(lines), line_number - 1 + radius + 1)
    for index in range(line_number, end):
        stripped = lines[index].strip()
        if index > line_number - 1 and (stripped.startswith("@") or re.match(r"(?:async\s+)?def\s+", stripped) or re.match(r"(?:export\s+)?(?:async\s+)?function\s+", stripped)):
            end = index
            break
    return "\n".join(lines[start:end])


def _has_any(text: str, keywords: set[str]) -> bool:
    lower = text.lower()
    return any(keyword.lower() in lower for keyword in keywords)


def _matched_keywords(text: str, keywords: set[str], limit: int = 8) -> list[str]:
    lower = text.lower()
    return sorted({keyword for keyword in keywords if keyword.lower() in lower})[:limit]


def _language_for_path(path: str) -> str:
    ext = os.path.splitext(path.lower())[1]
    return {
        ".py": "python",
        ".js": "javascript",
        ".jsx": "javascript",
        ".ts": "typescript",
        ".tsx": "typescript",
    }.get(ext, "unknown")


def _extract_function_candidates(path: str, text: str) -> list[dict[str, Any]]:
    ext = os.path.splitext(path.lower())[1]
    if ext not in CODE_EXTENSIONS:
        return []

    candidates: list[dict[str, Any]] = []
    lines = text.splitlines()
    for lineno, line in enumerate(lines, start=1):
        stripped = line.strip()
        if not stripped or stripped.startswith(("#", "//", "/*", "*")):
            continue

        matches = []
        if ext == ".py":
            matches = list(PY_FUNC_RE.finditer(line))
        elif ext in {".js", ".jsx", ".ts", ".tsx"}:
            matches = list(JS_FUNC_RE.finditer(line)) + list(JS_ARROW_RE.finditer(line))

        for match in matches:
            name = match.group(1)
            window = _line_window(lines, lineno, radius=14)
            candidates.append({
                "name": name,
                "file": path,
                "line": lineno,
                "language": _language_for_path(path),
                "evidence": stripped[:220],
                "window": window,
                "file_text": text,
            })
    return candidates


def _is_security_helper(name: str, combined: str) -> bool:
    name_norm = _norm(name)
    if any(term in name_norm for term in SECURITY_HELPER_KEYWORDS):
        return True
    # Some helper names are project-specific, but their bodies are clearly defensive.
    helper_hits = sum(1 for term in CONTROL_HELPER_TERMS if term.lower() in combined.lower())
    return helper_hits >= 3 and not any(term in name_norm for term in WRITE_KEYWORDS | EXTERNAL_KEYWORDS | CODE_EXEC_KEYWORDS)


def _classify_function_capability(candidate: dict[str, Any]) -> dict[str, Any] | None:
    name = candidate["name"]
    combined = f"{name}\n{candidate.get('window', '')}"
    name_norm = _norm(name).replace("_", "")
    lower = combined.lower()
    file_text = str(candidate.get("file_text") or "")

    if _is_security_helper(name, combined):
        return None

    cap_type = "utility_function"
    risk_level = "low"
    external_effect = False
    requires_approval = False

    if any(_norm(keyword).replace("_", "") in name_norm for keyword in CODE_EXEC_KEYWORDS) or _has_any(lower, {"subprocess", "os.system", "shell=true", "exec(", "eval("}):
        cap_type = "code_execution"
        risk_level = "critical"
        external_effect = True
        requires_approval = True
    elif any(_norm(keyword).replace("_", "") in name_norm for keyword in MEMORY_KEYWORDS) or _has_any(lower, {"chat_history", "vectorstore", "retriever", "messages.append"}):
        cap_type = "memory_operation"
        risk_level = "medium"
        requires_approval = False
    elif any(_norm(keyword).replace("_", "") in name_norm for keyword in FILE_KEYWORDS) or _has_any(lower, {"open(", "readfile", "writefile", "uploadfile", "extractall"}):
        cap_type = "file_operation"
        risk_level = "medium"
        external_effect = True
        requires_approval = True
    elif any(_norm(keyword).replace("_", "") in name_norm for keyword in EXTERNAL_KEYWORDS) or _has_any(lower, {"requests.", "fetch(", "axios", "sendgrid", "stripe", "webhook"}):
        cap_type = "external_action"
        risk_level = "high"
        external_effect = True
        requires_approval = True
    elif any(_norm(keyword).replace("_", "") in name_norm for keyword in WRITE_KEYWORDS) or _has_any(lower, {".set(", ".update(", ".delete(", "insert", "delete from", "update "}):
        cap_type = "write_action"
        risk_level = "high"
        external_effect = True
        requires_approval = True
    elif any(_norm(keyword).replace("_", "") in name_norm for keyword in READ_KEYWORDS):
        cap_type = "read_action"
        risk_level = "low"
    else:
        return None

    data_touched = _matched_keywords(combined, SENSITIVE_DATA_KEYWORDS)
    approval_found = _has_any(combined, APPROVAL_KEYWORDS)
    audit_logging_found = _has_any(combined, AUDIT_KEYWORDS)
    allowlist_found = (
        _has_any(combined, ALLOWLIST_KEYWORDS)
        or _has_any(combined, {"validate_url", "safe_join", "safe_extract", "secure_filename", "tool_allowlist"})
        or ("TOOL_ALLOWLIST" in file_text and name in file_text)
    )
    pii_control_found = _has_any(combined, {"mask", "redact", "sanitize", "safe_prompt", "masked"})

    if data_touched and risk_level == "low":
        risk_level = "medium"
    if requires_approval and not approval_found and risk_level == "medium":
        risk_level = "high"
    if cap_type == "code_execution" and not approval_found:
        risk_level = "critical"

    control_gaps = []
    if requires_approval and not approval_found:
        control_gaps.append("missing_human_approval")
    if external_effect and not audit_logging_found:
        control_gaps.append("missing_audit_logging")
    if cap_type in {"external_action", "code_execution"} and not allowlist_found:
        control_gaps.append("missing_allowlist_or_scope")
    if data_touched and not pii_control_found:
        control_gaps.append("sensitive_data_without_visible_masking")

    return {
        "id": _stable_id("cap", candidate["file"], candidate["line"], name),
        "name": name,
        "label": name.replace("_", " ").strip().title(),
        "capability_type": cap_type,
        "source": "function_definition",
        "risk_level": risk_level,
        "file": candidate["file"],
        "line": candidate["line"],
        "language": candidate["language"],
        "evidence": candidate["evidence"],
        "data_touched": data_touched,
        "external_effect": external_effect,
        "requires_approval": requires_approval,
        "approval_found": approval_found,
        "audit_logging_found": audit_logging_found,
        "allowlist_found": allowlist_found,
        "control_gaps": control_gaps,
        "related_findings": [],
        "related_api_endpoints": [],
        "related_appsec_risks": [],
        "related_context_risks": [],
        "confidence": "medium",
        "recommended_review": _recommended_review(cap_type, control_gaps),
    }


def _recommended_review(capability_type: str, gaps: list[str]) -> str:
    if not gaps:
        return "Review during normal release checks and keep evidence for the detected controls."
    if capability_type == "code_execution":
        return "Require sandboxing, command allowlists, audit logs, and human approval before this capability can be used by an agent."
    if "missing_human_approval" in gaps:
        return "Add an approval gate before this capability can trigger a write, external, or privileged action."
    if "missing_audit_logging" in gaps:
        return "Add structured audit logging with request ID, actor, capability name, redacted arguments, and outcome."
    return "Add the missing guardrails shown in control_gaps and re-scan the project."


def _capability_from_endpoint(endpoint: dict[str, Any]) -> dict[str, Any]:
    method = str(endpoint.get("method") or "GET").upper()
    path = str(endpoint.get("path") or "/")
    tags = set(endpoint.get("tags") or [])
    mutation = method in {"POST", "PUT", "PATCH", "DELETE"} or "mutation" in tags
    sensitive = "sensitive_action" in tags or any(word in path.lower() for word in ["delete", "admin", "refund", "payment", "upload", "assistant", "scan"])
    external_effect = mutation or "llm_call" in tags
    # API endpoints are release surfaces, not proof of human-approval gaps by themselves.
    # Approval is evaluated on the underlying tool/capability implementations.
    requires_approval = False

    risk_level = "low"
    if endpoint.get("auth_status") == "missing" and (mutation or sensitive):
        risk_level = "high"
    elif endpoint.get("rate_limit_status") == "missing" and ("llm_call" in tags or mutation):
        risk_level = "medium"
    elif mutation or sensitive:
        risk_level = "medium"

    control_gaps = []
    if endpoint.get("auth_status") == "missing":
        control_gaps.append("missing_authentication")
    if endpoint.get("rate_limit_status") == "missing":
        control_gaps.append("missing_rate_limit")
    if endpoint.get("cors_status") == "weak":
        control_gaps.append("weak_cors")

    return {
        "id": _stable_id("cap", "api", endpoint.get("id", ""), method, path),
        "name": f"{method} {path}",
        "label": f"{method} {path}",
        "capability_type": "api_endpoint",
        "source": "api_surface",
        "risk_level": risk_level,
        "file": endpoint.get("file", ""),
        "line": endpoint.get("line", 1),
        "language": "api",
        "evidence": endpoint.get("evidence", ""),
        "data_touched": _matched_keywords(path, SENSITIVE_DATA_KEYWORDS),
        "external_effect": external_effect,
        "requires_approval": requires_approval,
        "approval_found": False,
        "audit_logging_found": False,
        "allowlist_found": False,
        "control_gaps": control_gaps,
        "related_findings": [],
        "related_api_endpoints": [endpoint.get("id", "")],
        "related_appsec_risks": [],
        "related_context_risks": [],
        "confidence": "high",
        "recommended_review": "Check authentication, rate limits, request size limits, and audit logging for this endpoint before release.",
    }


def _capability_from_appsec_risk(risk: dict[str, Any]) -> dict[str, Any]:
    cap_type, default_risk = APPSEC_RISK_TO_CAPABILITY.get(str(risk.get("risk_type")), ("security_sink", "medium"))
    severity = str(risk.get("severity") or default_risk).lower()
    risk_level = {
        "critical": "critical",
        "high": "high",
        "medium": "medium",
        "low": "low",
    }.get(severity, default_risk)
    return {
        "id": _stable_id("cap", "appsec", risk.get("id", ""), risk.get("file", ""), risk.get("line", 1)),
        "name": str(risk.get("sink") or risk.get("risk_type") or "security_sink"),
        "label": str(risk.get("title") or risk.get("risk_type") or "Security sink"),
        "capability_type": cap_type,
        "source": "appsec_risk",
        "risk_level": risk_level,
        "file": risk.get("file", ""),
        "line": risk.get("line", 1),
        "language": _language_for_path(str(risk.get("file", ""))),
        "evidence": risk.get("evidence", ""),
        "data_touched": _matched_keywords(" ".join(str(risk.get(k, "")) for k in ["title", "evidence", "source", "sink"]), SENSITIVE_DATA_KEYWORDS),
        "external_effect": cap_type in {"code_execution", "external_call", "database_access", "file_operation"},
        "requires_approval": cap_type in {"code_execution", "external_call", "database_access", "file_operation", "auth_boundary"},
        "approval_found": False,
        "audit_logging_found": False,
        "allowlist_found": False,
        "control_gaps": [risk.get("missing_control") or "missing_security_control"],
        "related_findings": [],
        "related_api_endpoints": [],
        "related_appsec_risks": [risk.get("id", "")],
        "related_context_risks": [],
        "confidence": risk.get("confidence", "medium"),
        "recommended_review": risk.get("recommended_fix", "Review and add a defensive control around this security-sensitive sink."),
    }


def _capability_from_context_risk(risk: dict[str, Any]) -> dict[str, Any]:
    risk_type = str(risk.get("risk_type") or "context_risk")
    cap_type = "memory_operation" if "memory" in risk_type or "vector" in risk_type else "context_to_tool_flow"
    return {
        "id": _stable_id("cap", "context", risk.get("id", ""), risk.get("file", ""), risk.get("line", 1)),
        "name": risk_type,
        "label": str(risk.get("title") or risk_type.replace("_", " ").title()),
        "capability_type": cap_type,
        "source": "context_poisoning_risk",
        "risk_level": "high" if str(risk.get("severity", "")).lower() == "high" else "medium",
        "file": risk.get("file", ""),
        "line": risk.get("line", 1),
        "language": _language_for_path(str(risk.get("file", ""))),
        "evidence": risk.get("evidence", ""),
        "data_touched": _matched_keywords(" ".join(str(risk.get(k, "")) for k in ["title", "evidence", "source", "sink"]), SENSITIVE_DATA_KEYWORDS),
        "external_effect": "tool" in str(risk.get("sink", "")).lower(),
        "requires_approval": False,
        "approval_found": False,
        "audit_logging_found": False,
        "allowlist_found": False,
        "control_gaps": [risk.get("missing_control") or "missing_context_trust_control"],
        "related_findings": [],
        "related_api_endpoints": [],
        "related_appsec_risks": [],
        "related_context_risks": [risk.get("id", "")],
        "confidence": "medium",
        "recommended_review": risk.get("recommended_fix", "Add source trust metadata, sanitization, and context isolation before memory influences agent actions."),
    }


def _merge_duplicate_capabilities(capabilities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged: dict[tuple[str, str, int, str], dict[str, Any]] = {}
    risk_rank = {"low": 1, "medium": 2, "high": 3, "critical": 4}
    for cap in capabilities:
        key = (str(cap.get("file", "")), str(cap.get("name", "")), int(cap.get("line") or 1), str(cap.get("capability_type", "")))
        existing = merged.get(key)
        if not existing:
            merged[key] = cap
            continue
        if risk_rank.get(str(cap.get("risk_level")), 0) > risk_rank.get(str(existing.get("risk_level")), 0):
            existing["risk_level"] = cap.get("risk_level", existing.get("risk_level"))
        for field in ["data_touched", "control_gaps", "related_findings", "related_api_endpoints", "related_appsec_risks", "related_context_risks"]:
            existing[field] = sorted({*(existing.get(field) or []), *(cap.get(field) or [])})
        existing["external_effect"] = bool(existing.get("external_effect") or cap.get("external_effect"))
        existing["requires_approval"] = bool(existing.get("requires_approval") or cap.get("requires_approval"))
    return sorted(merged.values(), key=lambda item: (risk_rank.get(item.get("risk_level", "low"), 0), item.get("file", ""), item.get("line", 1)), reverse=True)


def _link_findings(capabilities: list[dict[str, Any]], findings: list[dict[str, Any]]) -> None:
    for cap in capabilities:
        related = []
        for finding in findings or []:
            if finding.get("file") != cap.get("file"):
                continue
            try:
                distance = abs(int(finding.get("line") or 0) - int(cap.get("line") or 0))
            except (TypeError, ValueError):
                distance = 999
            if distance <= 20 or str(finding.get("title", "")).lower() in str(cap.get("evidence", "")).lower():
                related.append(finding.get("id", ""))
        cap["related_findings"] = sorted({item for item in related if item})


def _summary(capabilities: list[dict[str, Any]]) -> dict[str, Any]:
    risk_counts = Counter(str(cap.get("risk_level", "low")) for cap in capabilities)
    type_counts = Counter(str(cap.get("capability_type", "unknown")) for cap in capabilities)
    source_counts = Counter(str(cap.get("source", "unknown")) for cap in capabilities)
    return {
        "total_capabilities": len(capabilities),
        "risk_counts": {"critical": risk_counts.get("critical", 0), "high": risk_counts.get("high", 0), "medium": risk_counts.get("medium", 0), "low": risk_counts.get("low", 0)},
        "type_counts": dict(sorted(type_counts.items())),
        "source_counts": dict(sorted(source_counts.items())),
        "external_effect_count": sum(1 for cap in capabilities if cap.get("external_effect")),
        "approval_required_count": sum(1 for cap in capabilities if cap.get("requires_approval")),
        "approval_missing_count": sum(1 for cap in capabilities if cap.get("requires_approval") and not cap.get("approval_found")),
        "audit_missing_count": sum(1 for cap in capabilities if cap.get("external_effect") and not cap.get("audit_logging_found")),
        "sensitive_data_capability_count": sum(1 for cap in capabilities if cap.get("data_touched")),
    }


def build_capability_map(
    files: dict[str, str],
    *,
    findings: list[dict[str, Any]] | None = None,
    api_surface: dict[str, Any] | None = None,
    appsec_risks: dict[str, Any] | None = None,
    context_poisoning_risks: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build the v3 project capability map from deterministic scan artifacts.

    This is intentionally conservative: we infer what the project appears able to do,
    then show missing controls separately instead of pretending we proved runtime behavior.
    """
    capabilities: list[dict[str, Any]] = []

    for path, text in files.items():
        for candidate in _extract_function_candidates(path, text):
            capability = _classify_function_capability(candidate)
            if capability:
                capabilities.append(capability)

    for endpoint in (api_surface or {}).get("endpoints", []) or []:
        capabilities.append(_capability_from_endpoint(endpoint))

    for risk in (appsec_risks or {}).get("risks", []) or []:
        capabilities.append(_capability_from_appsec_risk(risk))

    for risk in (context_poisoning_risks or {}).get("risks", []) or []:
        capabilities.append(_capability_from_context_risk(risk))

    capabilities = _merge_duplicate_capabilities(capabilities)
    _link_findings(capabilities, findings or [])

    return {
        "summary": _summary(capabilities),
        "capabilities": capabilities,
        "scanner_version": "v3-capability-map-1",
        "notes": [
            "Capability detection is static and evidence-based. It maps likely project abilities, not runtime authorization guarantees.",
            "Approval and audit fields mean controls were visible near the detected code path; absence should be reviewed by a developer.",
        ],
    }
