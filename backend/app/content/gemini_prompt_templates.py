"""
Gemini prompt templates for A-DAP-T.

The scanner remains rule-based. Gemini only turns the final scan result into
short developer-facing explanations.
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
- Keep all outputs compact enough for dashboard/report cards.
- Avoid heavy Markdown formatting unless specifically requested.
- Do not use tables.
"""


def build_scan_summary_prompt(scan_result):
    return f"""
Create a compact executive scan summary for this A-DAP-T scan result.

Hard output limits:
- Maximum 2 short sentences.
- Must mention the safety score and risk status.
- Mention only the top 1-2 risk themes.
- Do not include a long explanation.
- Do not invent extra findings.

Scan result:
{scan_result}
"""


def build_finding_explanation_prompt(finding):
    return f"""
Explain this A-DAP-T scanner finding in developer-friendly language.

Hard output limits:
- Maximum 3 short sentences.
- Explain what it means, why it matters, and the practical fix.
- Do not invent missing context.

Finding:
{finding}
"""


def build_remediation_plan_prompt(scan_result):
    return f"""
Create a prioritized remediation plan for this A-DAP-T scan result.

Hard output limits:
- Return only 5 bullets.
- Each bullet must be under 18 words.
- No headings, intro, outro, tables, or paragraphs.
- Prioritize Critical and High findings first.
- Do not add findings that are not present in the scan result.

Scan result:
{scan_result}
"""


def build_report_summary_prompt(scan_result):
    return f"""
Create a short report summary for this A-DAP-T scan result.

Hard output limits:
- Maximum 2 short sentences.
- Must mention what was scanned, safety score/status, and the main remediation theme.
- Do not call this a certification or full security audit.
- Do not include bullet lists.

Scan result:
{scan_result}
"""


def build_developer_next_steps_prompt(scan_result):
    return f"""
Based on this A-DAP-T scan result, write developer next steps.

Hard output limits:
- Return only 5 bullets.
- Each bullet must be under 18 words.
- No headings, intro, outro, tables, or paragraphs.
- Focus on what to fix and retest.

Scan result:
{scan_result}
"""
