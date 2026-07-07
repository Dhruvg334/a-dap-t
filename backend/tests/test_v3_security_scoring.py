from app.risk.v3_scoring import compute_v3_security_posture
from app.services.scan_pipeline import build_scan_result


def test_v3_security_score_penalizes_new_security_artifacts():
    report = {
        "safety_score": 96,
        "dependency_risks": {"summary": {"risky_dependencies": 4}},
        "api_surface": {"summary": {"severity_counts": {"Critical": 1, "High": 1, "Medium": 1}}},
        "context_poisoning_risks": {"summary": {"severity_counts": {"High": 1}}},
        "appsec_risks": {"summary": {"severity_counts": {"Critical": 1}}},
        "capability_map": {"summary": {"risk_counts": {"critical": 1, "high": 2}, "approval_missing_count": 3}},
        "trust_boundaries": {"summary": {"weak_boundaries": 6}},
        "guardrail_matrix": {"controls": [{"status": "weak", "risk_level": "high", "risk_instances": 2}]},
    }

    score = compute_v3_security_posture(report)

    assert score["legacy_safety_score"] == 96
    assert score["v3_security_score"] < 96
    assert score["total_penalty"] > 0
    assert score["top_penalties"]


def test_demo_v3_scores_create_clear_gap_between_fixtures():
    vulnerable = build_scan_result("../sample_agents/vulnerable-support-agent", "vulnerable-support-agent", "demo_vulnerable", enrich=False)
    secured = build_scan_result("../sample_agents/secured-support-agent", "secured-support-agent", "demo_secured", enrich=False)

    assert vulnerable["v3_security_score"] <= 25
    assert vulnerable["policy_evaluation"]["decision"] == "BLOCK"
    assert secured["v3_security_score"] >= 75
    assert secured["v3_security_score"] > vulnerable["v3_security_score"]
    assert secured["api_surface"]["summary"]["risk_count"] == 0
    assert secured["appsec_risks"]["summary"]["risk_count"] == 0
