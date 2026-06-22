# A-DAP-T v3 Current Status

## Current branch

`v3-security-platform`

This branch is the active v3 rebuild branch. Do not create additional feature branches for small patch-sized work unless a later task becomes large enough to need isolation.

---

## v3 product direction

A-DAP-T v3 is moving from an AI-agent scanner into an AI application security assessment platform.

The v3 goal is to assess more than prompt/tool risks. The platform should understand the scanned project across:

- project structure
- frameworks and package managers
- dependencies
- API surface
- authentication and rate-limit posture
- AI-agent capabilities
- memory/context poisoning risks
- guardrail coverage
- policy-based deployment readiness
- remedy planning

The core v3 product direction is:

```text
Scan → Understand Project → Assess Security Surfaces → Map Capabilities → Check Guardrails → Build Remedy Plan → Gate Release
```

---

## Currently implemented features

## v1/v2 baseline still present

The existing A-DAP-T workflow is still intact:

- Firebase-authenticated scanning flow
- public GitHub repository scanning
- ZIP upload scanning
- built-in vulnerable and secured demo scans
- rule-based AI-agent risk findings
- safety score and status
- category risk scores
- saved report history through Firestore
- report reopening and deletion
- DAP report-aware assistant
- static attack simulations / Prove Mode
- patch previews
- deployment gate output
- report comparison / score delta
- Next.js frontend routes for landing, scanner, report, compare, profile, methodology, about, sign in, and sign up

## v3 Gate 1 foundation implemented

The first v3 backend foundation is implemented.

Every scan response now includes:

```text
schema_version: "3.0"
project_metadata
file_inventory
framework_detection
```

### Project metadata

`project_metadata` summarizes the scan context:

- project name
- scan type
- source type
- detected languages
- detected frameworks
- detected package managers
- number of scanned files
- number of scanned lines

### File inventory

`file_inventory` summarizes the scanned files:

- total scanned files
- supported files
- total lines
- total size
- language counts
- extension counts
- file roles
- package managers
- per-file metadata

File roles currently include:

- application code
- API surface
- agent logic
- dependency manifest
- configuration
- prompt
- test

### Framework detection

`framework_detection` detects:

- frontend frameworks such as Next.js and React
- backend frameworks such as FastAPI, Flask, Django, and Express
- agent frameworks such as LangChain, LangGraph, CrewAI, OpenAI tools, MCP, and custom agent patterns
- package managers such as npm, pip, pnpm, yarn, poetry, and pipenv
- deployment hints such as Vercel and Next.js config

## v3 Gate 2A dependency foundation implemented

The local dependency scanner foundation is implemented.

Every scan response now also includes:

```text
dependency_risks
```

The current dependency scanner supports local manifest analysis for:

- `package.json`
- `package-lock.json`
- `requirements.txt`

It currently detects:

- dependency manifest parse errors
- range-based npm versions such as `^`, `~`, `>`, `<`, `latest`, and `*`
- unpinned Python dependencies
- direct URL/git/editable dependencies
- missing npm lockfile when `package.json` is present
- suspicious or placeholder-like dependency names

This is intentionally a local-first dependency hygiene layer. Real CVE lookup through OSV.dev is planned after the local parser is stable.

---

## Architecture decisions

## 1. Deterministic artifacts before AI

A-DAP-T v3 must not depend on AI to produce core security findings.

The scanner should first produce deterministic artifacts:

- inventory
- framework detection
- dependency risks
- API surface
- app security findings
- memory/context poisoning findings
- capability map
- guardrail matrix
- remedy plan
- deployment gate

AI should explain, summarize, map, and help reason over these artifacts. It should not invent primary findings or decide the release verdict.

## 2. v3 schema must remain backward compatible

Old v2 reports should not break the frontend or saved report history.

The v3 schema adds new optional fields instead of deleting existing v2 fields.

Current v3 fields:

```text
schema_version
project_metadata
file_inventory
framework_detection
dependency_risks
```

Existing v2 fields such as findings, attack simulations, patches, deployment gate, and DAP context remain intact.

## 3. Scanned code is never executed

All current and future scanners must treat uploaded/GitHub code as untrusted text.

A-DAP-T should not import, execute, run tests for, or shell into scanned projects.

## 4. Local-first security analysis

The first implementation for each new scanner should work without external network calls.

External APIs such as OSV.dev should be added only after the local deterministic parser is stable and tested.

## 5. Report data model first, frontend redesign later

The frontend should not be redesigned around fake or incomplete data.

The correct v3 order is:

```text
backend artifacts → report schema → tests → report UI redesign → DAP upgrade
```

---

## Recently added / changed backend files

```text
backend/app/inventory/file_inventory.py
backend/app/inventory/framework_detector.py
backend/app/dependencies/dependency_scanner.py
backend/app/schemas/scan_schema.py
backend/app/services/scan_pipeline.py
backend/tests/test_v3_inventory.py
backend/tests/test_v3_dependency_scanner.py
docs/A-DAP-T-V3-REPORT-CONTRACT.md
docs/A-DAP-T-V3-CURRENT-STATUS.md
```

---

## Validation status

Current v3 foundation validation covers:

- v3 project inventory generation
- framework detection
- v3 schema compatibility
- dependency parser behavior
- dependency risk artifact integration
- existing v2 report artifact compatibility

Recommended validation command after each backend patch:

```bash
cd backend
python -m pytest -q tests/test_v3_inventory.py tests/test_v3_dependency_scanner.py tests/test_schemas.py tests/test_v2_report_artifacts.py
```

---

## Immediate next planned work

## Gate 2B: API surface and rate-limit scanner

Planned outputs:

```text
api_surface
api_risks
```

Planned detection:

- FastAPI routes
- Next.js API routes
- Express routes
- public mutation endpoints
- missing auth hints
- missing rate-limit hints
- upload endpoints without obvious size/type validation
- wildcard CORS indicators
- LLM-calling endpoints without quota or abuse controls

## Gate 2C: AppSec scanner subset

Planned detection:

- missing auth
- unsafe file upload
- path traversal
- SSRF
- RCE / shell execution
- weak JWT/auth config
- SQL injection patterns
- XSS patterns

## Gate 2D: Memory/context poisoning scanner

Planned detection:

- persistent chat history writes
- retrieved documents inserted into prompts
- vector DB ingestion without source metadata
- untrusted external content reused as context
- memory influencing future tool calls without trust boundaries

## Gate 3: v3 intelligence artifacts

Planned artifacts:

- capability map
- trust boundary map
- guardrail coverage matrix
- policy packs
- comprehensive remedy plan

## Gate 4: frontend v3 report redesign

Planned report sections:

- Overview
- Surfaces
- Dependencies
- API Surface
- Capabilities
- Trust Boundaries
- Guardrails
- Abuse Paths
- Remedy Plan
- Release Diff
- Raw Evidence
- DAP Reviewer

## Gate 5: DAP Security Reviewer v2

Planned DAP upgrades:

- action-based reviewer instead of simple chat
- report-aware explanations
- security-doc-aware retrieval over curated markdown notes
- on-demand AI abuse brief
- framework/control mapping

---

## Current risks / watch-outs

- The report schema will grow quickly. Keep schemas modular and optional.
- Dependency scanner currently does not perform CVE lookup yet.
- Current dependency risks are hygiene/supply-chain signals, not confirmed vulnerability advisories.
- v3 frontend should not be redesigned until API surface and capability artifacts exist.
- Do not overclaim that A-DAP-T replaces SAST, DAST, dependency audit tools, or professional security review.
- Keep every scanner evidence-backed with file/line/source references wherever possible.

---

## Current v3 status summary

```text
Gate 0: complete
Gate 1: complete
Gate 2A dependency foundation: complete
Gate 2B API surface scanner: next
Gate 2C AppSec subset: pending
Gate 2D memory/context poisoning scanner: pending
Gate 3 intelligence artifacts: pending
Gate 4 frontend redesign: pending
Gate 5 DAP Security Reviewer v2: pending
Gate 6 release diff and stabilization: pending
```

A-DAP-T v3 currently has the backend foundation needed to understand the scanned project structure and dependency posture. The next major step is to add API surface and rate-limit scanning.

---

## Gate 2B — API Surface + Memory/Context Poisoning Foundation

Implemented in the current patch:

- `api_surface` report artifact
- FastAPI route extraction
- Express route extraction
- Next.js API route detection
- Missing authentication heuristic
- Missing rate-limit heuristic
- Wildcard/weak CORS heuristic
- Upload endpoint validation heuristic
- LLM/API-cost endpoint tagging
- `context_poisoning_risks` report artifact
- Persistent memory write risk detection
- Vector/RAG ingestion source-control detection
- Retrieved-context-to-tool-decision risk detection

Architecture decision:

- These scanners remain deterministic and evidence-based.
- They do not execute code or call endpoints.
- They intentionally report missing visible controls, not runtime-proof vulnerabilities.
- They are attached as separate v3 artifacts rather than being forced into the old v2 score model.

Next planned backend gate:

- Gate 2C: AppSec scanner subset for missing auth, path traversal, unsafe file upload, SSRF, shell/RCE, JWT/auth config, SQLi patterns, and basic XSS patterns.
