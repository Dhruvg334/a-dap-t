# A-DAP-T v3 Report Contract

A-DAP-T v3 starts by adding a project-understanding layer to every scan response. The goal is to make later security checks depend on structured project context instead of scattered heuristics.

## Compatibility rule

v3 must remain compatible with existing v2 reports. Existing fields such as `findings`, `attack_simulations`, `patches`, `deployment_gate`, and `score_delta` continue to exist. New v3 consumers should check `schema_version`, but old consumers should still render the core report.

## New top-level fields

```json
{
  "schema_version": "3.0",
  "project_metadata": {},
  "file_inventory": {},
  "framework_detection": {}
}
```

## `project_metadata`

Summarises the scanned project at a glance.

```json
{
  "project_name": "vulnerable-support-agent",
  "scan_type": "demo_vulnerable",
  "source_type": "demo",
  "detected_languages": ["python"],
  "detected_frameworks": ["custom_agent"],
  "package_managers": ["pip"],
  "total_files_scanned": 6,
  "total_lines_scanned": 220
}
```

`source_type` values currently include:

- `demo`
- `github`
- `zip_upload`
- `unknown`

## `file_inventory`

Describes the files A-DAP-T actually loaded and scanned. This stays deterministic and never executes scanned code.

```json
{
  "total_files": 12,
  "supported_files": 12,
  "ignored_files": 0,
  "total_lines": 610,
  "total_size_bytes": 42120,
  "languages": { "python": 7, "json": 2, "markdown": 1 },
  "roles": { "agent_logic": 3, "configuration": 2 },
  "package_managers": ["pip"],
  "files": [
    {
      "path": "agent.py",
      "extension": ".py",
      "language": "python",
      "size_bytes": 2430,
      "line_count": 82,
      "role": "agent_logic"
    }
  ],
  "truncated": false
}
```

## `framework_detection`

Identifies frameworks and package managers from manifest files, imports, and path conventions.

```json
{
  "frontend": ["nextjs", "react"],
  "backend": ["fastapi"],
  "agent_frameworks": ["custom_agent", "langchain"],
  "package_managers": ["npm", "pip"],
  "deployment": ["vercel_or_nextjs"],
  "evidence": [
    { "type": "backend", "label": "fastapi", "file": "backend/main.py" }
  ]
}
```

## Security note

The v3 project-context layer only uses file paths and text that the existing safe loader already loaded. It does not import, execute, evaluate, or run scanned project code.

## Next v3 artifacts

These fields will be added after the foundation stabilizes:

- `dependency_risks`
- `api_surface`
- `appsec_risks`
- `capability_map`
- `trust_boundaries`
- `guardrail_matrix`
- `policy_pack`
- `remedy_plan`

---

## Gate 2A: Dependency risk artifact

v3 adds a local dependency posture artifact:

```json
{
  "dependency_risks": {
    "summary": {
      "manifests_found": 2,
      "total_dependencies": 42,
      "risky_dependencies": 3,
      "exactly_pinned_dependencies": 30,
      "ecosystems": ["npm", "pip"],
      "has_lockfiles": true
    },
    "manifests": [],
    "dependencies": [],
    "risks": [],
    "truncated": false,
    "scanner_version": "v3-local-dependency-hygiene-1",
    "notes": []
  }
}
```

The first dependency pass is intentionally local-first. It does not perform network CVE lookup yet. It detects dependency hygiene and supply-chain signals such as unpinned versions, direct source dependencies, invalid manifests, missing npm lockfiles, and suspicious package names.

Planned later enhancement: OSV.dev vulnerability lookup once the local parser is stable.

## `api_surface`

Gate 2B adds a deterministic API surface scanner. It currently extracts supported route patterns from FastAPI, Express, and Next.js API routes. It does not execute code or call the endpoints.

```json
{
  "api_surface": {
    "summary": {
      "total_endpoints": 3,
      "frameworks": ["fastapi", "nextjs_api_route"],
      "methods": {"POST": 2, "GET": 1},
      "auth_missing": 1,
      "rate_limit_missing": 2,
      "risky_mutations": 1,
      "risk_count": 2
    },
    "endpoints": [],
    "risks": [],
    "scanner_version": "v3-api-surface-1",
    "notes": []
  }
}
```

Initial API risk types:

- `missing_auth`
- `missing_rate_limit`
- `weak_cors`
- `unsafe_file_upload`

The scanner is conservative. It looks for explicit nearby control hints and reports uncertainty as a review signal instead of pretending to fully prove runtime behavior.

## `context_poisoning_risks`

Gate 2B also adds the first memory/context poisoning scanner. This checks for common persistent memory and RAG patterns where untrusted content can be saved or retrieved into future agent context without visible source/sanitization controls.

```json
{
  "context_poisoning_risks": {
    "summary": {
      "risk_count": 2,
      "severity_counts": {"High": 1, "Medium": 1},
      "risk_types": {
        "persistent_memory_without_sanitization": 1,
        "retrieved_context_can_influence_tool_use": 1
      }
    },
    "risks": [],
    "scanner_version": "v3-context-poisoning-1",
    "notes": []
  }
}
```

Initial context risk types:

- `persistent_memory_without_sanitization`
- `vector_ingestion_without_source_controls`
- `retrieved_context_can_influence_tool_use`


## `appsec_risks`

Gate 2C adds the first traditional application-security scanner subset. It checks supported Python, JavaScript, TypeScript, JSX, and TSX files as text and reports evidence-based sink patterns. It does not execute code and does not claim full exploitability.

```json
{
  "appsec_risks": {
    "summary": {
      "risk_count": 4,
      "severity_counts": {"Critical": 1, "High": 2, "Medium": 1, "Low": 0},
      "risk_types": {
        "rce_or_command_execution": 1,
        "path_traversal": 1,
        "ssrf": 1,
        "sql_injection": 1
      },
      "cwe_counts": {"CWE-78/CWE-94": 1, "CWE-22": 1}
    },
    "risks": [],
    "scanner_version": "v3-appsec-patterns-1",
    "notes": []
  }
}
```

Initial risk types:

- `path_traversal`
- `ssrf`
- `rce_or_command_execution`
- `sql_injection`
- `xss`
- `weak_jwt_or_auth_config`
- `unsafe_deserialization`
- `unsafe_archive_extraction`

The scanner includes conservative edge-case handling: it skips comment-only lines, checks nearby code windows for visible controls, bounds all evidence snippets, deduplicates repeated hits, and reports confidence instead of pretending every pattern is a confirmed runtime exploit.

## `capability_map`

Gate 3A adds a project capability map. This artifact answers: what can the scanned project or agent appear able to do?

```json
{
  "capability_map": {
    "summary": {
      "total_capabilities": 8,
      "risk_counts": {"critical": 1, "high": 3, "medium": 2, "low": 2},
      "type_counts": {"api_endpoint": 2, "write_action": 2, "external_action": 1},
      "external_effect_count": 5,
      "approval_required_count": 4,
      "approval_missing_count": 3,
      "audit_missing_count": 4,
      "sensitive_data_capability_count": 2
    },
    "capabilities": [],
    "scanner_version": "v3-capability-map-1",
    "notes": []
  }
}
```

Initial capability types:

- `api_endpoint`
- `read_action`
- `write_action`
- `external_action`
- `code_execution`
- `file_operation`
- `memory_operation`
- `database_access`
- `auth_boundary`
- `security_sink`
- `context_to_tool_flow`

Capability detection is static and evidence-based. It uses function definitions, API surface results, AppSec risks, and context poisoning risks. It does not prove runtime reachability.

## `trust_boundaries`

Gate 3A also adds the first trust-boundary map. This converts scanner artifacts into flow-level risk crossings.

```json
{
  "trust_boundaries": {
    "summary": {
      "total_boundaries": 4,
      "weak_boundaries": 2,
      "partial_boundaries": 2,
      "review_boundaries": 0,
      "severity_counts": {"High": 2, "Medium": 2}
    },
    "boundaries": [],
    "scanner_version": "v3-trust-boundary-map-1",
    "notes": []
  }
}
```

Initial boundary types include:

- `unauthenticated_api_boundary`
- `missing_abuse_throttle_boundary`
- `privileged_action_without_approval`
- `external_effect_without_audit`
- `sensitive_data_without_masking`
- context poisoning risk types
- high-impact AppSec sink types such as SSRF, command execution, path traversal, unsafe archive extraction, and SQL injection

The trust boundary map is intentionally derived from existing deterministic artifacts. It should be treated as a security review map, not runtime exploit proof.

## `guardrail_matrix`

Gate 3B adds the guardrail coverage matrix. This artifact converts individual risks and capabilities into a control-coverage view.

```json
{
  "guardrail_matrix": {
    "summary": {
      "total_controls": 16,
      "strong_controls": 3,
      "partial_controls": 4,
      "weak_controls": 5,
      "not_applicable_controls": 4,
      "risky_controls": 7,
      "critical_control_gaps": 2,
      "weak_trust_boundaries": 3
    },
    "controls": [],
    "scanner_version": "v3-guardrail-matrix-1",
    "notes": []
  }
}
```

Initial controls:

- `authentication`
- `authorization`
- `rate_limiting`
- `cors_policy`
- `file_upload_safety`
- `input_validation`
- `output_encoding`
- `prompt_injection_defense`
- `tool_allowlist`
- `human_approval`
- `audit_logging`
- `secrets_management`
- `dependency_security`
- `memory_context_isolation`
- `pii_masking`
- `command_execution_sandboxing`

Each control includes coverage percentage, relevant instance count, protected instance count, risk instance count, evidence, related artifact IDs, and recommended action.

Important: coverage is static evidence coverage, not runtime proof. A control is marked `not_applicable` when A-DAP-T does not find relevant instances for that control, so projects are not penalized for controls that are not relevant to their detected surface.

## `policy_evaluation`

Gate 3C adds policy-pack evaluation. Policy evaluation converts the guardrail matrix and v3 risk artifacts into a selected release policy decision.

```json
{
  "policy_evaluation": {
    "selected_policy": {
      "policy_id": "agent_with_tools",
      "label": "AI Agent with Tools",
      "minimum_safety_score": 80,
      "required_controls": ["authentication", "authorization", "tool_allowlist", "human_approval"]
    },
    "available_policies": [],
    "decision": "BLOCK",
    "summary": "Release is blocked under the selected v3 policy. Fix hard blockers and re-scan.",
    "minimum_safety_score": 80,
    "safety_score": 72,
    "score_passed": false,
    "v3_gate_score": 58,
    "required_controls_total": 8,
    "required_controls_passed": 4,
    "required_controls_missing": 4,
    "passed_controls": [],
    "review_controls": [],
    "missing_required_controls": [],
    "hard_blockers": [],
    "blocker_count": 2,
    "review_count": 3,
    "scanner_version": "v3-policy-packs-1",
    "notes": []
  }
}
```

Initial policy packs:

- `general_ai_app`
- `agent_with_tools`
- `ai_coding_agent`
- `customer_support_agent`
- `data_sensitive_app`
- `public_saas_api`

Policy packs are deterministic. They do not ask AI to decide release posture. They read `guardrail_matrix`, `appsec_risks`, `context_poisoning_risks`, `dependency_risks`, and the existing safety score.

## `remedy_plan`

Gate 3C also adds a comprehensive remedy plan. This is the main v3 fix-sequencing artifact.

```json
{
  "remedy_plan": {
    "summary": {
      "total_steps": 4,
      "critical_steps": 1,
      "high_steps": 2,
      "medium_steps": 1,
      "policy_decision": "BLOCK",
      "top_priority": "Add human approval gates for high-impact actions"
    },
    "steps": [
      {
        "id": "remedy_abc123",
        "priority": 1,
        "priority_score": 106,
        "source": "guardrail_matrix",
        "title": "Add human approval gates for high-impact actions",
        "severity": "Critical",
        "control_id": "human_approval",
        "affected_capabilities": [],
        "related_artifacts": [],
        "risk_instances": 3,
        "recommended_fix": "Require approval IDs, reviewer identity, and explicit confirmation before write or external actions.",
        "why_it_matters": "Human approval is weak across 3 visible risk instances.",
        "estimated_effort": "medium",
        "expected_gate_impact": "Can remove a hard policy blocker and may move the release from BLOCK to REVIEW.",
        "validation_steps": [],
        "evidence": [],
        "manual_review_required": true
      }
    ],
    "release_path": [],
    "summary_text": "Generated prioritized remedy actions.",
    "scanner_version": "v3-remedy-plan-1",
    "notes": []
  }
}
```

Remedy priority is deterministic:

1. v3 policy hard blockers
2. critical/high guardrail gaps
3. high-risk capability control gaps
4. remaining required controls
5. medium-risk hygiene improvements

The remedy plan does not auto-apply code. It creates a clear release-fix sequence with validation steps so the user can fix, re-scan, and compare.
