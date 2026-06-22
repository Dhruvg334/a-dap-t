from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class ApiEndpoint:
    id: str
    method: str
    path: str
    framework: str
    file: str
    line: int
    handler: str = ""
    auth_status: str = "unknown"
    rate_limit_status: str = "unknown"
    cors_status: str = "unknown"
    request_body_status: str = "unknown"
    risk_level: str = "low"
    tags: tuple[str, ...] = ()
    evidence: str = ""


@dataclass(frozen=True)
class ApiRisk:
    id: str
    title: str
    severity: str
    risk_type: str
    endpoint_id: str
    method: str
    path: str
    framework: str
    file: str
    line: int
    evidence: str
    why_it_matters: str
    recommended_fix: str
    related_control: str = ""


_FASTAPI_ROUTE_RE = re.compile(
    r"@(?P<router>[A-Za-z_][A-Za-z0-9_\.]*)(?:\.(?P<method>get|post|put|patch|delete|options|head))\s*\(\s*[\"'](?P<path>[^\"']+)[\"']",
    re.IGNORECASE,
)
_EXPRESS_ROUTE_RE = re.compile(
    r"(?P<router>app|router)\s*\.\s*(?P<method>get|post|put|patch|delete|options|head)\s*\(\s*[`\"'](?P<path>[^`\"']+)[`\"']",
    re.IGNORECASE,
)
_NEXT_EXPORT_RE = re.compile(r"export\s+(?:async\s+)?function\s+(?P<method>GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\(")
_PY_FUNC_RE = re.compile(r"\s*(?:async\s+)?def\s+(?P<name>[A-Za-z_][A-Za-z0-9_]*)\s*\(")
_JS_FUNC_RE = re.compile(r"\s*(?:export\s+)?(?:async\s+)?function\s+(?P<name>[A-Za-z_][A-Za-z0-9_]*)\s*\(")

_MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
_UPLOAD_TERMS = ("upload", "file", "multipart", "formdata", "uploadfile")
_LLM_TERMS = ("openai", "gemini", "anthropic", "chat.completions", "generate_content", "assistant", "llm", "model")
_AUTH_TERMS = (
    "verify_token", "authorization", "bearer", "firebase", "current_user", "depends(get_current", "depends(verify",
    "require_auth", "requireauth", "authmiddleware", "jwt", "session", "getauthtoken", "x-api-key",
)
_RATE_LIMIT_TERMS = (
    "limiter", "ratelimit", "rate_limit", "slowapi", "throttle", "too many requests", "429", "upstash/ratelimit",
)
_VALIDATION_TERMS = ("pydantic", "basemodel", "zod", "joi", "yup", "schema.parse", "request.json", "bodyparser")
_CORS_WEAK_TERMS = ("allow_origins=[\"*\"]", "origin: '*'", "origin: \"*\"", "access-control-allow-origin", "alloworigin: '*'", "cors({")


def _normalize_endpoint_path(path: str) -> str:
    cleaned = path.strip() or "/"
    if not cleaned.startswith("/"):
        cleaned = f"/{cleaned}"
    return cleaned


def _line_after(lines: list[str], start: int, max_lines: int = 24) -> str:
    """Return a small handler window. We keep this bounded because scanned code is untrusted text."""
    return "\n".join(lines[start:min(len(lines), start + max_lines)])


def _next_path_from_file(path: str) -> str:
    normalized = path.replace("\\", "/")
    marker = "/app/api/"
    if marker in f"/{normalized}":
        route = f"/{normalized}".split(marker, 1)[1]
        route = re.sub(r"/route\.(ts|tsx|js|jsx)$", "", route)
        route = re.sub(r"\.(ts|tsx|js|jsx)$", "", route)
        return _normalize_endpoint_path(route)
    marker = "/pages/api/"
    if marker in f"/{normalized}":
        route = f"/{normalized}".split(marker, 1)[1]
        route = re.sub(r"\.(ts|tsx|js|jsx)$", "", route)
        return _normalize_endpoint_path(route)
    return "/api/unknown"


def _handler_name(lines: list[str], route_line_index: int, language: str) -> str:
    for line in lines[route_line_index + 1: min(len(lines), route_line_index + 8)]:
        match = _PY_FUNC_RE.match(line) if language == "python" else _JS_FUNC_RE.match(line)
        if match:
            return match.group("name")
    return ""


def _has_any(text: str, terms: tuple[str, ...]) -> bool:
    lowered = text.lower()
    return any(term.lower() in lowered for term in terms)


def _looks_rate_limited(text: str, global_text: str) -> bool:
    return _has_any(text, _RATE_LIMIT_TERMS) or _has_any(global_text[:4000], _RATE_LIMIT_TERMS)


def _looks_authenticated(text: str, global_text: str) -> bool:
    return _has_any(text, _AUTH_TERMS) or _has_any(global_text[:5000], _AUTH_TERMS)


def _request_body_status(method: str, window: str) -> str:
    if method not in _MUTATING_METHODS:
        return "not_applicable"
    return "validated_or_typed" if _has_any(window, _VALIDATION_TERMS) else "unclear"


def _endpoint_tags(method: str, path: str, window: str) -> tuple[str, ...]:
    joined = f"{path}\n{window}".lower()
    tags: list[str] = []
    if method in _MUTATING_METHODS:
        tags.append("mutation")
    if any(term in joined for term in _UPLOAD_TERMS):
        tags.append("file_upload")
    if any(term in joined for term in _LLM_TERMS):
        tags.append("llm_call")
    if any(term in joined for term in ("delete", "admin", "refund", "payment", "transfer", "write")):
        tags.append("sensitive_action")
    return tuple(dict.fromkeys(tags))


def _risk_level(auth_status: str, rate_limit_status: str, tags: tuple[str, ...], method: str) -> str:
    if auth_status == "missing" and (method in _MUTATING_METHODS or "sensitive_action" in tags or "file_upload" in tags):
        return "critical"
    if auth_status == "missing":
        return "high"
    if rate_limit_status == "missing" and ("llm_call" in tags or "file_upload" in tags):
        return "high"
    if rate_limit_status == "missing" and method in _MUTATING_METHODS:
        return "medium"
    if "file_upload" in tags:
        return "medium"
    return "low"


def _endpoint_id(method: str, path: str, file: str, line: int) -> str:
    raw = f"{method}_{path}_{file}_{line}".lower()
    cleaned = re.sub(r"[^a-z0-9]+", "_", raw).strip("_")
    return f"api_{cleaned[:90]}"


def _make_endpoint(method: str, path: str, framework: str, file: str, line: int, evidence: str, window: str, full_text: str, handler: str = "") -> ApiEndpoint:
    method = method.upper()
    normalized_path = _normalize_endpoint_path(path)
    auth_status = "present" if _looks_authenticated(window, full_text) else "missing"
    rate_limit_status = "present" if _looks_rate_limited(window, full_text) else "missing"
    cors_status = "weak_or_wildcard" if _has_any(full_text, _CORS_WEAK_TERMS) else "not_detected"
    body_status = _request_body_status(method, window)
    tags = _endpoint_tags(method, normalized_path, window)
    return ApiEndpoint(
        id=_endpoint_id(method, normalized_path, file, line),
        method=method,
        path=normalized_path,
        framework=framework,
        file=file,
        line=line,
        handler=handler,
        auth_status=auth_status,
        rate_limit_status=rate_limit_status,
        cors_status=cors_status,
        request_body_status=body_status,
        risk_level=_risk_level(auth_status, rate_limit_status, tags, method),
        tags=tags,
        evidence=evidence.strip()[:260],
    )


def _scan_fastapi_file(path: str, text: str) -> list[ApiEndpoint]:
    lines = text.splitlines()
    endpoints: list[ApiEndpoint] = []
    for index, line in enumerate(lines):
        match = _FASTAPI_ROUTE_RE.search(line)
        if not match:
            continue
        window = _line_after(lines, index, max_lines=28)
        handler = _handler_name(lines, index, "python")
        endpoints.append(_make_endpoint(
            method=match.group("method"),
            path=match.group("path"),
            framework="fastapi",
            file=path,
            line=index + 1,
            evidence=line,
            window=window,
            full_text=text,
            handler=handler,
        ))
    return endpoints


def _scan_express_file(path: str, text: str) -> list[ApiEndpoint]:
    lines = text.splitlines()
    endpoints: list[ApiEndpoint] = []
    for index, line in enumerate(lines):
        match = _EXPRESS_ROUTE_RE.search(line)
        if not match:
            continue
        window = _line_after(lines, index, max_lines=32)
        endpoints.append(_make_endpoint(
            method=match.group("method"),
            path=match.group("path"),
            framework="express",
            file=path,
            line=index + 1,
            evidence=line,
            window=window,
            full_text=text,
        ))
    return endpoints


def _scan_next_api_file(path: str, text: str) -> list[ApiEndpoint]:
    normalized = path.replace("\\", "/")
    if "/api/" not in f"/{normalized}" and not normalized.startswith("app/api/") and not normalized.startswith("pages/api/"):
        return []
    lines = text.splitlines()
    endpoints: list[ApiEndpoint] = []
    route_path = _next_path_from_file(path)
    for index, line in enumerate(lines):
        match = _NEXT_EXPORT_RE.search(line)
        if not match:
            continue
        window = _line_after(lines, index, max_lines=32)
        endpoints.append(_make_endpoint(
            method=match.group("method"),
            path=route_path,
            framework="nextjs_api_route",
            file=path,
            line=index + 1,
            evidence=line,
            window=window,
            full_text=text,
            handler=match.group("method"),
        ))
    # pages/api files often default-export one handler and branch on req.method. Keep a conservative fallback.
    if not endpoints and normalized.startswith("pages/api/"):
        for index, line in enumerate(lines):
            if "export default" in line or "module.exports" in line:
                window = _line_after(lines, index, max_lines=36)
                method = "POST" if "post" in window.lower() else "GET"
                endpoints.append(_make_endpoint(
                    method=method,
                    path=route_path,
                    framework="nextjs_api_route",
                    file=path,
                    line=index + 1,
                    evidence=line,
                    window=window,
                    full_text=text,
                ))
                break
    return endpoints


def _risk_id(endpoint: ApiEndpoint, risk_type: str) -> str:
    raw = f"{endpoint.id}_{risk_type}".lower()
    return re.sub(r"[^a-z0-9]+", "_", raw).strip("_")[:120]


def _risks_for_endpoint(endpoint: ApiEndpoint) -> list[ApiRisk]:
    risks: list[ApiRisk] = []

    if endpoint.auth_status == "missing":
        severity = "Critical" if endpoint.method in _MUTATING_METHODS or "sensitive_action" in endpoint.tags else "High"
        risks.append(ApiRisk(
            id=_risk_id(endpoint, "missing_auth"),
            title="API endpoint does not show an authentication gate",
            severity=severity,
            risk_type="missing_auth",
            endpoint_id=endpoint.id,
            method=endpoint.method,
            path=endpoint.path,
            framework=endpoint.framework,
            file=endpoint.file,
            line=endpoint.line,
            evidence=endpoint.evidence,
            why_it_matters=(
                "Public API routes are one of the easiest ways to turn an AI application issue into a real product security issue. "
                "Mutation, upload, assistant, and report endpoints should make authentication explicit."
            ),
            recommended_fix="Require an auth middleware/dependency before this endpoint handles the request.",
            related_control="authentication",
        ))

    if endpoint.rate_limit_status == "missing" and (endpoint.method in _MUTATING_METHODS or "llm_call" in endpoint.tags or "file_upload" in endpoint.tags):
        severity = "High" if "llm_call" in endpoint.tags or "file_upload" in endpoint.tags else "Medium"
        risks.append(ApiRisk(
            id=_risk_id(endpoint, "missing_rate_limit"),
            title="API endpoint does not show rate limiting",
            severity=severity,
            risk_type="missing_rate_limit",
            endpoint_id=endpoint.id,
            method=endpoint.method,
            path=endpoint.path,
            framework=endpoint.framework,
            file=endpoint.file,
            line=endpoint.line,
            evidence=endpoint.evidence,
            why_it_matters=(
                "AI-backed and mutation endpoints can become cost, abuse, or denial-of-service risks when callers can hit them without throttling."
            ),
            recommended_fix="Add per-user/IP rate limits and return 429 when limits are exceeded.",
            related_control="rate_limiting",
        ))

    if endpoint.cors_status == "weak_or_wildcard" and endpoint.auth_status == "missing":
        risks.append(ApiRisk(
            id=_risk_id(endpoint, "weak_cors_public_endpoint"),
            title="Wildcard CORS appears near a public API surface",
            severity="Medium",
            risk_type="weak_cors",
            endpoint_id=endpoint.id,
            method=endpoint.method,
            path=endpoint.path,
            framework=endpoint.framework,
            file=endpoint.file,
            line=endpoint.line,
            evidence=endpoint.evidence,
            why_it_matters="Wildcard CORS can make browser-based abuse easier when paired with weakly protected API routes.",
            recommended_fix="Restrict CORS origins to trusted frontend domains and keep auth checks server-side.",
            related_control="cors_policy",
        ))

    if "file_upload" in endpoint.tags and endpoint.request_body_status == "unclear":
        risks.append(ApiRisk(
            id=_risk_id(endpoint, "upload_without_clear_validation"),
            title="Upload-like endpoint lacks clear request validation",
            severity="High" if endpoint.auth_status == "missing" else "Medium",
            risk_type="unsafe_file_upload",
            endpoint_id=endpoint.id,
            method=endpoint.method,
            path=endpoint.path,
            framework=endpoint.framework,
            file=endpoint.file,
            line=endpoint.line,
            evidence=endpoint.evidence,
            why_it_matters="Upload routes need strict size, type, extension, and extraction limits before accepting untrusted project files.",
            recommended_fix="Add explicit upload size/type validation and safe extraction limits before processing files.",
            related_control="input_validation",
        ))

    return risks


def _summarize(endpoints: list[ApiEndpoint], risks: list[ApiRisk]) -> dict[str, Any]:
    frameworks = sorted({endpoint.framework for endpoint in endpoints})
    methods: dict[str, int] = {}
    auth_missing = 0
    rate_limit_missing = 0
    risky_mutations = 0
    for endpoint in endpoints:
        methods[endpoint.method] = methods.get(endpoint.method, 0) + 1
        if endpoint.auth_status == "missing":
            auth_missing += 1
        if endpoint.rate_limit_status == "missing":
            rate_limit_missing += 1
        if endpoint.method in _MUTATING_METHODS and endpoint.risk_level in {"critical", "high", "medium"}:
            risky_mutations += 1

    severity_counts: dict[str, int] = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for risk in risks:
        severity_counts[risk.severity] = severity_counts.get(risk.severity, 0) + 1

    return {
        "total_endpoints": len(endpoints),
        "frameworks": frameworks,
        "methods": methods,
        "auth_missing": auth_missing,
        "rate_limit_missing": rate_limit_missing,
        "risky_mutations": risky_mutations,
        "risk_count": len(risks),
        "severity_counts": severity_counts,
    }


def build_api_surface(files: dict[str, str]) -> dict[str, Any]:
    endpoints: list[ApiEndpoint] = []
    notes: list[str] = []

    for path, text in sorted(files.items()):
        normalized = path.replace("\\", "/")
        suffix = normalized.rsplit(".", 1)[-1].lower() if "." in normalized else ""
        if suffix == "py":
            endpoints.extend(_scan_fastapi_file(path, text))
        if suffix in {"js", "jsx", "ts", "tsx"}:
            endpoints.extend(_scan_express_file(path, text))
            endpoints.extend(_scan_next_api_file(path, text))

    # Dedupe by stable endpoint ID in case a line matched two JS scanners.
    deduped: dict[str, ApiEndpoint] = {endpoint.id: endpoint for endpoint in endpoints}
    endpoints = list(deduped.values())
    risks: list[ApiRisk] = []
    for endpoint in endpoints:
        risks.extend(_risks_for_endpoint(endpoint))

    if not endpoints:
        notes.append("No API routes were detected in supported FastAPI, Express, or Next.js API patterns.")

    return {
        "summary": _summarize(endpoints, risks),
        "endpoints": [asdict(endpoint) for endpoint in endpoints],
        "risks": [asdict(risk) for risk in risks],
        "scanner_version": "v3-api-surface-1",
        "notes": notes,
    }
