from __future__ import annotations

import json
from typing import Any


DEFAULT_POLICY = {
    "minimum_safety_score": 75,
    "block_on_critical": True,
    "block_on_secrets": True,
    "block_on_missing_approval": True,
    "block_on_unsafe_tools": True,
}


def _lower(value: Any) -> str:
    return str(value or "").strip().lower()


def _has_category(findings: list[dict], text: str) -> bool:
    needle = text.lower()
    return any(needle in _lower(finding.get("category")) for finding in findings)


def _has_severity(findings: list[dict], severity: str) -> bool:
    target = severity.lower()
    return any(_lower(finding.get("severity")) == target for finding in findings)


def _github_actions_yaml(policy: dict) -> str:
    minimum = int(policy.get("minimum_safety_score", 75))
    return f"""name: A-DAP-T Agent Safety Gate

on:
  pull_request:
  push:
    branches: [main]

jobs:
  adapt-safety-gate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Run A-DAP-T scan
        run: |
          echo "Run A-DAP-T before deployment"
          echo "Minimum required safety score: {minimum}"
          echo "Connect this step to the hosted A-DAP-T API or CLI runner."

      - name: Enforce A-DAP-T policy
        run: |
          echo "Block deployment if score is below {minimum} or hard blockers are present."
""".strip()


def build_deployment_gate(scan_result: dict, policy: dict | None = None) -> dict:
    active_policy = {**DEFAULT_POLICY, **(policy or {})}
    findings = scan_result.get("findings") or []
    safety_score = int(scan_result.get("safety_score") or 0)
    minimum = int(active_policy.get("minimum_safety_score", 75))
    blockers: list[str] = []

    if safety_score < minimum:
        blockers.append(f"Safety score is below {minimum}.")
    if active_policy.get("block_on_critical") and _has_severity(findings, "critical"):
        blockers.append("Critical findings are present.")
    if active_policy.get("block_on_secrets") and _has_category(findings, "secret exposure"):
        blockers.append("Secret exposure risk detected.")
    if active_policy.get("block_on_missing_approval") and _has_category(findings, "human approval"):
        blockers.append("Missing human approval gate detected.")
    if active_policy.get("block_on_unsafe_tools") and _has_category(findings, "tool permission"):
        blockers.append("Unsafe or overly broad tool permission detected.")

    has_high_or_medium = any(_lower(f.get("severity")) in {"high", "medium"} for f in findings)
    if blockers:
        decision = "BLOCK"
    elif has_high_or_medium:
        decision = "REVIEW"
    else:
        decision = "ALLOW"

    return {
        "decision": decision,
        "minimum_safety_score": minimum,
        "blockers": blockers,
        "recommended_policy": active_policy,
        "github_actions_yaml": _github_actions_yaml(active_policy),
        "policy_json": json.dumps(active_policy, indent=2),
    }
