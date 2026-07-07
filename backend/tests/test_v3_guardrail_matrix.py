from app.guardrails.coverage_matrix import build_guardrail_matrix
from app.schemas.scan_schema import ScanResultSchema
from app.services.scan_pipeline import attach_v3_project_context


def test_guardrail_matrix_counts_auth_rate_limit_and_upload_gaps():
    api_surface = {
        "endpoints": [
            {
                "id": "api_1",
                "method": "POST",
                "path": "/scan/upload",
                "framework": "fastapi",
                "file": "main.py",
                "line": 10,
                "auth_status": "missing",
                "rate_limit_status": "missing",
                "cors_status": "strong",
                "tags": ["upload", "mutation"],
                "evidence": '@app.post("/scan/upload")',
            }
        ],
        "risks": [
            {
                "id": "risk_missing_auth",
                "risk_type": "missing_auth",
                "file": "main.py",
                "line": 10,
                "evidence": '@app.post("/scan/upload")',
            },
            {
                "id": "risk_rate",
                "risk_type": "missing_rate_limit",
                "file": "main.py",
                "line": 10,
                "evidence": '@app.post("/scan/upload")',
            },
            {
                "id": "risk_upload",
                "risk_type": "unsafe_file_upload",
                "file": "main.py",
                "line": 10,
                "evidence": "UploadFile",
            },
        ],
    }

    matrix = build_guardrail_matrix(api_surface=api_surface)
    controls = {control["control_id"]: control for control in matrix["controls"]}

    assert controls["authentication"]["risk_instances"] == 1
    assert controls["authentication"]["status"] == "weak"
    assert controls["rate_limiting"]["risk_instances"] == 1
    assert controls["file_upload_safety"]["risk_instances"] >= 1
    assert matrix["summary"]["total_controls"] >= 10


def test_guardrail_matrix_marks_not_applicable_without_relevant_instances():
    matrix = build_guardrail_matrix(api_surface={"endpoints": [], "risks": []})
    controls = {control["control_id"]: control for control in matrix["controls"]}

    assert controls["authentication"]["status"] == "not_applicable"
    assert controls["rate_limiting"]["coverage_percent"] is None
    assert controls["command_execution_sandboxing"]["status"] == "not_applicable"


def test_guardrail_matrix_uses_capability_controls():
    capability_map = {
        "capabilities": [
            {
                "id": "cap_update",
                "label": "Update Customer Profile",
                "capability_type": "write_action",
                "risk_level": "high",
                "file": "agent.py",
                "line": 4,
                "evidence": "def update_customer_profile(data):",
                "external_effect": True,
                "requires_approval": True,
                "approval_found": False,
                "audit_logging_found": False,
                "allowlist_found": False,
                "data_touched": ["customer", "email"],
                "control_gaps": [
                    "missing_human_approval",
                    "missing_audit_logging",
                    "missing_allowlist_or_scope",
                    "sensitive_data_without_visible_masking",
                ],
            }
        ]
    }

    matrix = build_guardrail_matrix(capability_map=capability_map)
    controls = {control["control_id"]: control for control in matrix["controls"]}

    assert controls["human_approval"]["risk_instances"] == 1
    assert controls["audit_logging"]["risk_instances"] == 1
    assert controls["tool_allowlist"]["risk_instances"] == 1
    assert controls["pii_masking"]["risk_instances"] == 1


def test_guardrail_matrix_uses_dependency_and_appsec_risks():
    dependency_risks = {
        "summary": {"total_dependencies": 3, "has_lockfiles": False},
        "risks": [
            {
                "id": "dep_1",
                "risk_type": "unpinned_dependency",
                "file": "requirements.txt",
                "line": 1,
                "evidence": "fastapi",
            }
        ],
    }
    appsec_risks = {
        "risks": [
            {
                "id": "rce_1",
                "risk_type": "rce_or_command_execution",
                "severity": "Critical",
                "file": "runner.py",
                "line": 7,
                "evidence": "subprocess.run(command, shell=True)",
                "sink": "subprocess.run",
            },
            {
                "id": "xss_1",
                "risk_type": "xss",
                "severity": "Medium",
                "file": "page.tsx",
                "line": 9,
                "evidence": "dangerouslySetInnerHTML",
            },
        ]
    }

    matrix = build_guardrail_matrix(dependency_risks=dependency_risks, appsec_risks=appsec_risks)
    controls = {control["control_id"]: control for control in matrix["controls"]}

    assert controls["dependency_security"]["relevant_instances"] == 3
    assert controls["dependency_security"]["risk_instances"] == 1
    assert controls["command_execution_sandboxing"]["risk_instances"] >= 1
    assert controls["output_encoding"]["risk_instances"] == 1


def test_attach_v3_project_context_adds_guardrail_matrix():
    files = {
        "main.py": """
from fastapi import FastAPI, UploadFile
app = FastAPI()

@app.post('/upload')
def upload(file: UploadFile):
    return {'ok': True}
"""
    }
    base = {
        "project_name": "demo",
        "scan_type": "unit",
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

    updated = attach_v3_project_context(base, files=files, project_name="demo", scan_type="unit")
    assert updated["guardrail_matrix"]["summary"]["total_controls"] >= 10
    parsed = ScanResultSchema(**updated)
    assert parsed.guardrail_matrix is not None
    assert parsed.guardrail_matrix.controls
