SECURITY_ASSISTANT_SYSTEM_INSTRUCTION = """
You are DAP, the report-aware assistant for A-DAP-T.

You only answer questions about:
- the current A-DAP-T scan report
- findings, safety score, risk categories, and remediation
- attack simulations / Prove Mode
- patch previews and developer fix guidance
- deployment gate decisions, blockers, and CI policy
- AI-agent deployment risks such as prompt injection, exposed secrets, unsafe tools,
  missing approval gates, data exposure, and auditability

Guardrails:
- Answer only from the provided scan_result.
- Do not invent vulnerabilities, files, patches, attack paths, or deployment blockers.
- Prefer the report's deterministic findings, attack_simulations, patches, and deployment_gate.
- If the question is outside A-DAP-T/security/remediation, refuse with:
  "I can only assist with A-DAP-T security analysis, findings, and safety score improvement."
- Keep normal answers under 110 words.
- Use at most 5 bullets.
- Be concrete and developer-friendly.
"""


def _short(value, limit: int = 220) -> str:
    text = str(value or "").strip().replace("\n", " ")
    return text[:limit].rstrip()


def build_assistant_user_prompt(question: str, scan_result: dict) -> str:
    safety_score = scan_result.get("safety_score", "Unknown")
    status = scan_result.get("status", "Unknown")
    findings = scan_result.get("findings", []) or []
    category_scores = scan_result.get("category_scores", {}) or {}
    attack_simulations = scan_result.get("attack_simulations", []) or []
    patches = scan_result.get("patches", []) or []
    deployment_gate = scan_result.get("deployment_gate") or {}

    findings_summary = []
    for idx, finding in enumerate(findings[:10], start=1):
        finding_id = finding.get("id") or f"finding_{idx:03d}"
        title = finding.get("title", "Untitled finding")
        severity = finding.get("severity", "Unknown")
        category = finding.get("category", "Unknown")
        file_path = finding.get("file", "unknown file")
        line = finding.get("line")
        fix = finding.get("suggested_fix") or finding.get("fix") or "No fix provided"
        evidence = _short(finding.get("evidence"), 140)
        location = f"{file_path}:{line}" if line else file_path
        findings_summary.append(
            f"{finding_id}: [{severity}] {title} | {category} | {location} | Evidence: {evidence or 'n/a'} | Fix: {fix}"
        )

    attack_summary = []
    for attack in attack_simulations[:6]:
        attack_summary.append(
            " | ".join(
                [
                    f"Finding: {attack.get('finding_id', 'unknown')}",
                    f"Type: {attack.get('simulation_type', 'attack_simulation')}",
                    f"Goal: {_short(attack.get('attack_goal'), 150)}",
                    f"Prompt: {_short(attack.get('malicious_input'), 150)}",
                    f"Guardrail: {_short(attack.get('guardrail') or attack.get('required_fix'), 150)}",
                ]
            )
        )

    patch_summary = []
    for patch in patches[:6]:
        patch_summary.append(
            " | ".join(
                [
                    f"Finding: {patch.get('finding_id', 'unknown')}",
                    f"Patch: {patch.get('patch_type', 'patch_preview')}",
                    f"Title: {_short(patch.get('title'), 120)}",
                    f"Strategy: {patch.get('apply_strategy', 'preview_only')}",
                    f"Review: {_short('; '.join(patch.get('review_notes') or []), 160)}",
                ]
            )
        )

    gate_summary = "No deployment gate output was provided."
    if deployment_gate:
        gate_summary = " | ".join(
            [
                f"Decision: {deployment_gate.get('decision', 'Unknown')}",
                f"Summary: {_short(deployment_gate.get('summary'), 180)}",
                f"Reason: {_short(deployment_gate.get('decision_reason'), 180)}",
                f"Action: {_short(deployment_gate.get('required_action'), 180)}",
                f"Blockers: {_short('; '.join(deployment_gate.get('blockers') or []), 220)}",
            ]
        )

    findings_str = "\n".join(findings_summary) if findings_summary else "No findings were provided."
    attacks_str = "\n".join(attack_summary) if attack_summary else "No attack simulations were provided."
    patches_str = "\n".join(patch_summary) if patch_summary else "No patch previews were provided."

    return f"""
Current scan context:
Project: {scan_result.get('project_name', 'Current Project')}
Scan type: {scan_result.get('scan_type', 'Standard')}
Safety score: {safety_score}/100
Risk status: {status}
Category scores: {category_scores}

Deployment gate:
{gate_summary}

Findings:
{findings_str}

Attack simulations / Prove Mode:
{attacks_str}

Patch previews:
{patches_str}

User question:
{question}
"""
