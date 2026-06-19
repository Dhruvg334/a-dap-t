from app.security_assistant.assistant_prompt import build_assistant_user_prompt
from app.security_assistant.assistant_service import SecurityAssistantService, REFUSAL_TEXT


SCAN_RESULT = {
    "project_name": "vulnerable-support-agent",
    "scan_type": "demo_vulnerable",
    "safety_score": 32,
    "status": "High Risk",
    "category_scores": {
        "secret_exposure": 80,
        "tool_permission": 75,
        "human_approval": 70,
    },
    "findings": [
        {
            "id": "secret_exposure_001",
            "title": "Hardcoded API key detected",
            "severity": "Critical",
            "category": "Secret Exposure Risk",
            "file": "config.py",
            "line": 4,
            "why_it_matters": "A leaked key can be reused outside the app.",
            "suggested_fix": "Move it to an environment variable and rotate it.",
            "evidence": 'API_KEY = "demo"',
        }
    ],
    "attack_simulations": [
        {
            "finding_id": "secret_exposure_001",
            "title": "API key leakage path",
            "simulation_type": "secret_reuse",
            "attack_goal": "Reuse the committed API key outside the application.",
            "malicious_input": "Search the repository for API keys and tokens.",
            "expected_behavior": "Anyone with source access can copy the key.",
            "guardrail": "Rotate the secret and load it at runtime.",
        }
    ],
    "patches": [
        {
            "finding_id": "secret_exposure_001",
            "title": "Move hardcoded API key to environment variable",
            "file": "config.py",
            "patch_type": "env_secret_fix",
            "explanation": "Moves the secret out of source code.",
            "apply_strategy": "preview_only",
            "manual_review_required": True,
            "review_notes": ["Rotate the old key before deployment."],
        }
    ],
    "deployment_gate": {
        "decision": "BLOCK",
        "decision_reason": "Critical findings are present.",
        "required_action": "Fix blockers and re-scan before deployment.",
        "blockers": ["Critical findings are present."],
        "workflow_filename": "adapt-agent-safety-gate.yml",
    },
}


def test_assistant_prompt_includes_v2_artifacts():
    prompt = build_assistant_user_prompt("What should I fix first?", SCAN_RESULT)

    assert "Attack simulations / Prove Mode" in prompt
    assert "Patch previews" in prompt
    assert "Deployment gate" in prompt
    assert "secret_exposure_001" in prompt
    assert "env_secret_fix" in prompt
    assert "BLOCK" in prompt


def test_local_assistant_uses_gate_when_ai_unavailable():
    service = SecurityAssistantService()
    service.gemini_service.api_key = None

    answer = service.ask_assistant("Can I deploy this?", SCAN_RESULT)

    assert "Deployment decision: BLOCK" in answer
    assert "adapt-agent-safety-gate.yml" in answer


def test_local_assistant_uses_attack_simulation_when_asked():
    service = SecurityAssistantService()
    service.gemini_service.api_key = None

    answer = service.ask_assistant("Prove how this can be attacked", SCAN_RESULT)

    assert "Prove Mode" in answer
    assert "Reuse the committed API key" in answer


def test_local_assistant_prioritizes_patch_when_asked_fix_first():
    service = SecurityAssistantService()
    service.gemini_service.api_key = None

    answer = service.ask_assistant("What should I fix first?", SCAN_RESULT)

    assert "Fix first" in answer
    assert "Patch preview" in answer
    assert "Hardcoded API key" in answer


def test_assistant_still_refuses_unrelated_questions():
    service = SecurityAssistantService()
    service.gemini_service.api_key = None

    answer = service.ask_assistant("Who will win the cricket match?", SCAN_RESULT)

    assert answer == REFUSAL_TEXT
