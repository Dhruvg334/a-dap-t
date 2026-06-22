from app.appsec.appsec_scanner import build_appsec_risks
from app.services.scan_pipeline import attach_v3_project_context
from app.schemas.scan_schema import ScanResultSchema


def _risk_types(report: dict) -> set[str]:
    return {risk["risk_type"] for risk in report["risks"]}


def test_detects_path_traversal_from_user_controlled_file_path():
    files = {
        "app/files.py": """
from fastapi import Request

async def download(request: Request):
    filename = request.query_params.get("path")
    return open(filename).read()
"""
    }

    report = build_appsec_risks(files)

    assert "path_traversal" in _risk_types(report)
    risk = report["risks"][0]
    assert risk["cwe"] == "CWE-22"
    assert risk["severity"] == "High"


def test_does_not_flag_path_traversal_when_safe_join_is_nearby():
    files = {
        "app/files.py": """
from werkzeug.utils import secure_filename

async def download(request):
    filename = secure_filename(request.query_params.get("path"))
    path = safe_join(BASE_DIR, filename)
    return open(path).read()
"""
    }

    report = build_appsec_risks(files)

    assert "path_traversal" not in _risk_types(report)


def test_detects_ssrf_from_user_controlled_url():
    files = {
        "app/proxy.py": """
import requests

def proxy(request):
    url = request.args.get("url")
    return requests.get(url).text
"""
    }

    report = build_appsec_risks(files)

    assert "ssrf" in _risk_types(report)


def test_does_not_flag_ssrf_when_allowlist_controls_are_visible():
    files = {
        "app/proxy.py": """
from urllib.parse import urlparse
import requests

ALLOWED_HOSTS = {"api.example.com"}

def proxy(request):
    url = request.args.get("url")
    host = urlparse(url).hostname
    if host not in ALLOWED_HOSTS:
        raise ValueError("blocked")
    return requests.get(url, timeout=3).text
"""
    }

    report = build_appsec_risks(files)

    assert "ssrf" not in _risk_types(report)


def test_detects_shell_execution_with_user_controlled_command():
    files = {
        "app/runner.py": """
import subprocess

def run(request):
    command = request.json.get("cmd")
    return subprocess.run(command, shell=True)
"""
    }

    report = build_appsec_risks(files)

    assert "rce_or_command_execution" in _risk_types(report)
    risk = next(r for r in report["risks"] if r["risk_type"] == "rce_or_command_execution")
    assert risk["severity"] == "Critical"


def test_detects_dynamic_sql_interpolation():
    files = {
        "app/db.py": """
def get_user(request, cursor):
    user_id = request.args.get("id")
    cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
"""
    }

    report = build_appsec_risks(files)

    assert "sql_injection" in _risk_types(report)


def test_detects_react_dangerous_html_sink():
    files = {
        "frontend/components/Message.tsx": """
export function Message({ output }) {
  return <div dangerouslySetInnerHTML={{ __html: output }} />
}
"""
    }

    report = build_appsec_risks(files)

    assert "xss" in _risk_types(report)


def test_detects_weak_jwt_config():
    files = {
        "app/auth.py": """
import jwt

def parse(token):
    return jwt.decode(token, options={"verify_signature": False})
"""
    }

    report = build_appsec_risks(files)

    assert "weak_jwt_or_auth_config" in _risk_types(report)


def test_detects_unsafe_deserialization_and_archive_extraction():
    files = {
        "app/imports.py": """
import pickle
import zipfile

def import_data(request):
    data = request.body
    obj = pickle.loads(data)
    archive = zipfile.ZipFile(request.files["project"])
    archive.extractall("/tmp/project")
    return obj
"""
    }

    report = build_appsec_risks(files)
    risk_types = _risk_types(report)

    assert "unsafe_deserialization" in risk_types
    assert "unsafe_archive_extraction" in risk_types


def test_appsec_risks_are_attached_to_v3_report_and_schema_accepts_them():
    base = {
        "project_name": "demo",
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
    files = {"app/runner.py": "subprocess.run(request.json.get('cmd'), shell=True)"}

    updated = attach_v3_project_context(base, files=files, project_name="demo", scan_type="upload")
    parsed = ScanResultSchema(**updated)

    assert parsed.appsec_risks is not None
    assert parsed.appsec_risks.summary["risk_count"] >= 1
