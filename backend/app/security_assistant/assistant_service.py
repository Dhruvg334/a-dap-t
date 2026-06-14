import logging
import re

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
    "category", "dashboard", "deploy", "deployment",
]


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
            return "DAP is temporarily unavailable because the AI provider is not configured."

        try:
            response_text = self.gemini_service.generate_text(
                prompt=build_assistant_user_prompt(question, scan_result),
                system_instruction=SECURITY_ASSISTANT_SYSTEM_INSTRUCTION,
            )
            return _clean_answer(response_text) if response_text else "DAP is temporarily unavailable."

        except Exception as exc:
            logger.error(f"Error in SecurityAssistantService: {str(exc)}")
            return "DAP is temporarily unavailable."
