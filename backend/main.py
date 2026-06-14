import os
import tempfile
import uuid
from datetime import datetime
from dotenv import load_dotenv

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load env variables at the very start
load_dotenv()

from app.github.github_url_validator import parse_github_repo_url
from app.github.repo_downloader import download_public_repo_zip
from app.ai.ai_enrichment import enrich_scan_result_with_ai
from app.graph import build_demo_graph
from app.risk.scoring import compute_status
from app.schemas.scan_schema import ScanResultSchema
from app.services.scan_pipeline import build_scan_result
from app.utils.zip_utils import validate_zip_meta, extract_zip, cleanup_temp_dir
from app.routes import auth
from app.utils.firebase_utils import get_db

app = FastAPI(title="A-DAP-T Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Auth Routes
app.include_router(auth.router)

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "A-DAP-T backend"
    }


def _serialize_graph(graph: dict) -> dict:
    if not graph or not isinstance(graph, dict):
        return graph

    nodes = graph.get("nodes") or []
    edges = graph.get("edges") or []

    def _to_dict(obj):
        try:
            if hasattr(obj, "dict"):
                return obj.dict()
            if isinstance(obj, dict):
                return obj
            # Capture common fields for nodes (id, label) and edges (source, target, risk)
            return {k: getattr(obj, k) for k in ("id", "label", "source", "target", "risk") if hasattr(obj, k)}
        except Exception:
            return obj

    return {"nodes": [_to_dict(n) for n in nodes], "edges": [_to_dict(e) for e in edges]}


async def _save_scan_to_db(result: dict, user_id: str = None):
    """Save scan result to Firestore if user_id is provided."""
    db = get_db()
    if not db or not user_id:
        return None

    scan_id = str(uuid.uuid4())
    doc_ref = db.collection("scans").document(scan_id)

    # Add metadata
    result_to_save = result.copy()
    result_to_save["id"] = scan_id
    result_to_save["user_id"] = user_id
    result_to_save["timestamp"] = datetime.utcnow().isoformat()

    doc_ref.set(result_to_save)
    return scan_id


@app.get("/scan/demo/vulnerable", response_model=ScanResultSchema)
async def scan_vulnerable_demo(user=Depends(auth.get_current_user)):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    vulnerable_dir = os.path.abspath(os.path.join(base_dir, "..", "sample_agents", "vulnerable-support-agent"))

    result = build_scan_result(
        vulnerable_dir,
        project_name="vulnerable-support-agent",
        scan_type="demo_vulnerable",
        enrich=False,
    )

    graph = build_demo_graph("demo_vulnerable")
    result["graph"] = _serialize_graph(graph)

    result["attack_replay"] = [
        "Malicious prompt received",
        "Agent accepts fake admin role",
        "Agent reads internal policy",
        "Agent accesses customer record",
        "Agent calls issue_refund()",
        "No approval gate found",
        "Critical risk flagged"
    ]

    result["remediation_checklist"] = [
        "Move secrets to environment variables",
        "Add approval gate before refund actions",
        "Add audit logging for tool calls",
        "Mask sensitive customer data",
        "Keep system prompts server-side"
    ]

    result = enrich_scan_result_with_ai(result)

    # Hardcoded scoring for demo (applied AFTER AI enrichment)
    result["safety_score"] = 32
    result["status"] = compute_status(32)

    if user:
        await _save_scan_to_db(result, user["uid"])

    return JSONResponse(result)


@app.get("/scan/demo/secured", response_model=ScanResultSchema)
async def scan_secured_demo(user=Depends(auth.get_current_user)):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    secured_dir = os.path.abspath(os.path.join(base_dir, "..", "sample_agents", "secured-support-agent"))

    result = build_scan_result(
        secured_dir,
        project_name="secured-support-agent",
        scan_type="demo_secured",
        enrich=False,
    )

    graph = build_demo_graph("demo_secured")
    result["graph"] = _serialize_graph(graph)

    result["attack_replay"] = [
        "Malicious prompt received",
        "Agent identifies risky refund request",
        "Sensitive customer data is masked",
        "Refund action is routed to human approval",
        "Tool call is logged",
        "Risk reduced"
    ]

    result["remediation_checklist"] = [
        "Continue adversarial testing",
        "Add more tool-level unit tests",
        "Monitor failed attack attempts",
        "Review approval logs periodically"
    ]

    result = enrich_scan_result_with_ai(result)

    # Hardcoded scoring for demo (applied AFTER AI enrichment)
    result["safety_score"] = 94
    result["status"] = compute_status(94)

    if user:
        await _save_scan_to_db(result, user["uid"])

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
async def scan_upload(file: UploadFile = File(...), user=Depends(auth.get_current_user)):
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp_zip:
        tmp_zip.write(await file.read())
        tmp_zip_path = tmp_zip.name

    try:
        result = _scan_zip_path(
            tmp_zip_path,
            project_name=file.filename or "uploaded_project",
            scan_type="upload",
        )

        if user:
            await _save_scan_to_db(result, user["uid"])

        return JSONResponse(result)
    finally:
        if os.path.exists(tmp_zip_path):
            try:
                os.unlink(tmp_zip_path)
            except OSError:
                pass


@app.post("/scan/github", response_model=ScanResultSchema)
async def scan_github_repo(payload: GitHubScanRequest, user=Depends(auth.get_current_user)):
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
            },
        )

        if user:
            await _save_scan_to_db(result, user["uid"])

        return JSONResponse(result)
    finally:
        if os.path.exists(tmp_zip_path):
            try:
                os.unlink(tmp_zip_path)
            except OSError:
                pass


@app.get("/history")
async def get_scan_history(user=Depends(auth.get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")

    try:
        docs = db.collection("scans").where("user_id", "==", user["uid"]).order_by("timestamp", direction="DESCENDING").stream()
        history = [doc.to_dict() for doc in docs]
        return history
    except Exception:
        # Fallback if Firestore index is not yet created
        docs = db.collection("scans").where("user_id", "==", user["uid"]).stream()
        history = [doc.to_dict() for doc in docs]
        history.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return history
