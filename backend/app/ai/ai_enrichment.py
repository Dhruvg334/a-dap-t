from typing import Any, Dict, List

from app.ai.gemini_service import GeminiService
from app.content.gemini_prompt_templates import (
    GEMINI_SYSTEM_INSTRUCTION,
    build_scan_summary_prompt,
    build_remediation_plan_prompt,
    build_report_summary_prompt,
    build_developer_next_steps_prompt,
)


def _fallback_ai_summary(scan_result: Dict[str, Any]) -> str:
    project_name = scan_result.get("project_name", "this project")
    score = scan_result.get("safety_score", "unknown")
    status = scan_result.get("status", "Unknown")

    findings = scan_result.get("findings", [])
    critical_count = sum(1 for item in findings if item.get("severity") == "Critical")
    high_count = sum(1 for item in findings if item.get("severity") == "High")

    return (
        f"A-DAP-T scanned {project_name} and assigned a safety score of "
        f"{score}/100 with status '{status}'. The scan found {critical_count} "
        f"critical and {high_count} high-severity findings. Review the highest-risk "
        f"findings first, especially unsafe tools, exposed secrets, approval gaps, "
        f"and auditability issues."
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
        return priority_fixes[:6]

    return scan_result.get("remediation_checklist", [])[:6]


def _fallback_report_summary(scan_result: Dict[str, Any]) -> str:
    project_name = scan_result.get("project_name", "this project")
    status = scan_result.get("status", "Unknown")
    score = scan_result.get("safety_score", "unknown")

    return (
        f"{project_name} was scanned using A-DAP-T's rule-based AI-agent risk checks. "
        f"The current safety score is {score}/100 with status '{status}'. This scan "
        f"highlights common deployment risks but does not replace a full security audit."
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
        return next_steps[:5]

    return [
        "Review high-risk tool access paths.",
        "Confirm approval gates for high-impact actions.",
        "Check that secrets are loaded from environment variables.",
        "Verify audit logging for tool calls.",
        "Retest the project after fixes."
    ]


def enrich_scan_result_with_ai(scan_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Adds AI-generated explanation fields to a scan result.

    This function never changes scanner findings, score, status, or category scores.
    It only appends explanation fields.

    Added fields:
    - ai_summary
    - ai_remediation_plan
    - ai_report_summary
    - ai_next_steps
    - ai_enrichment_status
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
        enriched_result["ai_summary"] = service.generate_text(
            build_scan_summary_prompt(scan_result),
            GEMINI_SYSTEM_INSTRUCTION
        )

        remediation_text = service.generate_text(
            build_remediation_plan_prompt(scan_result),
            GEMINI_SYSTEM_INSTRUCTION
        )
        enriched_result["ai_remediation_plan"] = [
            line.strip("- ").strip()
            for line in remediation_text.splitlines()
            if line.strip()
        ][:8]

        enriched_result["ai_report_summary"] = service.generate_text(
            build_report_summary_prompt(scan_result),
            GEMINI_SYSTEM_INSTRUCTION
        )

        next_steps_text = service.generate_text(
            build_developer_next_steps_prompt(scan_result),
            GEMINI_SYSTEM_INSTRUCTION
        )
        enriched_result["ai_next_steps"] = [
            line.strip("- ").strip()
            for line in next_steps_text.splitlines()
            if line.strip()
        ][:8]

        enriched_result["ai_enrichment_status"] = "gemini_success"
        return enriched_result

    except Exception as exc:
        enriched_result["ai_summary"] = _fallback_ai_summary(scan_result)
        enriched_result["ai_remediation_plan"] = _fallback_remediation_plan(scan_result)
        enriched_result["ai_report_summary"] = _fallback_report_summary(scan_result)
        enriched_result["ai_next_steps"] = _fallback_next_steps(scan_result)
        enriched_result["ai_enrichment_status"] = f"fallback_gemini_error: {str(exc)}"
        return enriched_result