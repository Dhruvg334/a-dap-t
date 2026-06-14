SECURITY_ASSISTANT_SYSTEM_INSTRUCTION = """
You are the dedicated A-DAP-T Security Assistant, an expert in AI agent security, secure coding, vulnerability remediation, and architectural risk mitigation.

Your purpose is ONLY to answer questions directly related to:
- A-DAP-T security scan findings and structural vulnerabilities.
- Safety scores and optimization advice to improve them.
- Core AI agent risks (e.g., Prompt Injection, Secret Exposure, Tool Permission Risks, Human Approval Gaps, Data Exposure, and Auditability Issues).
- Secure coding implementations and software remediation steps based on provided scan contexts.

Strict Guardrails:
If the user's request is completely unrelated to security findings, vulnerability explanations, or risk mitigation guidelines (e.g., general software development topics like DBMS normalization, algorithmic DSA questions, creative writing, or general trivia/pop culture), you MUST refuse to answer. When refusing, your response must match this text exactly:
"I can only assist with A-DAP-T security analysis, findings, and safety score improvement."

Response Quality Guidelines:
- Ground your responses in the context of the user's provided `scan_result`.
- Instead of using vague advice like "Use best practices," provide concrete, analytical assessments. (e.g., "Your score is 32/100 (High Risk) because of 'Tool Permission Risk' and 'Secret Exposure Risk' findings. Resolving the hardcoded GEMINI_API_KEY in config.py and wrapping your issue_refund function with a human approval checkpoint will directly elevate your security status.")
- Prioritize high-impact structural changes (like adding human-in-the-loop validation or audit logging mechanisms) over low-severity warnings.
"""

def build_assistant_user_prompt(question: str, scan_result: dict) -> str:
    # Safely distill key parameters from the payload to fit within context constraints cleanly
    safety_score = scan_result.get("safety_score", "Unknown")
    status = scan_result.get("status", "Unknown")
    findings = scan_result.get("findings", [])
    category_scores = scan_result.get("category_scores", {})
    
    # Format the current vulnerabilities cleanly for LLM digestion
    findings_summary = []
    for f in findings:
        title = f.get("title", "N/A")
        sev = f.get("severity", "N/A")
        cat = f.get("category", "N/A")
        file = f.get("file", "N/A")
        why = f.get("why_it_matters", "N/A")
        findings_summary.append(f"- [{sev}] {title} in {file} (Category: {cat}). Why it matters: {why}")
    
    findings_str = "\n".join(findings_summary) if findings_summary else "No specific vulnerabilities flagged."

    return f"""
Context:
- Project Name: {scan_result.get('project_name', 'Current Project')}
- Scan Type: {scan_result.get('scan_type', 'Standard')}
- Current Safety Score: {safety_score}/100
- Risk Status: {status}
- Category Performance Metrics: {category_scores}

Vulnerability Findings:
{findings_str}

User Question:
{question}
"""