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
api_surface
context_poisoning_risks
appsec_risks
capability_map
trust_boundaries
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
Gate 2B API surface + context poisoning scanner: complete
Gate 2C AppSec subset: complete
Gate 3A capability map + trust boundaries: complete
Gate 3B guardrail coverage matrix: complete
Gate 3C policy packs and remedy plan: pending
Gate 4 frontend redesign: pending
Gate 5 DAP Security Reviewer v2: pending
Gate 6 release diff and stabilization: pending
```

A-DAP-T v3 currently has the backend foundation needed to understand the scanned project structure, dependency posture, API surface, context/memory poisoning risks, and core application-security sink patterns.

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

## Gate 2C — Application Security Scanner Subset

Implemented in the current patch:

- `appsec_risks` report artifact
- Path traversal / unsafe file path detection
- SSRF sink detection for user-controlled outbound URLs
- Shell/code execution sink detection
- Dynamic SQL construction detection
- Raw HTML/XSS sink detection
- Weak JWT/auth verification configuration detection
- Unsafe deserialization detection
- Unsafe archive extraction detection

Architecture decision:

- AppSec checks are kept separate from `api_surface` because endpoint exposure and code sink analysis answer different questions.
- The scanner is pattern-based and evidence-first. It flags risky code paths for review rather than claiming full exploit proof.
- Edge cases are handled conservatively: comments are skipped, nearby control terms suppress obvious false positives, evidence is bounded, and duplicate hits are deduped.

Next planned backend gate:

- Gate 3A: Agent/app capability map.
- Gate 3B: Trust boundary map.
- Gate 3C: Guardrail coverage matrix.
- Gate 3D: Policy packs and remedy plan.


## Gate 3A — Capability Map + Trust Boundary Map

Implemented in the current patch:

- `capability_map` report artifact
- static function capability extraction for Python, JavaScript, TypeScript, JSX, and TSX
- API endpoint capabilities derived from `api_surface`
- security-sensitive sink capabilities derived from `appsec_risks`
- memory/context capabilities derived from `context_poisoning_risks`
- capability risk levels: low, medium, high, critical
- capability types including read, write, external, code execution, file, memory, API endpoint, database, auth boundary, and context-to-tool flow
- data touched detection for sensitive terms such as customer, email, token, payment, profile, and PII
- control gap detection for missing approval, missing audit logging, missing allowlist/scope, and sensitive data without visible masking
- `trust_boundaries` report artifact
- boundary generation for unauthenticated API input, missing abuse throttling, privileged actions without approval, external effects without audit logs, sensitive data without masking, context poisoning, and high-impact AppSec sinks

Architecture decision:

- Capability mapping is a product intelligence layer, not a vulnerability scanner by itself. It explains what the project appears able to do and which controls are visible around those abilities.
- Trust boundaries are derived from existing deterministic artifacts. This avoids adding another independent heuristic layer that can drift from evidence.
- The old v2 scoring is still not changed. v3 scoring and policy evaluation should be added only after guardrail matrix and policy packs exist.

Next planned backend gate:

- Gate 3C: Policy packs and comprehensive remedy plan.

## Gate 3B — Guardrail Coverage Matrix

Implemented in the current patch:

- `guardrail_matrix` report artifact
- control coverage calculation across API security, access control, input handling, output handling, AI security, agent controls, observability, secrets, supply chain, data protection, and execution safety
- relevant/protected/risk instance counts per control
- coverage status values: `strong`, `partial`, `weak`, `not_applicable`, and `unknown`
- evidence snippets and related artifact IDs per control
- recommended action per guardrail
- critical control gap counting for authentication, authorization, human approval, tool allowlisting, memory/context isolation, and command execution sandboxing

Controls currently covered:

- authentication
- authorization
- rate limiting
- CORS policy
- file upload safety
- input validation
- output encoding
- prompt injection defense
- tool allowlist/scope restriction
- human approval
- audit logging
- secrets management
- dependency security
- memory/context isolation
- PII masking
- command execution sandboxing

Architecture decision:

- The guardrail matrix is a synthesis layer over existing deterministic artifacts. It should not independently invent risks.
- Coverage means visible static evidence coverage, not runtime assurance.
- Controls with no relevant detected instances are marked `not_applicable`, not weak. This avoids making A-DAP-T noisy on projects where a control is irrelevant.
- v3 scoring and policy packs should consume this matrix later; the old v2 scoring model remains unchanged for now.

Next planned backend gate:

- Gate 3C: Policy packs and comprehensive remedy plan.
