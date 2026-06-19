from app.deployment_gate.gate_policy import build_deployment_gate
from app.patches.patch_generator import build_patch_previews
from app.attack_simulator.simulator import build_attack_simulations


FINDINGS = [
    {
        "id": "secret_exposure_001",
        "title": "Hardcoded GEMINI_API_KEY detected",
        "severity": "Critical",
        "category": "Secret Exposure Risk",
        "file": "config.py",
        "line": 4,
        "evidence": 'GEMINI_API_KEY = "demo"',
        "suggested_fix": "Move it to an environment variable and rotate the exposed value.",
    },
    {
        "id": "tool_permission_001",
        "title": "Risky function 'send_refund' detected",
        "severity": "High",
        "category": "Tool Permission Risk",
        "file": "tools.py",
        "line": 10,
        "evidence": "def send_refund(order_id):",
        "suggested_fix": "Add approval before issuing refunds.",
    },
    {
        "id": "human_approval_001",
        "title": "Missing approval gate for send_refund",
        "severity": "High",
        "category": "Human Approval Risk",
        "file": "tools.py",
        "line": 10,
        "evidence": "def send_refund(order_id):",
        "suggested_fix": "Require human approval before refund execution.",
    },
]


def test_attack_simulations_are_linked_to_findings():
    simulations = build_attack_simulations(FINDINGS)

    assert simulations
    assert simulations[0]["finding_id"] == "secret_exposure_001"
    assert simulations[0]["simulation_type"] == "secret_reuse"
    assert simulations[0]["location"] == "config.py:4"
    assert simulations[0]["guardrail"]


def test_patch_previews_include_review_metadata():
    patches = build_patch_previews(FINDINGS)

    assert patches
    assert patches[0]["finding_id"] == "secret_exposure_001"
    assert patches[0]["patch_type"] == "env_secret_fix"
    assert patches[0]["apply_strategy"] == "preview_only"
    assert patches[0]["manual_review_required"] is True
    assert patches[0]["review_notes"]


def test_deployment_gate_blocks_unsafe_report_and_generates_workflow():
    gate = build_deployment_gate({"safety_score": 42, "findings": FINDINGS})

    assert gate["decision"] == "BLOCK"
    assert gate["blockers"]
    assert gate["workflow_filename"] == "adapt-agent-safety-gate.yml"
    assert "curl -sS -X POST" in gate["github_actions_yaml"]
    assert gate["category_blocker_counts"]["secret_exposure"] == 1
