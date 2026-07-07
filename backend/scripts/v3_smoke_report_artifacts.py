from __future__ import annotations

import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.services.scan_pipeline import build_scan_result

ROOT = BACKEND_ROOT.parent
SAMPLE_ROOT = ROOT / "sample_agents"

REQUIRED_V3_ARTIFACTS = [
    "schema_version",
    "project_metadata",
    "file_inventory",
    "framework_detection",
    "dependency_risks",
    "api_surface",
    "context_poisoning_risks",
    "appsec_risks",
    "capability_map",
    "trust_boundaries",
    "guardrail_matrix",
    "v3_security_score",
    "v3_status",
    "v3_score_breakdown",
    "policy_evaluation",
    "remedy_plan",
]


def _assert_artifacts(report: dict) -> None:
    missing = [key for key in REQUIRED_V3_ARTIFACTS if key not in report]
    if missing:
        raise AssertionError(f"Missing v3 artifact(s): {', '.join(missing)}")


def _compact(report: dict) -> dict:
    return {
        "project_name": report["project_name"],
        "legacy_safety_score": report["safety_score"],
        "v3_security_score": report.get("v3_security_score"),
        "v3_status": report.get("v3_status"),
        "policy_decision": (report.get("policy_evaluation") or {}).get("decision"),
        "dependency_risks": (report.get("dependency_risks") or {}).get("summary", {}).get("risky_dependencies"),
        "api_risks": (report.get("api_surface") or {}).get("summary", {}).get("risk_count"),
        "context_risks": (report.get("context_poisoning_risks") or {}).get("summary", {}).get("risk_count"),
        "appsec_risks": (report.get("appsec_risks") or {}).get("summary", {}).get("risk_count"),
        "capabilities": (report.get("capability_map") or {}).get("summary", {}).get("total_capabilities"),
        "weak_boundaries": (report.get("trust_boundaries") or {}).get("summary", {}).get("weak_boundaries"),
        "risky_controls": (report.get("guardrail_matrix") or {}).get("summary", {}).get("risky_controls"),
        "remedy_steps": (report.get("remedy_plan") or {}).get("summary", {}).get("total_steps"),
    }


def main() -> None:
    reports = []
    for project_name, scan_type in [
        ("vulnerable-support-agent", "demo_vulnerable"),
        ("secured-support-agent", "demo_secured"),
    ]:
        report = build_scan_result(str(SAMPLE_ROOT / project_name), project_name, scan_type, enrich=False)
        _assert_artifacts(report)
        reports.append(_compact(report))

    vulnerable, secured = reports
    if not vulnerable["v3_security_score"] < secured["v3_security_score"]:
        raise AssertionError("Expected vulnerable demo v3 score to be lower than secured demo score")
    if vulnerable["policy_decision"] != "BLOCK":
        raise AssertionError("Expected vulnerable demo to be blocked by v3 policy")

    print(json.dumps({"v3_smoke": reports}, indent=2))


if __name__ == "__main__":
    main()
