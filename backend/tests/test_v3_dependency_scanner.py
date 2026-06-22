from app.dependencies.dependency_scanner import build_dependency_risks
from app.schemas.scan_schema import ScanResultSchema
from app.services.scan_pipeline import attach_v3_project_context


def test_dependency_scanner_parses_npm_and_flags_unpinned_specs():
    files = {
        "package.json": """
        {
          "dependencies": {
            "next": "^14.2.0",
            "react": "18.3.1",
            "unsafe-lib": "github:someone/unsafe-lib"
          },
          "devDependencies": {
            "typescript": "~5.5.0"
          }
        }
        """,
        "package-lock.json": """
        {
          "lockfileVersion": 3,
          "packages": {
            "node_modules/next": {"version": "14.2.35"},
            "node_modules/react": {"version": "18.3.1"}
          }
        }
        """,
    }

    report = build_dependency_risks(files)

    assert report["summary"]["manifests_found"] == 2
    assert report["summary"]["total_dependencies"] >= 5
    assert "npm" in report["summary"]["ecosystems"]

    risk_types = {risk["risk_type"] for risk in report["risks"]}
    assert "unpinned_dependency" in risk_types
    assert "direct_source_dependency" in risk_types


def test_dependency_scanner_parses_requirements_and_flags_unpinned_packages():
    files = {
        "requirements.txt": """
fastapi==0.115.0
uvicorn>=0.30.0
-e git+https://github.com/example/private-lib.git#egg=private-lib
        """
    }

    report = build_dependency_risks(files)

    packages = {dependency["name"] for dependency in report["dependencies"]}
    assert "fastapi" in packages
    assert "uvicorn" in packages
    assert "private-lib" in packages

    risk_types = {risk["risk_type"] for risk in report["risks"]}
    assert "unpinned_dependency" in risk_types
    assert "direct_source_dependency" in risk_types


def test_v3_context_attaches_dependency_risks_without_breaking_scan_schema():
    base_result = {
        "project_name": "dependency-demo",
        "scan_type": "upload",
        "safety_score": 88,
        "status": "Low Risk",
        "summary": {"critical": 0, "high": 0, "medium": 1, "low": 0},
        "category_scores": {
            "prompt_injection": 0,
            "secret_exposure": 0,
            "tool_permission": 0,
            "human_approval": 0,
            "data_exposure": 0,
            "auditability": 0,
        },
        "findings": [],
        "graph": {"nodes": [], "edges": []},
        "attack_replay": [],
        "remediation_checklist": [],
    }
    files = {"requirements.txt": "fastapi==0.115.0\nuvicorn>=0.30.0\n"}

    result = attach_v3_project_context(
        base_result,
        files=files,
        project_name="dependency-demo",
        scan_type="upload",
    )

    parsed = ScanResultSchema(**result)
    assert parsed.schema_version == "3.0"
    assert parsed.dependency_risks is not None
    assert parsed.dependency_risks.summary["total_dependencies"] == 2
    assert parsed.dependency_risks.summary["risky_dependencies"] == 1
