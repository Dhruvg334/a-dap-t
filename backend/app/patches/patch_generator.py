from __future__ import annotations

import re
from typing import Any

_SUPPORTED_EXTENSIONS = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".json": "json",
    ".txt": "text",
    ".md": "markdown",
}


def _text(value: Any) -> str:
    return str(value or "").strip()


def _category(finding: dict) -> str:
    return _text(finding.get("category")).lower()


def _title(finding: dict) -> str:
    return _text(finding.get("title"))


def _finding_id(finding: dict, index: int) -> str:
    return _text(finding.get("id")) or f"finding_{index + 1:03d}"


def _file(finding: dict) -> str:
    return _text(finding.get("file")) or "project file"


def _extension(path: str) -> str:
    if "." not in path:
        return ""
    return "." + path.rsplit(".", 1)[-1].lower()


def _language(path: str) -> str:
    return _SUPPORTED_EXTENSIONS.get(_extension(path), "text")


def _evidence(finding: dict) -> str:
    return _text(finding.get("evidence"))


def _severity(finding: dict) -> str:
    return _text(finding.get("severity") or "medium").lower()


def _safe_slug(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "patch"


def _patch_filename(finding: dict, index: int, patch_type: str) -> str:
    finding_id = _finding_id(finding, index)
    return f"{_safe_slug(finding_id)}-{_safe_slug(patch_type)}.patch"


def _line(finding: dict) -> int | None:
    try:
        line = int(finding.get("line") or 0)
    except (TypeError, ValueError):
        return None
    return line if line > 0 else None


def _patch_base(finding: dict, index: int, *, title: str, patch_type: str, before: str, after: str, diff: str, explanation: str, confidence: str = "medium") -> dict:
    return {
        "finding_id": _finding_id(finding, index),
        "title": title,
        "file": _file(finding),
        "line": _line(finding),
        "language": _language(_file(finding)),
        "patch_type": patch_type,
        "patch_filename": _patch_filename(finding, index, patch_type),
        "copy_label": "Copy patch preview",
        "download_label": "Download .patch",
        "before": before,
        "after": after,
        "diff": diff,
        "explanation": explanation,
        "confidence": confidence,
        "manual_review_required": True,
        "apply_strategy": "preview_only",
        "review_notes": [
            "This is a generated patch preview, not an automatic code modification.",
            "Review surrounding code, imports, tests, and runtime configuration before applying.",
        ],
    }


def _secret_name(finding: dict) -> str:
    combined = f"{_title(finding)}\n{_evidence(finding)}".upper()
    for candidate in ("OPENAI_API_KEY", "GEMINI_API_KEY", "ANTHROPIC_API_KEY", "JWT_SECRET", "SECRET_KEY", "API_KEY", "TOKEN"):
        if candidate in combined:
            return candidate
    var_match = re.search(r"\b([A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD))\b", combined)
    if var_match:
        return var_match.group(1)
    return "API_KEY"


def _secret_patch(finding: dict, index: int) -> dict:
    evidence = _evidence(finding) or 'API_KEY = "replace-me"'
    key_name = _secret_name(finding)
    path = _file(finding)
    lang = _language(path)

    if lang == "python":
        after = f'{key_name} = os.getenv("{key_name}")\nif not {key_name}:\n    raise RuntimeError("{key_name} is not configured")'
        diff = f"- {evidence}\n+ {key_name} = os.getenv(\"{key_name}\")\n+ if not {key_name}:\n+     raise RuntimeError(\"{key_name} is not configured\")"
        import_note = "Add `import os` at the top of the file if it is not already present."
    elif lang in {"javascript", "typescript"}:
        after = f'const {key_name} = process.env.{key_name};\nif (!{key_name}) throw new Error("{key_name} is not configured");'
        diff = f"- {evidence}\n+ const {key_name} = process.env.{key_name};\n+ if (!{key_name}) throw new Error(\"{key_name} is not configured\");"
        import_note = "Make sure the deployment environment defines this variable."
    else:
        after = f"Move `{key_name}` to the runtime environment or secret manager and remove the literal value from this file."
        diff = f"- {evidence}\n+ <load {key_name} from environment or secret manager>"
        import_note = "Non-code file detected; apply the equivalent config change manually."

    patch = _patch_base(
        finding,
        index,
        title=f"Move {key_name} to environment configuration",
        patch_type="env_secret_fix",
        before=evidence,
        after=after,
        diff=diff,
        explanation="Moves the secret out of committed source and fails safely when runtime configuration is missing.",
        confidence="medium",
    )
    patch["review_notes"].append(import_note)
    patch["review_notes"].append("Rotate the exposed secret; moving it after exposure is not enough.")
    return patch


def _tool_name(finding: dict) -> str:
    combined = f"{_title(finding)}\n{_evidence(finding)}"
    match = re.search(r"(?:def|function)\s+([a-zA-Z_][\w]*)", combined)
    if match:
        return match.group(1)
    match = re.search(r"['\"]([a-zA-Z_][\w]*)['\"]", combined)
    if match:
        return match.group(1)
    for hint in ("refund", "delete", "email", "shell", "execute", "customer", "payment", "database", "file"):
        if hint in combined.lower():
            return hint
    return "sensitive_tool_call"


def _approval_patch(finding: dict, index: int) -> dict:
    before = _evidence(finding) or "result = risky_tool_call(payload)"
    tool = _tool_name(finding)
    after = (
        f"approval = require_human_approval(action='{tool}', payload=payload)\n"
        "if not approval.approved:\n"
        "    raise PermissionError('Human approval required before this action')\n"
        f"result = {tool}(payload)"
    )
    diff = (
        f"- {before}\n"
        f"+ approval = require_human_approval(action='{tool}', payload=payload)\n"
        "+ if not approval.approved:\n"
        "+     raise PermissionError('Human approval required before this action')\n"
        f"+ result = {tool}(payload)"
    )
    return _patch_base(
        finding,
        index,
        title=f"Add human approval before `{tool}`",
        patch_type="human_approval_wrapper",
        before=before,
        after=after,
        diff=diff,
        explanation="Routes the risky action through an explicit human approval checkpoint before execution.",
        confidence="medium",
    )


def _audit_patch(finding: dict, index: int) -> dict:
    before = _evidence(finding) or "result = tool_call(payload)"
    tool = _tool_name(finding)
    after = (
        f"audit_log(event='tool_call_started', tool='{tool}', payload=redact(payload))\n"
        f"result = {tool}(payload)\n"
        f"audit_log(event='tool_call_completed', tool='{tool}', status='success')"
    )
    diff = (
        f"+ audit_log(event='tool_call_started', tool='{tool}', payload=redact(payload))\n"
        f"  {before}\n"
        f"+ audit_log(event='tool_call_completed', tool='{tool}', status='success')"
    )
    patch = _patch_base(
        finding,
        index,
        title=f"Add audit logging around `{tool}`",
        patch_type="audit_logging_addition",
        before=before,
        after=after,
        diff=diff,
        explanation="Adds traceability before and after the agent calls a critical tool.",
        confidence="medium",
    )
    patch["review_notes"].append("Redact secrets and PII before logging arguments.")
    return patch


def _pii_patch(finding: dict, index: int) -> dict:
    before = _evidence(finding) or "return customer_record"
    after = "safe_record = mask_sensitive_fields(customer_record, fields=['email', 'phone', 'address', 'token'])\nreturn safe_record"
    return _patch_base(
        finding,
        index,
        title="Mask sensitive fields before agent response",
        patch_type="pii_masking_helper",
        before=before,
        after=after,
        diff=f"- {before}\n+ safe_record = mask_sensitive_fields(customer_record, fields=['email', 'phone', 'address', 'token'])\n+ return safe_record",
        explanation="Reduces data exposure by masking sensitive customer fields before they reach the agent response.",
        confidence="medium",
    )


def _prompt_patch(finding: dict, index: int) -> dict:
    before = _evidence(finding) or "prompt = system_prompt + user_input"
    path = _file(finding)
    if _extension(path) == ".txt":
        after = "Load the system prompt from a protected runtime location and add prompt-injection tests for this prompt."
        diff = f"- committed prompt text in {path}\n+ runtime-loaded prompt with adversarial prompt tests"
        explanation = "A committed prompt file cannot be safely fixed by changing one line. Move it out of source or treat it as public and harden it accordingly."
        confidence = "low"
    else:
        after = "safe_user_input = sanitize_agent_input(user_input)\nprompt = f\"{system_prompt}\\n\\nUser request, treated as data only:\\n{safe_user_input}\""
        diff = f"- {before}\n+ safe_user_input = sanitize_agent_input(user_input)\n+ prompt = f\"{{system_prompt}}\\n\\nUser request, treated as data only:\\n{{safe_user_input}}\""
        explanation = "Separates system instructions from user-controlled text and treats user input as data."
        confidence = "medium"

    return _patch_base(
        finding,
        index,
        title="Add prompt boundary and input sanitization",
        patch_type="prompt_input_sanitization",
        before=before,
        after=after,
        diff=diff,
        explanation=explanation,
        confidence=confidence,
    )


def _tool_patch(finding: dict, index: int) -> dict:
    before = _evidence(finding) or "tools = [risky_tool]"
    tool = _tool_name(finding)
    after = f"tools = [scope_tool({tool}, allowed_actions=['read'], requires_approval=True, audit=True)]"
    return _patch_base(
        finding,
        index,
        title=f"Scope `{tool}` permissions",
        patch_type="tool_scope_guard",
        before=before,
        after=after,
        diff=f"- {before}\n+ {after}",
        explanation="Narrows the exposed tool capability, requires approval for high-impact use, and marks the call for audit logging.",
        confidence="low",
    )


def _patch_for_finding(finding: dict, index: int) -> dict | None:
    category = _category(finding)
    title = _title(finding).lower()
    if "secret" in category or "api key" in title or "token" in title:
        return _secret_patch(finding, index)
    if "human approval" in category or "approval" in title:
        return _approval_patch(finding, index)
    if "auditability" in category or "log" in title:
        return _audit_patch(finding, index)
    if "data exposure" in category or "pii" in title or "customer" in title:
        return _pii_patch(finding, index)
    if "prompt injection" in category or "prompt" in title:
        return _prompt_patch(finding, index)
    if "tool permission" in category or "tool" in title:
        return _tool_patch(finding, index)
    return None


def build_patch_previews(findings: list[dict], limit: int = 8) -> list[dict]:
    """Return safe developer-review patch previews linked to scanner findings."""
    patches: list[dict] = []
    for index, finding in enumerate(findings):
        patch = _patch_for_finding(finding, index)
        if patch:
            patches.append(patch)
        if len(patches) >= limit:
            break
    return patches
