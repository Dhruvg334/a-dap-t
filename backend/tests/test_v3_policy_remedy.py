from app.policies import evaluate_policy_pack, get_policy_pack, list_policy_packs
from app.remedy import build_remedy_plan
from app.schemas.scan_schema import ScanResultSchema
from app.services.scan_pipeline import attach_v3_project_context


def _base_report():
    return {
        "project_name": "demo",
        "scan_type": "unit",
        "safety_score": 82,
        "status": "Medium Risk",
        "summary": {"critical": 0, "high": 0, "medium": 0, "low": 0},
        "category_scores": {
            "prompt_injection": 90,
            "secret_exposure": 90,
            "tool_permission": 80,
            "human_approval": 80,
            "data_exposure": 90,
            "auditability": 70,
        },
        "findings": [],
        "graph": {"nodes": [], "edges": []},
        "attack_replay": [],
        "remediation_checklist": [],
    }


def test_policy_pack_catalog_has_core_policies():
    policies = {item["policy_id"] for item in list_policy_packs()}
    assert "general_ai_app" in policies
    assert "agent_with_tools" in policies
    assert "ai_coding_agent" in policies
    assert get_policy_pack("missing")["policy_id"] == "general_ai_app"


def test_policy_evaluation_blocks_hard_control_gap():
    report = _base_report()
    report["guardrail_matrix"] = {
        "controls": [
            {
                "control_id": "human_approval",
                "label": "Human approval",
                "status": "weak",
                "coverage_percent": 0,
                "risk_instances": 2,
                "risk_level": "high",
                "recommended_action": "Add approval checks.",
            },
            {
                "control_id": "authentication",
                "label": "Authentication",
                "status": "strong",
                "coverage_percent": 100,
                "risk_instances": 0,
                "risk_level": "low",
            },
        ]
    }
    result = evaluate_policy_pack(report, "agent_with_tools")
    assert result["decision"] == "BLOCK"
    assert result["hard_blockers"]
    assert any(item["control_id"] == "human_approval" for item in result["hard_blockers"])


def test_policy_evaluation_reviews_missing_required_control():
    report = _base_report()
    report["guardrail_matrix"] = {
        "controls": [
            {
                "control_id": "audit_logging",
                "label": "Audit logging",
                "status": "weak",
                "coverage_percent": 20,
                "risk_instances": 1,
                "risk_level": "medium",
                "recommended_action": "Add logs.",
            }
        ]
    }
    result = evaluate_policy_pack(report, "general_ai_app")
    assert result["decision"] == "REVIEW"
    assert result["missing_required_controls"]


def test_remedy_plan_prioritizes_policy_blockers():
    report = _base_report()
    report["guardrail_matrix"] = {
        "controls": [
            {
                "control_id": "human_approval",
                "label": "Human approval",
                "status": "weak",
                "coverage_percent": 0,
                "risk_instances": 3,
                "risk_level": "high",
                "evidence": [{"file": "agent.py", "line": 8, "evidence": "def refund_user():"}],
                "recommended_action": "Add approval checks before refunds.",
                "related_artifacts": ["cap_refund"],
            },
            {
                "control_id": "dependency_security",
                "label": "Dependency security",
                "status": "weak",
                "coverage_percent": 40,
                "risk_instances": 1,
                "risk_level": "medium",
                "recommended_action": "Pin dependencies.",
            },
        ]
    }
    policy_eval = evaluate_policy_pack(report, "agent_with_tools")
    plan = build_remedy_plan(report, policy_eval)
    assert plan["steps"]
    assert plan["steps"][0]["control_id"] == "human_approval"
    assert plan["summary"]["total_steps"] >= 2
    assert plan["release_path"]


def test_attach_v3_context_adds_policy_and_remedy_plan():
    files = {
        "app.py": """
from fastapi import FastAPI
app = FastAPI()

@app.post('/refund')
def refund_user(customer_email: str):
    send_email(customer_email)
    return {'ok': True}
"""
    }
    result = attach_v3_project_context(_base_report(), files=files, project_name="demo", scan_type="unit")
    assert result["policy_evaluation"]
    assert result["remedy_plan"]
    ScanResultSchema(**result)
