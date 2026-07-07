from app.capabilities import build_capability_map, build_trust_boundaries
from app.services.scan_pipeline import attach_v3_project_context
from app.schemas.scan_schema import ScanResultSchema


def test_capability_map_detects_privileged_function_and_missing_controls():
    files = {
        "agent/tools.py": """
def update_customer_profile(customer_email, address):
    db.collection('customers').document(customer_email).update({'address': address})
    return True
"""
    }

    report = build_capability_map(files)
    caps = report["capabilities"]

    assert report["summary"]["total_capabilities"] >= 1
    cap = next(c for c in caps if c["name"] == "update_customer_profile")
    assert cap["capability_type"] == "write_action"
    assert cap["risk_level"] == "high"
    assert cap["requires_approval"] is True
    assert "missing_human_approval" in cap["control_gaps"]
    assert "customer" in cap["data_touched"]


def test_capability_map_reduces_control_gaps_when_controls_are_visible():
    files = {
        "agent/tools.py": """
def update_customer_profile(customer_email, address, approval_id):
    require_approval(approval_id)
    audit_log('update_customer_profile', customer_email)
    db.collection('customers').document(customer_email).update({'address': address})
    return True
"""
    }

    report = build_capability_map(files)
    cap = next(c for c in report["capabilities"] if c["name"] == "update_customer_profile")

    assert cap["approval_found"] is True
    assert cap["audit_logging_found"] is True
    assert "missing_human_approval" not in cap["control_gaps"]
    assert "missing_audit_logging" not in cap["control_gaps"]


def test_capability_map_includes_api_and_appsec_capabilities():
    files = {"api.py": """subprocess.run(request.json.get('cmd'), shell=True)"""}
    api_surface = {
        "endpoints": [
            {
                "id": "api_1",
                "method": "POST",
                "path": "/assistant/chat",
                "framework": "fastapi",
                "file": "api.py",
                "line": 1,
                "auth_status": "missing",
                "rate_limit_status": "missing",
                "tags": ["llm_call", "mutation"],
                "evidence": "@app.post('/assistant/chat')",
            }
        ]
    }
    appsec_risks = {
        "risks": [
            {
                "id": "rce_1",
                "risk_type": "rce_or_command_execution",
                "title": "Command execution",
                "severity": "Critical",
                "file": "api.py",
                "line": 1,
                "sink": "subprocess.run",
                "evidence": "subprocess.run(request.json.get('cmd'), shell=True)",
                "missing_control": "command allowlist and sandboxing",
                "recommended_fix": "Remove dynamic command execution or sandbox it.",
            }
        ]
    }

    report = build_capability_map(files, api_surface=api_surface, appsec_risks=appsec_risks)
    types = {cap["capability_type"] for cap in report["capabilities"]}

    assert "api_endpoint" in types
    assert "code_execution" in types
    assert report["summary"]["external_effect_count"] >= 1


def test_trust_boundaries_use_api_capabilities_context_and_appsec_artifacts():
    capability_map = {
        "capabilities": [
            {
                "id": "cap_1",
                "label": "Update Customer Profile",
                "requires_approval": True,
                "external_effect": True,
                "control_gaps": ["missing_human_approval", "missing_audit_logging"],
                "risk_level": "high",
                "file": "agent/tools.py",
                "line": 3,
                "evidence": "def update_customer_profile(...):",
            }
        ]
    }
    api_surface = {
        "endpoints": [
            {
                "id": "api_1",
                "method": "POST",
                "path": "/scan/upload",
                "auth_status": "missing",
                "rate_limit_status": "missing",
                "risk_level": "high",
                "tags": ["mutation"],
                "file": "main.py",
                "line": 2,
                "evidence": "@app.post('/scan/upload')",
            }
        ]
    }
    context_risks = {"risks": [{"id": "ctx_1", "risk_type": "retrieved_context_can_influence_tool_use", "severity": "High", "file": "agent.py", "line": 10, "evidence": "tool.call(context)"}]}
    appsec_risks = {"risks": [{"id": "ssrf_1", "risk_type": "ssrf", "severity": "High", "file": "proxy.py", "line": 8, "sink": "requests.get", "evidence": "requests.get(url)"}]}

    report = build_trust_boundaries(
        capability_map=capability_map,
        api_surface=api_surface,
        context_poisoning_risks=context_risks,
        appsec_risks=appsec_risks,
    )
    risk_types = {boundary["risk_type"] for boundary in report["boundaries"]}

    assert "unauthenticated_api_boundary" in risk_types
    assert "privileged_action_without_approval" in risk_types
    assert "retrieved_context_can_influence_tool_use" in risk_types
    assert "ssrf" in risk_types


def test_v3_report_attaches_capability_and_trust_boundary_artifacts():
    base = {
        "project_name": "cap-demo",
        "scan_type": "upload",
        "safety_score": 80,
        "status": "Review",
        "summary": {"critical": 0, "high": 0, "medium": 0, "low": 0},
        "category_scores": {
            "prompt_injection": 100,
            "secret_exposure": 100,
            "tool_permission": 100,
            "human_approval": 100,
            "data_exposure": 100,
            "auditability": 100,
        },
        "findings": [],
        "graph": {"nodes": [], "edges": []},
        "attack_replay": [],
        "remediation_checklist": [],
    }
    files = {
        "agent/tools.py": """
def send_email(customer_email, message):
    smtp.send(customer_email, message)
""",
        "backend/main.py": """
@app.post('/assistant/chat')
def chat(payload: dict):
    return llm.invoke(payload)
""",
    }

    result = attach_v3_project_context(base, files=files, project_name="cap-demo", scan_type="upload")
    parsed = ScanResultSchema(**result)

    assert parsed.capability_map is not None
    assert parsed.capability_map.summary["total_capabilities"] >= 1
    assert parsed.trust_boundaries is not None
