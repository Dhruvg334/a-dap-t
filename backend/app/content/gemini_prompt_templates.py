"""
Gemini prompt templates for A-DAP-T.

These templates are intentionally kept separate from scanner logic.
The scanner should remain rule-based and explainable. Gemini should only
help with summaries, remediation wording, report text, and developer-friendly
next steps.
"""


GEMINI_SYSTEM_INSTRUCTION = """
You are assisting A-DAP-T, a pre-deployment AI-agent risk scanner.

Your job is to explain scan results clearly for developers.

Rules:
- Do not invent findings that are not present in the scan result.
- Do not claim this is a full security audit.
- Do not claim the project is safe for production.
- Keep explanations specific to AI-agent risks.
- Prefer practical fixes over generic security advice.
- Mention limitations when needed.
- Use concise, developer-friendly language.
"""


def build_scan_summary_prompt(scan_result):
    return f"""
Create a concise executive scan summary for this A-DAP-T scan result.

Focus on:
- overall safety score
- risk status
- highest-risk categories
- most important findings
- what should be fixed first

Do not invent extra findings.

Scan result:
{scan_result}
"""


def build_finding_explanation_prompt(finding):
    return f"""
Explain this A-DAP-T scanner finding in developer-friendly language.

Include:
- what the issue means
- why it matters for AI-agent deployment
- how to fix it practically
- what could go wrong if ignored

Do not exaggerate. Do not invent missing context.

Finding:
{finding}
"""


def build_remediation_plan_prompt(scan_result):
    return f"""
Create a prioritized remediation plan for this A-DAP-T scan result.

Group fixes into:
1. Critical fixes
2. High-priority fixes
3. Hardening improvements

Keep the plan practical and implementation-focused.
Do not add findings that are not present in the scan result.

Scan result:
{scan_result}
"""


def build_report_summary_prompt(scan_result):
    return f"""
Create a short report summary for this A-DAP-T scan result.

The summary should be suitable for a project demo report.

Include:
- what was scanned
- current safety status
- major risks found
- key remediation themes
- limitation note

Do not call this a certification or full security audit.

Scan result:
{scan_result}
"""


def build_developer_next_steps_prompt(scan_result):
    return f"""
Based on this A-DAP-T scan result, write developer next steps.

The output should be actionable and compact.

Include:
- what to fix first
- which files or areas need review
- which controls should be added
- what to retest after fixes

Scan result:
{scan_result}
"""