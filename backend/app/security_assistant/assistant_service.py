import logging
import re
from typing import Any

from app.ai.gemini_service import GeminiService
from app.security_assistant.assistant_prompt import (
    SECURITY_ASSISTANT_SYSTEM_INSTRUCTION,
    build_assistant_user_prompt,
)

logger = logging.getLogger("fastapi")

REFUSAL_TEXT = "I can only assist with A-DAP-T security analysis, findings, and safety score improvement."

ALLOWED_KEYWORDS = [
    "score", "risk", "vulnerability", "finding", "secret", "key", "token", "leak",
    "prompt", "injection", "tool", "permission", "approval", "gate", "human",
    "audit", "log", "trace", "exposure", "data", "pii", "mask", "remediation",
    "fix", "secure", "patch", "agent", "vulnerable", "config", "jwt", "report",
    "category", "dashboard", "deploy", "deployment", "attack", "simulate", "simulation",
    "prove", "proof", "block", "allow", "review", "ci", "github action", "workflow",
    "yaml", "policy", "guardrail", "rescan", "re-scan", "delta", "improve",
]

SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


def _clean_answer(text: str, max_words: int = 110) -> str:
    text = str(text or "")
    text = text.replace("**", "").replace("`", "")
    text = re.sub(r"^\s*#+\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()

    words = text.split()
    if len(words) <= max_words:
        return text

    short = " ".join(words[:max_words]).rstrip(".,;:")
    return short if short.endswith((".", "!", "?")) else short + "."


def _lower(value: Any) -> str:
    return str(value or "").strip().lower()


def _short(value: Any, limit: int = 150) -> str:
    text = str(value or "").strip().replace("\n", " ")
    return text[:limit].rstrip()


def _finding_location(finding: dict) -> str:
    file_path = finding.get("file") or "unknown file"
    line = finding.get("line")
    return f"{file_path}:{line}" if line else str(file_path)


def _sort_findings(findings: list[dict]) -> list[dict]:
    return sorted(
        findings,
        key=lambda item: (
            SEVERITY_ORDER.get(_lower(item.get("severity")), 9),
            str(item.get("category") or ""),
            str(item.get("title") or ""),
        ),
    )


def _patches_by_finding(scan_result: dict) -> dict[str, dict]:
    patches = scan_result.get("patches") or []
    return {str(patch.get("finding_id")): patch for patch in patches if patch.get("finding_id")}


def _attacks_by_finding(scan_result: dict) -> dict[str, dict]:
    attacks = scan_result.get("attack_simulations") or []
    return {str(attack.get("finding_id")): attack for attack in attacks if attack.get("finding_id")}


def _top_fix_answer(scan_result: dict) -> str:
    findings = _sort_findings(scan_result.get("findings") or [])
    if not findings:
        return "This report has no findings to prioritize. Keep normal release checks, logging, and adversarial prompt tests in place."

    patches = _patches_by_finding(scan_result)
    attacks = _attacks_by_finding(scan_result)
    gate = scan_result.get("deployment_gate") or {}
    first = findings[0]
    finding_id = str(first.get("id") or "")
    patch = patches.get(finding_id)
    attack = attacks.get(finding_id)

    parts = [
        f"Fix first: {first.get('title', 'the top finding')} ({first.get('severity', 'unknown')}, {first.get('category', 'unknown')}) at {_finding_location(first)}.",
        f"Why: {_short(first.get('why_it_matters') or first.get('description'), 170)}",
    ]
    if attack:
        parts.append(f"Prove Mode: {_short(attack.get('attack_goal'), 160)}")
    if patch:
        parts.append(f"Patch preview: {patch.get('title', 'review generated patch')} ({patch.get('patch_type', 'patch_preview')}).")
    if gate.get("decision") == "BLOCK":
        parts.append(f"Gate: BLOCK — {_short(gate.get('decision_reason'), 150)}")
    return _clean_answer("\n".join(parts), max_words=105)


def _attack_answer(scan_result: dict) -> str:
    attacks = scan_result.get("attack_simulations") or []
    if not attacks:
        return "This report has no attack simulations yet. Re-run the scan after V2 proof outputs are enabled."

    attack = attacks[0]
    return _clean_answer(
        "\n".join(
            [
                f"Prove Mode: {attack.get('title', 'Attack simulation')}",
                f"Goal: {_short(attack.get('attack_goal'), 160)}",
                f"Test prompt: {_short(attack.get('malicious_input'), 180)}",
                f"Expected risk: {_short(attack.get('expected_behavior'), 180)}",
                f"Guardrail: {_short(attack.get('guardrail') or attack.get('required_fix'), 180)}",
            ]
        ),
        max_words=105,
    )


def _gate_answer(scan_result: dict) -> str:
    gate = scan_result.get("deployment_gate") or {}
    if not gate:
        return "This report has no deployment gate result yet. Re-run the scan after V2 gate output is enabled."

    blockers = gate.get("blockers") or []
    blocker_text = "; ".join(blockers[:3]) if blockers else "No configured blockers were found."
    return _clean_answer(
        "\n".join(
            [
                f"Deployment decision: {gate.get('decision', 'Unknown')}.",
                f"Reason: {_short(gate.get('decision_reason') or gate.get('summary'), 180)}",
                f"Required action: {_short(gate.get('required_action'), 160)}",
                f"Blockers: {_short(blocker_text, 220)}",
                f"CI file: {gate.get('workflow_filename', 'adapt-agent-safety-gate.yml')}",
            ]
        ),
        max_words=105,
    )


def _patch_answer(scan_result: dict) -> str:
    patches = scan_result.get("patches") or []
    if not patches:
        return "This report has no patch previews yet. Use the finding suggested fixes or re-run the scan after V2 patch output is enabled."

    patch = patches[0]
    notes = "; ".join(patch.get("review_notes") or [])
    return _clean_answer(
        "\n".join(
            [
                f"Suggested patch: {patch.get('title', 'Patch preview')}.",
                f"Type: {patch.get('patch_type', 'patch_preview')} for {patch.get('file', 'unknown file')}.",
                f"Strategy: {patch.get('apply_strategy', 'preview_only')}; manual review required: {patch.get('manual_review_required', True)}.",
                f"Why: {_short(patch.get('explanation'), 180)}",
                f"Review notes: {_short(notes, 180)}",
            ]
        ),
        max_words=105,
    )


def _overview_answer(scan_result: dict) -> str:
    findings = _sort_findings(scan_result.get("findings") or [])
    gate = scan_result.get("deployment_gate") or {}
    score = scan_result.get("safety_score", "unknown")
    status = scan_result.get("status", "unknown")
    top = findings[0] if findings else None
    top_text = f"Top issue: {top.get('title')} ({top.get('severity')}) at {_finding_location(top)}." if top else "No findings were provided."
    gate_text = f"Deployment gate: {gate.get('decision')} — {_short(gate.get('decision_reason'), 140)}" if gate else "Deployment gate output is not available."
    return _clean_answer(f"Score: {score}/100 ({status}). {top_text} {gate_text}", max_words=90)


def _build_local_answer(question: str, scan_result: dict) -> str:
    q = _lower(question)
    if any(word in q for word in ["deploy", "deployment", "gate", "block", "allow", "ci", "workflow", "yaml", "policy"]):
        return _gate_answer(scan_result)
    if any(word in q for word in ["attack", "simulate", "simulation", "prove", "proof", "malicious"]):
        return _attack_answer(scan_result)
    if any(word in q for word in ["patch", "fix", "remediate", "code change", "suggested"]):
        return _top_fix_answer(scan_result)
    return _overview_answer(scan_result)


class SecurityAssistantService:
    def __init__(self):
        self.gemini_service = GeminiService()

    def _is_obviously_unrelated(self, question: str) -> bool:
        q_lower = question.lower()
        if any(keyword in q_lower for keyword in ALLOWED_KEYWORDS):
            return False

        disallowed_indicators = [
            "ipl", "cricket", "football", "poem", "story", "dsa", "leetcode",
            "normalization", "dbms", "sql index", "weather", "recipe",
        ]
        return any(indicator in q_lower for indicator in disallowed_indicators)

    def ask_assistant(self, question: str, scan_result: dict) -> str:
        if self._is_obviously_unrelated(question):
            return REFUSAL_TEXT

        if not scan_result:
            return "Run or open a scan report first so I can answer from actual A-DAP-T findings."

        if not self.gemini_service.is_available():
            return _build_local_answer(question, scan_result)

        try:
            response_text = self.gemini_service.generate_text(
                prompt=build_assistant_user_prompt(question, scan_result),
                system_instruction=SECURITY_ASSISTANT_SYSTEM_INSTRUCTION,
            )
            return _clean_answer(response_text) if response_text else _build_local_answer(question, scan_result)

        except Exception as exc:
            logger.error(f"Error in SecurityAssistantService: {str(exc)}")
            return _build_local_answer(question, scan_result)
