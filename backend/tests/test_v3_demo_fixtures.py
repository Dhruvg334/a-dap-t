from app.services.scan_pipeline import build_scan_result


def test_vulnerable_demo_exercises_v3_security_surface():
    result = build_scan_result(
        "../sample_agents/vulnerable-support-agent",
        "vulnerable-support-agent",
        "demo_vulnerable",
        enrich=False,
    )

    assert result["schema_version"] == "3.0"
    assert result["safety_score"] <= 35
    assert result["policy_evaluation"]["decision"] == "BLOCK"
    assert result["dependency_risks"]["summary"]["risky_dependencies"] >= 5
    assert result["api_surface"]["summary"]["auth_missing"] >= 3
    assert result["api_surface"]["summary"]["rate_limit_missing"] >= 3
    assert result["context_poisoning_risks"]["summary"]["risk_count"] >= 3
    assert result["appsec_risks"]["summary"]["risk_count"] >= 5
    assert result["guardrail_matrix"]["summary"]["critical_control_gaps"] >= 3
    assert result["remedy_plan"]["summary"]["total_steps"] >= 5


def test_secured_demo_keeps_same_shape_with_lower_v3_risk():
    result = build_scan_result(
        "../sample_agents/secured-support-agent",
        "secured-support-agent",
        "demo_secured",
        enrich=False,
    )

    assert result["schema_version"] == "3.0"
    assert result["safety_score"] >= 90
    assert result["dependency_risks"]["summary"]["risky_dependencies"] == 0
    assert result["dependency_risks"]["summary"]["has_lockfiles"] is True
    assert result["api_surface"]["summary"]["auth_missing"] == 0
    assert result["api_surface"]["summary"]["rate_limit_missing"] == 0
    assert result["context_poisoning_risks"]["summary"]["risk_count"] == 0
    assert result["appsec_risks"]["summary"]["risk_count"] == 0
    assert result["policy_evaluation"]["decision"] in {"REVIEW", "ALLOW"}
