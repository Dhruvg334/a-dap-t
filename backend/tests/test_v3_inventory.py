from app.inventory.file_inventory import build_file_inventory, build_project_metadata
from app.inventory.framework_detector import detect_frameworks
from app.services.scan_pipeline import attach_v3_project_context, build_scan_result
from app.schemas.scan_schema import ScanResultSchema


FILES = {
    "backend/main.py": "from fastapi import FastAPI\napp = FastAPI()\n",
    "frontend/app/page.tsx": "export default function Page() { return <main /> }\n",
    "agent.py": "from langchain.agents import AgentExecutor\n",
    "tools.py": "def send_email(to, body): pass\n",
    "package.json": '{"dependencies":{"next":"14.0.0","react":"18.0.0"}}',
    "requirements.txt": "fastapi==0.111.0\nlangchain==0.2.0\n",
    "system_prompt.txt": "You are a support agent.",
}


def test_file_inventory_counts_languages_roles_and_package_managers():
    inventory = build_file_inventory(FILES, project_name="demo")

    assert inventory["project_name"] == "demo"
    assert inventory["total_files"] == len(FILES)
    assert inventory["supported_files"] == len(FILES)
    assert inventory["languages"]["python"] == 3
    assert inventory["languages"]["typescript"] == 1
    assert inventory["roles"]["dependency_manifest"] == 2
    assert inventory["roles"]["prompt"] == 1
    assert "npm" in inventory["package_managers"]
    assert "pip" in inventory["package_managers"]
    assert inventory["files"][0]["path"]


def test_framework_detector_uses_manifests_imports_and_paths():
    detection = detect_frameworks(FILES)

    assert "nextjs" in detection["frontend"]
    assert "react" in detection["frontend"]
    assert "fastapi" in detection["backend"]
    assert "langchain" in detection["agent_frameworks"]
    assert "custom_agent" in detection["agent_frameworks"]
    assert "npm" in detection["package_managers"]
    assert "pip" in detection["package_managers"]
    assert detection["evidence"]


def test_v3_project_context_attaches_without_touching_existing_verdict():
    base = {
        "project_name": "demo",
        "scan_type": "github_repo",
        "safety_score": 77,
        "status": "Review",
        "findings": [],
    }

    updated = attach_v3_project_context(
        base,
        files=FILES,
        project_name="demo",
        scan_type="github_repo",
    )

    assert updated["schema_version"] == "3.0"
    assert updated["safety_score"] == 77
    assert updated["project_metadata"]["source_type"] == "github"
    assert "python" in updated["project_metadata"]["detected_languages"]
    assert "fastapi" in updated["project_metadata"]["detected_frameworks"]
    assert updated["file_inventory"]["total_files"] == len(FILES)
    assert updated["framework_detection"]["backend"] == ["fastapi"]


def test_scan_result_schema_accepts_v3_fields_and_keeps_v2_compatibility():
    inventory = build_file_inventory(FILES, project_name="demo")
    frameworks = detect_frameworks(FILES)
    metadata = build_project_metadata(
        project_name="demo",
        scan_type="upload",
        source_type="zip_upload",
        file_inventory=inventory,
        framework_detection=frameworks,
    )

    payload = {
        "schema_version": "3.0",
        "project_metadata": metadata,
        "file_inventory": inventory,
        "framework_detection": frameworks,
        "project_name": "demo",
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

    result = ScanResultSchema(**payload)

    assert result.schema_version == "3.0"
    assert result.project_metadata is not None
    assert result.file_inventory is not None
    assert result.framework_detection is not None
    assert result.project_metadata.source_type == "zip_upload"
