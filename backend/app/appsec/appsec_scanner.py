from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from typing import Any, Iterable


@dataclass(frozen=True)
class AppSecRisk:
    id: str
    title: str
    severity: str
    risk_type: str
    cwe: str
    file: str
    line: int
    evidence: str
    source: str
    sink: str
    missing_control: str
    confidence: str
    why_it_matters: str
    recommended_fix: str


_CODE_EXTENSIONS = (".py", ".js", ".jsx", ".ts", ".tsx")

_REQUEST_INPUT_TERMS = (
    "request.args", "request.form", "request.json", "request.get_json", "request.query_params",
    "request.query", "request.body", "request.params", "req.query", "req.body", "req.params",
    "searchparams.get", "url.searchparams", "nexturl.searchparams", "params.", "query.",
)
_PATH_INPUT_TERMS = ("path", "filename", "file_name", "filepath", "file", "dir", "folder", "key")
_URL_INPUT_TERMS = ("url", "uri", "endpoint", "callback", "webhook", "target", "redirect", "next")
_SQL_STARTERS = ("select", "insert", "update", "delete", "drop", "alter", "create")

_SAFE_PATH_TERMS = (
    "safe_join", "secure_filename", "werkzeug.utils", "path.resolve", "normalize", "resolve()",
    "relative_to", "startswith", "commonpath", "is_relative_to", "allowed_extensions",
)
_SSRF_CONTROL_TERMS = (
    "allowlist", "allowed_hosts", "allowed_domains", "urlparse", "hostname", "netloc", "ip_address",
    "is_private", "is_loopback", "denylist", "block_internal", "validate_url", "trusted_domain",
)
_SQL_CONTROL_TERMS = (
    "?", "%s", ":", "sqlalchemy.text", "parameterized", "params=", "execute(query,", "execute(sql,",
)
_XSS_CONTROL_TERMS = ("sanitize", "dompurify", "escape", "html.escape", "bleach.clean", "xss", "trustedtypes")
_UPLOAD_CONTROL_TERMS = (
    "safe_extract", "commonpath", "allowed_extensions", "max_file", "max_size", "content_type",
    "secure_filename", "extract_member", "normalize", "resolve",
)
_JWT_CONTROL_TERMS = ("algorithms=", "issuer", "audience", "verify_exp", "verify_aud", "verify_iss")

_RCE_PATTERNS = (
    "os.system", "subprocess.call", "subprocess.run", "subprocess.popen", "popen(", "exec(", "eval(",
    "child_process.exec", "execsync", "spawn(", "new function(", "function(",
)
_DESERIALIZATION_PATTERNS = ("pickle.loads", "pickle.load", "yaml.load", "jsonpickle.decode", "marshal.loads")
_ARCHIVE_EXTRACT_PATTERNS = ("extractall", "extract(", "unpack_archive", "adm-zip", ".extractall")


def _is_supported_code(path: str) -> bool:
    return path.lower().endswith(_CODE_EXTENSIONS)


def _is_comment_only(line: str, path: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return True
    if path.endswith(".py"):
        return stripped.startswith("#")
    return stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*")


def _window(lines: list[str], index: int, before: int = 8, after: int = 10) -> str:
    start = max(0, index - before)
    end = min(len(lines), index + after + 1)
    return "\n".join(lines[start:end])


def _has_any(text: str, terms: Iterable[str]) -> bool:
    lowered = text.lower()
    return any(term.lower() in lowered for term in terms)


def _first_any(text: str, terms: Iterable[str]) -> str:
    lowered = text.lower()
    for term in terms:
        if term.lower() in lowered:
            return term
    return ""


def _looks_user_controlled(text: str, extra_terms: Iterable[str] = ()) -> bool:
    return _has_any(text, tuple(_REQUEST_INPUT_TERMS) + tuple(extra_terms))


def _risk_id(path: str, line: int, risk_type: str) -> str:
    raw = f"appsec_{risk_type}_{path}_{line}".lower()
    return re.sub(r"[^a-z0-9]+", "_", raw).strip("_")[:130]


def _evidence(line: str) -> str:
    return line.strip()[:280]


def _risk(
    *,
    path: str,
    line: int,
    title: str,
    severity: str,
    risk_type: str,
    cwe: str,
    evidence: str,
    source: str,
    sink: str,
    missing_control: str,
    confidence: str,
    why_it_matters: str,
    recommended_fix: str,
) -> AppSecRisk:
    return AppSecRisk(
        id=_risk_id(path, line, risk_type),
        title=title,
        severity=severity,
        risk_type=risk_type,
        cwe=cwe,
        file=path,
        line=line,
        evidence=_evidence(evidence),
        source=source,
        sink=sink,
        missing_control=missing_control,
        confidence=confidence,
        why_it_matters=why_it_matters,
        recommended_fix=recommended_fix,
    )


def _scan_path_traversal(path: str, lines: list[str]) -> list[AppSecRisk]:
    risks: list[AppSecRisk] = []
    for index, line in enumerate(lines):
        if _is_comment_only(line, path):
            continue
        line_lower = line.lower()
        window = _window(lines, index)
        risky_file_sink = any(sink in line_lower for sink in ("open(", "readfile", "writefile", "send_file", "sendfile", "filereadstream", "create_read_stream", "path.join", "os.path.join", "pathlib.path"))
        archive_sink = any(term in line_lower for term in _ARCHIVE_EXTRACT_PATTERNS)
        if not risky_file_sink and not archive_sink:
            continue
        if not _looks_user_controlled(window, _PATH_INPUT_TERMS) and not _has_any(line, _PATH_INPUT_TERMS):
            continue
        if _has_any(window, _SAFE_PATH_TERMS):
            continue
        severity = "Critical" if archive_sink else "High"
        risks.append(_risk(
            path=path,
            line=index + 1,
            title="User-controlled file path reaches a filesystem operation",
            severity=severity,
            risk_type="path_traversal",
            cwe="CWE-22",
            evidence=line,
            source="request-controlled path or filename",
            sink="filesystem read/write/extract operation",
            missing_control="safe path normalization and base-directory enforcement",
            confidence="medium",
            why_it_matters="If a user-controlled path reaches file operations without containment checks, attackers may read or overwrite files outside the intended directory.",
            recommended_fix="Resolve the final path, enforce that it stays under an allowed base directory, reject traversal segments, and use safe archive extraction for ZIP files.",
        ))
    return risks


def _scan_ssrf(path: str, lines: list[str]) -> list[AppSecRisk]:
    risks: list[AppSecRisk] = []
    sinks = ("requests.get", "requests.post", "requests.request", "httpx.get", "httpx.post", "httpx.request", "urllib.request", "fetch(", "axios.get", "axios.post", "got(", "request.get", "request.post")
    for index, line in enumerate(lines):
        if _is_comment_only(line, path):
            continue
        line_lower = line.lower()
        matched_sink = _first_any(line_lower, sinks)
        if not matched_sink:
            continue
        window = _window(lines, index, before=10, after=12)
        if not _looks_user_controlled(window, _URL_INPUT_TERMS) and not _has_any(line, _URL_INPUT_TERMS):
            continue
        if _has_any(window, _SSRF_CONTROL_TERMS):
            continue
        risks.append(_risk(
            path=path,
            line=index + 1,
            title="User-controlled URL reaches an outbound request",
            severity="High",
            risk_type="ssrf",
            cwe="CWE-918",
            evidence=line,
            source="request-controlled URL or webhook target",
            sink=matched_sink,
            missing_control="URL allowlist and internal-network blocking",
            confidence="medium",
            why_it_matters="Server-side fetches to user-controlled URLs can be abused to reach internal services, cloud metadata endpoints, or private APIs.",
            recommended_fix="Allowlist trusted hostnames, parse and validate URLs, block private/link-local IP ranges, and apply request timeouts.",
        ))
    return risks


def _scan_rce(path: str, lines: list[str]) -> list[AppSecRisk]:
    risks: list[AppSecRisk] = []
    for index, line in enumerate(lines):
        if _is_comment_only(line, path):
            continue
        line_lower = line.lower()
        pattern = _first_any(line_lower, _RCE_PATTERNS)
        if not pattern:
            continue
        window = _window(lines, index, before=8, after=8)
        has_user_input = _looks_user_controlled(window) or _has_any(window, ("user_input", "cmd", "command", "code", "script"))
        shell_true = "shell=true" in line_lower or "shell: true" in line_lower
        if pattern in {"eval(", "exec(", "new function(", "function("}:
            # Avoid flagging normal JS named functions; only flag dynamic Function constructor or Python eval/exec-like sinks.
            if pattern == "function(" and "new function" not in line_lower:
                continue
        if not has_user_input and not shell_true and pattern not in {"eval(", "exec(", "new function("}:
            continue
        severity = "Critical" if shell_true or has_user_input else "High"
        risks.append(_risk(
            path=path,
            line=index + 1,
            title="Potential command/code execution sink exposed to untrusted input",
            severity=severity,
            risk_type="rce_or_command_execution",
            cwe="CWE-78/CWE-94",
            evidence=line,
            source="request/user-controlled command or code value",
            sink=pattern,
            missing_control="command allowlist and sandboxing",
            confidence="medium" if has_user_input else "low",
            why_it_matters="Command and dynamic code execution are high-impact sinks. In AI apps, prompt-controlled values can accidentally become command input if tool boundaries are weak.",
            recommended_fix="Remove dynamic execution where possible. Otherwise use strict command allowlists, argument arrays, sandboxing, timeouts, and never pass prompt/user text directly to a shell.",
        ))
    return risks


def _scan_sqli(path: str, lines: list[str]) -> list[AppSecRisk]:
    risks: list[AppSecRisk] = []
    sql_re = re.compile(r"\b(select|insert|update|delete|drop|alter)\b", re.IGNORECASE)
    for index, line in enumerate(lines):
        if _is_comment_only(line, path):
            continue
        line_lower = line.lower()
        if not sql_re.search(line):
            continue
        if not any(term in line_lower for term in ("execute", "query", "raw", "cursor", "sql")):
            continue
        dynamic_sql = bool(re.search(r"f[\"'].*\{.+\}.*[\"']", line)) or "${" in line or "+" in line or ".format(" in line or "%" in line
        if not dynamic_sql:
            continue
        window = _window(lines, index, before=6, after=6)
        if _has_any(window, _SQL_CONTROL_TERMS) and not ("f\"" in line or "f'" in line or "${" in line):
            continue
        risks.append(_risk(
            path=path,
            line=index + 1,
            title="Dynamic SQL query construction detected",
            severity="High",
            risk_type="sql_injection",
            cwe="CWE-89",
            evidence=line,
            source="dynamic string interpolation or concatenation",
            sink="SQL execution/query call",
            missing_control="parameterized query binding",
            confidence="medium",
            why_it_matters="String-built SQL can allow attackers to alter queries when user-controlled values reach the statement.",
            recommended_fix="Use parameterized queries or ORM bind parameters. Keep SQL text and user values separate.",
        ))
    return risks


def _scan_xss(path: str, lines: list[str]) -> list[AppSecRisk]:
    risks: list[AppSecRisk] = []
    for index, line in enumerate(lines):
        if _is_comment_only(line, path):
            continue
        line_lower = line.lower()
        xss_sink = "dangerouslysetinnerhtml" in line_lower or ".innerhtml" in line_lower or "res.send" in line_lower or "response.write" in line_lower
        if not xss_sink:
            continue
        window = _window(lines, index, before=8, after=8)
        if _has_any(window, _XSS_CONTROL_TERMS):
            continue
        if not _looks_user_controlled(window) and not _has_any(window, ("html", "content", "message", "output", "generated")):
            continue
        risks.append(_risk(
            path=path,
            line=index + 1,
            title="Untrusted HTML may reach a browser rendering sink",
            severity="High" if "dangerouslysetinnerhtml" in line_lower else "Medium",
            risk_type="xss",
            cwe="CWE-79",
            evidence=line,
            source="user/model-generated HTML or message content",
            sink="browser HTML rendering sink",
            missing_control="HTML sanitization or escaping",
            confidence="medium",
            why_it_matters="AI-generated or user-provided content can become script execution if rendered as raw HTML.",
            recommended_fix="Avoid raw HTML rendering. If unavoidable, sanitize with a proven library such as DOMPurify and keep CSP enabled.",
        ))
    return risks


def _scan_jwt_config(path: str, lines: list[str]) -> list[AppSecRisk]:
    risks: list[AppSecRisk] = []
    for index, line in enumerate(lines):
        if _is_comment_only(line, path):
            continue
        line_lower = line.lower().replace(" ", "")
        risky = (
            "verify=false" in line_lower
            or "verify_signature':false" in line_lower
            or 'verify_signature":false' in line_lower
            or "algorithms=['none']" in line_lower
            or 'algorithms=["none"]' in line_lower
            or "algorithm:'none'" in line_lower
            or 'algorithm:"none"' in line_lower
        )
        weak_secret = bool(re.search(r"(jwt_secret|secret_key|nextauth_secret)\s*[=:]\s*[\"'](?:secret|changeme|password|dev|test)[\"']", line, re.IGNORECASE))
        if not risky and not weak_secret:
            continue
        window = _window(lines, index)
        severity = "Critical" if risky else "High"
        risks.append(_risk(
            path=path,
            line=index + 1,
            title="Weak JWT/auth verification configuration detected",
            severity=severity,
            risk_type="weak_jwt_or_auth_config",
            cwe="CWE-347",
            evidence=line,
            source="JWT/auth configuration",
            sink="token verification path",
            missing_control="strict signature, algorithm, issuer, and audience validation",
            confidence="high",
            why_it_matters="Weak token verification can let attackers forge or replay authentication tokens.",
            recommended_fix="Require signature verification, pin allowed algorithms, validate issuer/audience/expiry, and load strong secrets from a secret manager.",
        ))
    return risks


def _scan_deserialization(path: str, lines: list[str]) -> list[AppSecRisk]:
    risks: list[AppSecRisk] = []
    for index, line in enumerate(lines):
        if _is_comment_only(line, path):
            continue
        line_lower = line.lower()
        pattern = _first_any(line_lower, _DESERIALIZATION_PATTERNS)
        if not pattern:
            continue
        if "yaml.load" in line_lower and ("safeloader" in line_lower or "safe_load" in line_lower):
            continue
        window = _window(lines, index)
        severity = "Critical" if _looks_user_controlled(window) else "High"
        risks.append(_risk(
            path=path,
            line=index + 1,
            title="Unsafe deserialization sink detected",
            severity=severity,
            risk_type="unsafe_deserialization",
            cwe="CWE-502",
            evidence=line,
            source="serialized or uploaded content",
            sink=pattern,
            missing_control="safe parser or trusted-source validation",
            confidence="medium",
            why_it_matters="Unsafe deserialization can turn crafted input into code execution or object injection, especially around uploads and background jobs.",
            recommended_fix="Use safe parsers, avoid pickle for untrusted data, use yaml.safe_load, and validate file/source trust before parsing.",
        ))
    return risks


def _scan_archive_upload(path: str, lines: list[str]) -> list[AppSecRisk]:
    risks: list[AppSecRisk] = []
    for index, line in enumerate(lines):
        if _is_comment_only(line, path):
            continue
        line_lower = line.lower()
        if not any(term in line_lower for term in _ARCHIVE_EXTRACT_PATTERNS):
            continue
        window = _window(lines, index, before=12, after=12)
        if _has_any(window, _UPLOAD_CONTROL_TERMS):
            continue
        risks.append(_risk(
            path=path,
            line=index + 1,
            title="Archive extraction lacks visible safety checks",
            severity="High",
            risk_type="unsafe_archive_extraction",
            cwe="CWE-22",
            evidence=line,
            source="uploaded archive or repository ZIP",
            sink="archive extraction",
            missing_control="zip-slip protection and extraction limits",
            confidence="medium",
            why_it_matters="Archives can contain traversal paths, excessive nesting, or oversized files that escape directories or exhaust resources.",
            recommended_fix="Extract each member safely by resolving final paths, enforcing a base directory, limiting file count/size/depth, and rejecting symlinks/traversal paths.",
        ))
    return risks


def _scan_file(path: str, text: str) -> list[AppSecRisk]:
    lines = text.splitlines()
    risks: list[AppSecRisk] = []
    risks.extend(_scan_path_traversal(path, lines))
    risks.extend(_scan_ssrf(path, lines))
    risks.extend(_scan_rce(path, lines))
    risks.extend(_scan_sqli(path, lines))
    risks.extend(_scan_xss(path, lines))
    risks.extend(_scan_jwt_config(path, lines))
    risks.extend(_scan_deserialization(path, lines))
    risks.extend(_scan_archive_upload(path, lines))
    return risks


def _summary(risks: list[AppSecRisk]) -> dict[str, Any]:
    severity_counts: dict[str, int] = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    risk_types: dict[str, int] = {}
    cwe_counts: dict[str, int] = {}
    for risk in risks:
        severity_counts[risk.severity] = severity_counts.get(risk.severity, 0) + 1
        risk_types[risk.risk_type] = risk_types.get(risk.risk_type, 0) + 1
        if risk.cwe:
            cwe_counts[risk.cwe] = cwe_counts.get(risk.cwe, 0) + 1
    return {
        "risk_count": len(risks),
        "severity_counts": severity_counts,
        "risk_types": risk_types,
        "cwe_counts": cwe_counts,
    }


def build_appsec_risks(files: dict[str, str]) -> dict[str, Any]:
    risks: list[AppSecRisk] = []
    for path, text in sorted(files.items()):
        if not _is_supported_code(path):
            continue
        risks.extend(_scan_file(path, text))

    # Keep reports stable and avoid duplicate noise when several heuristics catch the same sink.
    deduped: dict[str, AppSecRisk] = {risk.id: risk for risk in risks}
    risks = list(deduped.values())
    risks.sort(key=lambda risk: (risk.file, risk.line, risk.risk_type))

    return {
        "summary": _summary(risks),
        "risks": [asdict(risk) for risk in risks],
        "scanner_version": "v3-appsec-patterns-1",
        "notes": [] if risks else ["No obvious application-security sink patterns were detected in supported code files."],
    }
