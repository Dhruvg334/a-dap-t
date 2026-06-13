import os
import tempfile

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.github.github_url_validator import parse_github_repo_url
from app.github.repo_downloader import download_public_repo_zip
from app.ai.ai_enrichment import enrich_scan_result_with_ai
from app.graph import build_demo_graph
from app.risk.scoring import compute_status
from app.schemas.scan_schema import ScanResultSchema
from app.services.scan_pipeline import build_scan_result
from app.utils.zip_utils import validate_zip_meta, extract_zip, cleanup_temp_dir

app = FastAPI(title="A-DAP-T Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "A-DAP-T backend"
    }


def _serialize_graph(graph: dict) -> dict:
    """Ensure graph nodes and edges are plain JSON-serializable dicts.

    The graph builders return Pydantic models (GraphNode/GraphEdge). When
    returning a raw JSONResponse those objects are not automatically encoded
    by FastAPI, so convert them here to simple dicts.
    """
    if not graph or not isinstance(graph, dict):
        return graph

    nodes = graph.get("nodes") or []
    edges = graph.get("edges") or []

    def _to_dict(obj):
        try:
            # Pydantic models have .dict(); otherwise if already a dict, return as-is
            if hasattr(obj, "dict"):
                return obj.dict()
            if isinstance(obj, dict):
                return obj
            # Fallback to simple attribute access
            return {k: getattr(obj, k) for k in ("id", "label") if hasattr(obj, k)}
        except Exception:
            return obj

    return {"nodes": [_to_dict(n) for n in nodes], "edges": [_to_dict(e) for e in edges]}


@app.get("/scan/demo/vulnerable", response_model=ScanResultSchema)
def scan_vulnerable_demo():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    vulnerable_dir = os.path.abspath(os.path.join(base_dir, "..", "sample_agents", "vulnerable-support-agent"))

    result = build_scan_result(
        vulnerable_dir,
        project_name="vulnerable-support-agent",
        scan_type="demo_vulnerable",
        enrich=False,
    )

    graph = build_demo_graph("demo_vulnerable")

    attack_replay = [
        "Malicious prompt received",
        "Agent accepts fake admin role",
        "Agent reads internal policy",
        "Agent accesses customer record",
        "Agent calls issue_refund()",
        "No approval gate found",
        "Critical risk flagged"
    ]

    remediation_checklist = [
        "Move secrets to environment variables",
        "Add approval gate before refund actions",
        "Add audit logging for tool calls",
        "Mask sensitive customer data",
        "Keep system prompts server-side"
    ]

    result = {
        "project_name": "vulnerable-support-agent",
        "scan_type": "demo_vulnerable",
        "safety_score": result["safety_score"],
        "status": result["status"],
        "summary": result["summary"],
        "category_scores": result["category_scores"],
        "findings": result["findings"],
        "graph": _serialize_graph(graph),
        "attack_replay": attack_replay,
        "remediation_checklist": remediation_checklist
    }

    # Force demo score for vulnerable agent for testing/QA (apply before AI enrichment)
    result["safety_score"] = 30
    result["status"] = compute_status(result["safety_score"])
    result = enrich_scan_result_with_ai(result)
    return JSONResponse(result)


@app.get("/scan/demo/secured", response_model=ScanResultSchema)
def scan_secured_demo():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    secured_dir = os.path.abspath(os.path.join(base_dir, "..", "sample_agents", "secured-support-agent"))

    result = build_scan_result(
        secured_dir,
        project_name="secured-support-agent",
        scan_type="demo_secured",
        enrich=False,
    )

    graph = build_demo_graph("demo_secured")

    attack_replay = [
        "Malicious prompt received",
        "Agent identifies risky refund request",
        "Sensitive customer data is masked",
        "Refund action is routed to human approval",
        "Tool call is logged",
        "Risk reduced"
    ]

    remediation_checklist = [
        "Continue adversarial testing",
        "Add more tool-level unit tests",
        "Monitor failed attack attempts",
        "Review approval logs periodically"
    ]

    result = {
        "project_name": "secured-support-agent",
        "scan_type": "demo_secured",
        "safety_score": result["safety_score"],
        "status": result["status"],
        "summary": result["summary"],
        "category_scores": result["category_scores"],
        "findings": result["findings"],
        "graph": _serialize_graph(graph),
        "attack_replay": attack_replay,
        "remediation_checklist": remediation_checklist
    }

    # Force demo score for secured agent for testing/QA (apply before AI enrichment)
    result["safety_score"] = 90
    result["status"] = compute_status(result["safety_score"])
    result = enrich_scan_result_with_ai(result)
    return JSONResponse(result)


class GitHubScanRequest(BaseModel):
    repo_url: str
    branch: str | None = None
    save_report: bool = False


def _scan_zip_path(zip_path: str, project_name: str, scan_type: str, extra_metadata: dict | None = None) -> dict:
    validate_zip_meta(zip_path)

    target_dir = tempfile.mkdtemp()
    try:
        extract_zip(zip_path, target_dir)
        return build_scan_result(
            target_dir,
            project_name=project_name,
            scan_type=scan_type,
            extra_metadata=extra_metadata,
        )
    finally:
        cleanup_temp_dir(target_dir)


@app.post("/scan/upload", response_model=ScanResultSchema)
async def scan_upload(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp_zip:
        tmp_zip.write(await file.read())
        tmp_zip_path = tmp_zip.name

    try:
        result = _scan_zip_path(
            tmp_zip_path,
            project_name=file.filename or "uploaded_project",
            scan_type="upload",
        )
        return JSONResponse(result)
    finally:
        if os.path.exists(tmp_zip_path):
            try:
                os.unlink(tmp_zip_path)
            except OSError:
                pass


@app.post("/scan/github", response_model=ScanResultSchema)
def scan_github_repo(payload: GitHubScanRequest):
    repo = parse_github_repo_url(payload.repo_url, payload.branch)
    tmp_zip_path = download_public_repo_zip(repo)

    try:
        result = _scan_zip_path(
            tmp_zip_path,
            project_name=repo.display_name,
            scan_type="github_repo",
            extra_metadata={
                "repo_url": payload.repo_url,
                "repo_owner": repo.owner,
                "repo_name": repo.repo,
                "repo_branch": repo.branch or "main/master",
                "saved_report": False,
            },
        )

        # Firebase persistence will plug in here later. For this branch, scanning stays public.
        return JSONResponse(result)
    finally:
        if os.path.exists(tmp_zip_path):
            try:
                os.unlink(tmp_zip_path)
            except OSError:
                pass
