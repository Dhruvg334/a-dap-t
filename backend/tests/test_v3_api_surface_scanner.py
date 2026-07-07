from app.api_security.api_surface_scanner import build_api_surface
from app.context_security.context_poisoning_scanner import build_context_poisoning_risks
from app.schemas.scan_schema import ScanResultSchema
from app.services.scan_pipeline import attach_v3_project_context


def test_api_surface_detects_fastapi_endpoint_auth_and_rate_limit_risks():
    files = {
        "backend/main.py": """
from fastapi import FastAPI, UploadFile
app = FastAPI()

@app.post("/scan/upload")
async def upload_scan(file: UploadFile):
    return {"ok": True}
        """
    }

    report = build_api_surface(files)

    assert report["summary"]["total_endpoints"] == 1
    endpoint = report["endpoints"][0]
    assert endpoint["framework"] == "fastapi"
    assert endpoint["method"] == "POST"
    assert endpoint["path"] == "/scan/upload"
    assert endpoint["auth_status"] == "missing"
    assert endpoint["rate_limit_status"] == "missing"

    risk_types = {risk["risk_type"] for risk in report["risks"]}
    assert "missing_auth" in risk_types
    assert "missing_rate_limit" in risk_types
    assert "unsafe_file_upload" in risk_types


def test_api_surface_detects_nextjs_api_routes():
    files = {
        "frontend/app/api/assistant/route.ts": """
export async function POST(request: Request) {
  const body = await request.json()
  const result = await gemini.generateContent(body.question)
  return Response.json({ result })
}
        """
    }

    report = build_api_surface(files)

    assert report["summary"]["total_endpoints"] == 1
    endpoint = report["endpoints"][0]
    assert endpoint["framework"] == "nextjs_api_route"
    assert endpoint["path"] == "/assistant"
    assert "llm_call" in endpoint["tags"]
    assert any(risk["risk_type"] == "missing_rate_limit" for risk in report["risks"])


def test_api_surface_detects_express_routes_and_auth_hints():
    files = {
        "server.js": """
const express = require('express')
const app = express()
const limiter = require('express-rate-limit')()
function requireAuth(req, res, next) { next() }
app.post('/reports/delete', requireAuth, limiter, (req, res) => res.json({ok: true}))
        """
    }

    report = build_api_surface(files)
    endpoint = report["endpoints"][0]

    assert endpoint["framework"] == "express"
    assert endpoint["auth_status"] == "present"
    assert endpoint["rate_limit_status"] == "present"
    assert report["summary"]["risk_count"] == 0


def test_context_poisoning_scanner_flags_memory_and_retrieval_risks():
    files = {
        "agent.py": """
def handle(user_input, retriever, tool):
    chat_history.append(user_input)
    context = retriever.invoke(user_input)
    prompt = system_prompt + context
    return tool.call(prompt)
        """
    }

    report = build_context_poisoning_risks(files)

    risk_types = {risk["risk_type"] for risk in report["risks"]}
    assert "persistent_memory_without_sanitization" in risk_types
    assert "retrieved_context_can_influence_tool_use" in risk_types


def test_v3_context_attaches_api_and_context_reports_without_breaking_schema():
    base_result = {
        "project_name": "api-demo",
        "scan_type": "upload",
        "safety_score": 82,
        "status": "Review",
        "summary": {"critical": 0, "high": 1, "medium": 1, "low": 0},
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
    files = {
        "backend/main.py": """
from fastapi import FastAPI
app = FastAPI()
@app.post('/assistant/chat')
async def chat(payload: dict):
    return {}
        """,
        "agent.py": "messages.append(user_input)\n",
    }

    result = attach_v3_project_context(
        base_result,
        files=files,
        project_name="api-demo",
        scan_type="upload",
    )

    parsed = ScanResultSchema(**result)
    assert parsed.schema_version == "3.0"
    assert parsed.api_surface is not None
    assert parsed.api_surface.summary["total_endpoints"] == 1
    assert parsed.context_poisoning_risks is not None
    assert parsed.context_poisoning_risks.summary["risk_count"] >= 1
