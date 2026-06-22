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
- `appsec_findings`
- `memory_context_risks`
- `capability_map`
- `trust_boundaries`
- `guardrail_matrix`
- `policy_pack`
- `remedy_plan`
