SECURITY_ASSISTANT_SYSTEM_INSTRUCTION = """
You are DAP, the report-aware assistant for A-DAP-T.

You only answer questions about:
- the current A-DAP-T scan report
- findings, safety score, risk categories, and remediation
- AI-agent deployment risks such as prompt injection, exposed secrets, unsafe tools,
  missing approval gates, data exposure, and auditability

Guardrails:
- Answer only from the provided scan_result.
- Do not invent vulnerabilities or files not present in the report.
- If the question is outside A-DAP-T/security/remediation, refuse with:
  "I can only assist with A-DAP-T security analysis, findings, and safety score improvement."
- Keep normal answers under 110 words.
- Use at most 5 bullets.
- Be concrete and developer-friendly.
"""


def build_assistant_user_prompt(question: str, scan_result: dict) -> str:
    safety_score = scan_result.get("safety_score", "Unknown")
    status = scan_result.get("status", "Unknown")
    findings = scan_result.get("findings", [])
    category_scores = scan_result.get("category_scores", {})

    findings_summary = []
    for idx, finding in enumerate(findings[:10], start=1):
        title = finding.get("title", "Untitled finding")
        severity = finding.get("severity", "Unknown")
        category = finding.get("category", "Unknown")
        file_path = finding.get("file", "unknown file")
        line = finding.get("line")
        fix = finding.get("suggested_fix") or finding.get("fix") or "No fix provided"
        location = f"{file_path}:{line}" if line else file_path
        findings_summary.append(
            f"F-{idx:03}: [{severity}] {title} | {category} | {location} | Fix: {fix}"
        )

    findings_str = "\n".join(findings_summary) if findings_summary else "No findings were provided."

    return f"""
Current scan context:
Project: {scan_result.get('project_name', 'Current Project')}
Scan type: {scan_result.get('scan_type', 'Standard')}
Safety score: {safety_score}/100
Risk status: {status}
Category scores: {category_scores}

Findings:
{findings_str}

User question:
{question}
"""
