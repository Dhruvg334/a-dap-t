import logging
from app.ai.gemini_service import GeminiService
from app.security_assistant.assistant_prompt import (
    SECURITY_ASSISTANT_SYSTEM_INSTRUCTION,
    build_assistant_user_prompt,
)

logger = logging.getLogger("fastapi")

# A lightweight list of explicit keyword concepts to help capture safe domain queries
ALLOWED_KEYWORDS = [
    "score", "risk", "vulnerability", "finding", "secret", "key", "token", "leak",
    "prompt", "injection", "tool", "permission", "approval", "gate", "human",
    "audit", "log", "trace", "exposure", "data", "pii", "mask", "remediation", 
    "fix", "secure", "patch", "agent", "vulnerable", "config", "jwt"
]

class SecurityAssistantService:
    def __init__(self):
        self.gemini_service = GeminiService()

    def _is_obviously_unrelated(self, question: str) -> bool:
        """Heuristic pre-filter check to enforce core security constraints."""
        q_lower = question.lower()
        # If any primary security concept keywords are found, pass it safely through to Gemini's system evaluation
        if any(keyword in q_lower for keyword in ALLOWED_KEYWORDS):
            return False
            
        # Common flag lists for disallowed categories
        disallowed_indicators = [
            "ipl", "cricket", "football", "poem", "story", "dsa", "leetcode", 
            "normalization", "dbms", "sql index", "weather", "recipe"
        ]
        if any(indicator in q_lower for indicator in disallowed_indicators):
            return True
            
        return False

    def ask_assistant(self, question: str, scan_result: dict) -> str:
        # 1. Guardrail Filter Check
        if self._is_obviously_unrelated(question):
            return "I can only assist with A-DAP-T security analysis, findings, and safety score improvement."

        # 2. Check Gemini Infrastructure readiness
        if not self.gemini_service.is_available():
            return "Security Assistant is temporarily unavailable."

        try:
            user_prompt = build_assistant_user_prompt(question, scan_result)
            
            # Reusing current Gemini implementation architecture
            response_text = self.gemini_service.generate_text(
                prompt=user_prompt,
                system_instruction=SECURITY_ASSISTANT_SYSTEM_INSTRUCTION
            )
            
            if response_text:
                return response_text.strip()
            return "Security Assistant is temporarily unavailable."

        except Exception as e:
            logger.error(f"Error in SecurityAssistantService: {str(e)}")
            return "Security Assistant is temporarily unavailable."