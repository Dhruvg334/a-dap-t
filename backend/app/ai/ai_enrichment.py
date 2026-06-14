import re
from typing import Any, Dict, List

from app.ai.gemini_service import GeminiService
from app.content.gemini_prompt_templates import (
    GEMINI_SYSTEM_INSTRUCTION,
    build_scan_summary_prompt,
    build_remediation_plan_prompt,
    build_report_summary_prompt,
    build_developer_next_steps_prompt,
)

MAX_SUMMARY_SENTENCES = 2
MAX_SUMMARY_WORDS = 46
MAX_BULLETS = 5
MAX_BULLET_WORDS = 18


_LIST_MARKER_RE = re.compile(r"^\s*(?:[-*•]|\d+[.)])\s+")
_HEADING_RE = re.compile(r"^\s*(?:critical fixes|high-priority fixes|hardening improvements|next steps|remediation plan|summary)\s*:?", re.I)


def _clean_text(value: Any) -> str:
    text = str(value or "")
    text = text.replace("**", "")
    text = text.replace("`", "")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _word_limit(text: str, max_words: int) -> str:
    words = _clean_text(text).split()
    if len(words) <= max_words:
        return " ".join(words)
    return " ".join(words[:max_words]).rstrip(".,;:") + "..."


def _split_sentences(text: str) -> List[str]:
    text = _clean_text(text)
    if not text:
        return []

    parts = re.split(r"(?<=[.!?])\s+", text)
    return [part.strip() for part in parts if part.strip()]


def _compact_sentences(text: str, max_sentences: int = MAX_SUMMARY_SENTENCES, max_words: int = MAX_SUMMARY_WORDS) -> str:
    sentences = _split_sentences(text)
    if not sentences:
        return ""

    compact = " ".join(sentences[:max_sentences])
    return _word_limit(compact, max_words)


def _normalise_bullet(text: str) -> str:
    text = _LIST_MARKER_RE.sub("", str(text or "")).strip()
    text = _HEADING_RE.sub("", text).strip(" -–—:\t")
    return _word_limit(text, MAX_BULLET_WORDS)


def _text_to_bullets(value: Any, max_items: int = MAX_BULLETS) -> List[str]:
    if not value:
        return []

    if isinstance(value, list):
        raw_items = value
    else:
        text = str(value).replace("\r", "\n")
        lines = [line.strip() for line in text.splitlines() if line.strip()]

        marked_lines = [line for line in lines if _LIST_MARKER_RE.match(line)]
        if marked_lines:
            raw_items = marked_lines
        else:
            # Gemini sometimes returns one paragraph. Split it into actionable chunks instead
            # of dumping the paragraph into one layout-breaking bullet.
            raw_items = re.split(r"(?<=[.!?])\s+", _clean_text(text))

    bullets: List[str] = []
    seen = set()

    for item in raw_items:
        bullet = _normalise_bullet(item)
        if not bullet or len(bullet) < 3:
            continue
        key = bullet.lower()
        if key in seen:
            continue
        bullets.append(bullet)
        seen.add(key)
        if len(bullets) >= max_items:
            break

    return bullets


def _score_aware_summary(text: str, scan_result: Dict[str, Any]) -> str:
    score = scan_result.get("safety_score")
    status = scan_result.get("status")
    compact = _compact_sentences(text)

    if score is None or not status:
        return compact

    score_text = f"Safety score: {score}/100 ({status})."
    if compact and str(score) in compact:
        return compact
    if compact:
        return _compact_sentences(f"{score_text} {compact}")
    return score_text


def _fallback_ai_summary(scan_result: Dict[str, Any]) -> str:
    project_name = scan_result.get("project_name", "this project")
    score = scan_result.get("safety_score", "unknown")
    status = scan_result.get("status", "Unknown")

    findings = scan_result.get("findings", [])
    critical_count = sum(1 for item in findings if item.get("severity") == "Critical")
    high_count = sum(1 for item in findings if item.get("severity") == "High")

    return _score_aware_summary(
        f"A-DAP-T scanned {project_name} and found {critical_count} critical and {high_count} high-severity findings. "
        "Fix unsafe tools, exposed secrets, approval gaps, and auditability issues first.",
        {"safety_score": score, "status": status},
    )


def _fallback_remediation_plan(scan_result: Dict[str, Any]) -> List[str]:
    findings = scan_result.get("findings", [])

    priority_fixes = []
    for finding in findings:
        severity = finding.get("severity")
        fix = finding.get("suggested_fix")

        if severity in {"Critical", "High"} and fix and fix not in priority_fixes:
            priority_fixes.append(fix)

    if priority_fixes:
        return _text_to_bullets(priority_fixes)

    return _text_to_bullets(scan_result.get("remediation_checklist", []))


def _fallback_report_summary(scan_result: Dict[str, Any]) -> str:
    project_name = scan_result.get("project_name", "this project")
    status = scan_result.get("status", "Unknown")
    score = scan_result.get("safety_score", "unknown")

    return _score_aware_summary(
        f"{project_name} was scanned using A-DAP-T's rule-based AI-agent checks. "
        "This highlights common deployment risks and is not a full security audit.",
        {"safety_score": score, "status": status},
    )


def _fallback_next_steps(scan_result: Dict[str, Any]) -> List[str]:
    findings = scan_result.get("findings", [])

    next_steps = []
    category_seen = set()

    for finding in findings:
        category = finding.get("category")
        fix = finding.get("suggested_fix")

        if category and fix and category not in category_seen:
            next_steps.append(fix)
            category_seen.add(category)

    if next_steps:
        return _text_to_bullets(next_steps)

    return [
        "Review high-risk tool access paths.",
        "Confirm approval gates for high-impact actions.",
        "Load secrets from environment variables.",
        "Verify audit logging for tool calls.",
        "Retest the project after fixes.",
    ]


def enrich_scan_result_with_ai(scan_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Add compact AI-generated explanation fields to a scan result.

    Scanner findings, scores, statuses, and category scores stay rule-based. Gemini only
    explains the final result, and this layer clamps the output so the frontend layout
    does not get wrecked by long paragraphs.
    """

    enriched_result = dict(scan_result)
    service = GeminiService()

    if not service.is_available():
        enriched_result["ai_summary"] = _fallback_ai_summary(scan_result)
        enriched_result["ai_remediation_plan"] = _fallback_remediation_plan(scan_result)
        enriched_result["ai_report_summary"] = _fallback_report_summary(scan_result)
        enriched_result["ai_next_steps"] = _fallback_next_steps(scan_result)
        enriched_result["ai_enrichment_status"] = "fallback_no_api_key"
        return enriched_result

    try:
        raw_summary = service.generate_text(
            build_scan_summary_prompt(scan_result),
            GEMINI_SYSTEM_INSTRUCTION,
        )
        enriched_result["ai_summary"] = _score_aware_summary(raw_summary, scan_result)

        remediation_text = service.generate_text(
            build_remediation_plan_prompt(scan_result),
            GEMINI_SYSTEM_INSTRUCTION,
        )
        enriched_result["ai_remediation_plan"] = _text_to_bullets(remediation_text)

        raw_report_summary = service.generate_text(
            build_report_summary_prompt(scan_result),
            GEMINI_SYSTEM_INSTRUCTION,
        )
        enriched_result["ai_report_summary"] = _score_aware_summary(raw_report_summary, scan_result)

        next_steps_text = service.generate_text(
            build_developer_next_steps_prompt(scan_result),
            GEMINI_SYSTEM_INSTRUCTION,
        )
        enriched_result["ai_next_steps"] = _text_to_bullets(next_steps_text)

        enriched_result["ai_enrichment_status"] = "gemini_success"
        return enriched_result

    except Exception as exc:
        enriched_result["ai_summary"] = _fallback_ai_summary(scan_result)
        enriched_result["ai_remediation_plan"] = _fallback_remediation_plan(scan_result)
        enriched_result["ai_report_summary"] = _fallback_report_summary(scan_result)
        enriched_result["ai_next_steps"] = _fallback_next_steps(scan_result)
        enriched_result["ai_enrichment_status"] = f"fallback_gemini_error: {str(exc)}"
        return enriched_result
