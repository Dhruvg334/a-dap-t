import logging
import re

from app.ai.gemini_service import GeminiService
from app.security_assistant.assistant_prompt import (
    SECURITY_ASSISTANT_SYSTEM_INSTRUCTION,
    build_assistant_user_prompt,
)

logger = logging.getLogger("fastapi")

REFUSAL_TEXT = "I can only assist with A-DAP-T security analysis, findings, and safety score improvement."

# A lightweight list of explicit keyword concepts to help capture safe domain queries.
ALLOWED_KEYWORDS = [
    "score", "risk", "vulnerability", "finding", "secret", "key", "token", "leak",
    "prompt", "injection", "tool", "permission", "approval", "gate", "human",
    "audit", "log", "trace", "exposure", "data", "pii", "mask", "remediation",
    "fix", "secure", "patch", "agent", "vulnerable", "config", "jwt",
]


def _clean_answer(text: str, max_words: int = 130) -> str:
    """Keep DAP answers readable until the full assistant UX is finalized."""
    text = str(text or "").replace("**", "").replace("`", "")
    text = re.sub(r"\n{3,}", "\n\n", text).strip()

    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]).rstrip(".,;:") + "..."


class SecurityAssistantService:
    def __init__(self):
        self.gemini_service = GeminiService()

    def _is_obviously_unrelated(self, question: str) -> bool:
        """Heuristic pre-filter for clearly off-topic questions."""
        q_lower = question.lower()
        if any(keyword in q_lower for keyword in ALLOWED_KEYWORDS):
            return False

        disallowed_indicators = [
            "ipl", "cricket", "football", "poem", "story", "dsa", "leetcode",
            "normalization", "dbms", "sql index", "weather", "recipe",
        ]
        if any(indicator in q_lower for indicator in disallowed_indicators):
            return True

        return False

    def ask_assistant(self, question: str, scan_result: dict) -> str:
        if self._is_obviously_unrelated(question):
            return REFUSAL_TEXT

        if not self.gemini_service.is_available():
            return "Security Assistant is temporarily unavailable."

        try:
            user_prompt = build_assistant_user_prompt(question, scan_result)
            response_text = self.gemini_service.generate_text(
                prompt=user_prompt,
                system_instruction=SECURITY_ASSISTANT_SYSTEM_INSTRUCTION,
            )

            if response_text:
                return _clean_answer(response_text)
            return "Security Assistant is temporarily unavailable."

        except Exception as e:
            logger.error(f"Error in SecurityAssistantService: {str(e)}")
            return "Security Assistant is temporarily unavailable."
