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
