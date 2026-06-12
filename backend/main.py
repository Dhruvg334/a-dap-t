import os
import tempfile
import zipfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.schemas.scan_schema import ScanResultSchema
from app.utils.zip_utils import validate_zip_meta, extract_zip, cleanup_temp_dir
from app.utils.file_utils import get_scannable_files, read_file_text
import app.scanners.secret_scanner as secret_scanner
import app.scanners.tool_scanner as tool_scanner
import app.scanners.approval_scanner as approval_scanner
import app.scanners.audit_scanner as audit_scanner
from app.risk.scoring import (
    CATEGORY_TO_SCHEMA_KEY,
    compute_category_score,
    compute_overall_risk,
    compute_safety_score,
    compute_status,
    compute_summary
)
from app.graph import build_demo_graph, build_upload_graph

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


def _run_scan_pipeline(agent_dir: str) -> dict:
    """Helper to run the full scanning pipeline on a directory containing agent source files."""
    abs_paths = get_scannable_files(agent_dir)
    files = {}
    for path in abs_paths:
        rel_path = os.path.relpath(path, agent_dir).replace("\\", "/")
        files[rel_path] = read_file_text(path)

    # Run scanners
    secret_findings = secret_scanner.run(files)
    tool_findings = tool_scanner.run(files)
    approval_findings = approval_scanner.run(tool_findings, files)
    audit_findings = audit_scanner.run(tool_findings, files)

    all_findings = secret_findings + tool_findings + approval_findings + audit_findings

    # Calculate scores
    category_scores = {}
    for cat in [
        "Prompt Injection Risk",
        "Secret Exposure Risk",
        "Tool Permission Risk",
        "Human Approval Risk",
        "Data Exposure Risk",
        "Auditability Risk",
    ]:
        schema_key = CATEGORY_TO_SCHEMA_KEY[cat]
        category_scores[schema_key] = compute_category_score(all_findings, cat)

    overall_risk = compute_overall_risk(category_scores)
    safety_score = compute_safety_score(overall_risk)
    status = compute_status(safety_score)
    summary = compute_summary(all_findings)

    # Convert findings to schemas
    findings_schema_list = []
    for f in all_findings:
        findings_schema_list.append({
            "title": f.title,
            "severity": f.severity,
            "category": f.category,
            "file": f.file,
            "line": f.line,
            "why_it_matters": f.why_it_matters,
            "suggested_fix": f.suggested_fix
        })

    return {
        "findings": findings_schema_list,
        "category_scores": category_scores,
        "safety_score": safety_score,
        "status": status,
        "summary": summary
    }


@app.get("/scan/demo/vulnerable", response_model=ScanResultSchema)
def scan_vulnerable_demo():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    vulnerable_dir = os.path.abspath(os.path.join(base_dir, "..", "sample_agents", "vulnerable-support-agent"))

    res = _run_scan_pipeline(vulnerable_dir)

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

    return {
        "project_name": "vulnerable-support-agent",
        "scan_type": "demo_vulnerable",
        "safety_score": res["safety_score"],
        "status": res["status"],
        "summary": res["summary"],
        "category_scores": res["category_scores"],
        "findings": res["findings"],
        "graph": graph,
        "attack_replay": attack_replay,
        "remediation_checklist": remediation_checklist
    }


@app.get("/scan/demo/secured", response_model=ScanResultSchema)
def scan_secured_demo():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    secured_dir = os.path.abspath(os.path.join(base_dir, "..", "sample_agents", "secured-support-agent"))

    res = _run_scan_pipeline(secured_dir)

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

    return {
        "project_name": "secured-support-agent",
        "scan_type": "demo_secured",
        "safety_score": res["safety_score"],
        "status": res["status"],
        "summary": res["summary"],
        "category_scores": res["category_scores"],
        "findings": res["findings"],
        "graph": graph,
        "attack_replay": attack_replay,
        "remediation_checklist": remediation_checklist
    }


@app.post("/scan/upload", response_model=ScanResultSchema)
async def scan_upload(file: UploadFile = File(...)):
    # Create a temp file for the uploaded ZIP
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp_zip:
        tmp_zip.write(await file.read())
        tmp_zip_path = tmp_zip.name

    try:
        # Validate metadata (file size, depth, count, invalid format)
        validate_zip_meta(tmp_zip_path)

        # Create target temp directory
        target_dir = tempfile.mkdtemp()
        try:
            # Extract safely (handling zip slip, path filters, file size limits, etc.)
            extract_zip(tmp_zip_path, target_dir)

            # Get all scannable files
            abs_paths = get_scannable_files(target_dir)

            # Read file contents
            files = {}
            for path in abs_paths:
                rel_path = os.path.relpath(path, target_dir).replace("\\", "/")
                files[rel_path] = read_file_text(path)

            # Run scanners
            secret_findings = secret_scanner.run(files)
            tool_findings = tool_scanner.run(files)
            approval_findings = approval_scanner.run(tool_findings, files)
            audit_findings = audit_scanner.run(tool_findings, files)

            all_findings = secret_findings + tool_findings + approval_findings + audit_findings

            # Calculate scores
            category_scores = {}
            for cat in [
                "Prompt Injection Risk",
                "Secret Exposure Risk",
                "Tool Permission Risk",
                "Human Approval Risk",
                "Data Exposure Risk",
                "Auditability Risk",
            ]:
                schema_key = CATEGORY_TO_SCHEMA_KEY[cat]
                category_scores[schema_key] = compute_category_score(all_findings, cat)

            overall_risk = compute_overall_risk(category_scores)
            safety_score = compute_safety_score(overall_risk)
            status = compute_status(safety_score)
            summary = compute_summary(all_findings)

            # Build upload graph
            graph = build_upload_graph(all_findings)

            # Build dynamic remediation checklist based on findings
            remediation_checklist = []
            attack_replay = []

            has_secret = any(f.category == "Secret Exposure Risk" for f in all_findings)
            if has_secret:
                remediation_checklist.append("Move secrets to environment variables")
            else:
                remediation_checklist.append("Continue monitoring env files for hardcoded keys")

            has_approval_risk = any(f.category == "Human Approval Risk" for f in all_findings)
            if has_approval_risk:
                remediation_checklist.append("Add approval gate before critical/high actions")
                attack_replay.append("Risky tool call issued without approval gate")
            else:
                remediation_checklist.append("Monitor approval logs for abnormal patterns")

            has_audit_risk = any(f.category == "Auditability Risk" for f in all_findings)
            if has_audit_risk:
                remediation_checklist.append("Add audit logging for tool calls")
            else:
                remediation_checklist.append("Review audit logs periodically")

            has_data_risk = any(f.category == "Data Exposure Risk" for f in all_findings)
            if has_data_risk:
                remediation_checklist.append("Mask sensitive customer data in output")
            else:
                remediation_checklist.append("Ensure masking covers all PII properties")

            has_prompt_risk = any(f.category == "Prompt Injection Risk" for f in all_findings)
            if has_prompt_risk:
                remediation_checklist.append("Keep system prompts server-side and validate user input")
            else:
                remediation_checklist.append("Expand adversarial prompt validation tests")

            if not attack_replay:
                attack_replay = [
                    "Malicious prompt received",
                    "Agent filters threat",
                    "Risky actions blocked or routed to approval",
                    "Attack defeated"
                ]
            else:
                attack_replay = [
                    "Malicious prompt received",
                    "Agent attempts action execution",
                ] + attack_replay + ["Vulnerabilities exploited"]

            findings_schema_list = []
            for f in all_findings:
                findings_schema_list.append({
                    "title": f.title,
                    "severity": f.severity,
                    "category": f.category,
                    "file": f.file,
                    "line": f.line,
                    "why_it_matters": f.why_it_matters,
                    "suggested_fix": f.suggested_fix
                })

            return {
                "project_name": file.filename or "uploaded_project",
                "scan_type": "upload",
                "safety_score": safety_score,
                "status": status,
                "summary": summary,
                "category_scores": category_scores,
                "findings": findings_schema_list,
                "graph": graph,
                "attack_replay": attack_replay,
                "remediation_checklist": remediation_checklist
            }

        finally:
            cleanup_temp_dir(target_dir)

    finally:
        if os.path.exists(tmp_zip_path):
            try:
                os.unlink(tmp_zip_path)
            except OSError:
                pass