# A-DAP-T v3 Current Status

## Current branch

`v3-security-platform`

This branch is the active v3 rebuild branch. Do not create additional feature branches for small patch-sized work unless a task becomes large enough to need isolation.

---

## v3 product direction

A-DAP-T v3 is moving from an AI-agent scanner into an AI application security assessment platform.

The v3 product loop is:

```text
Scan → Understand Project → Assess Security Surfaces → Map Capabilities → Check Guardrails → Evaluate Policy → Build Remedy Plan → Gate Release
```

The platform should understand the scanned project across:

- project structure
- frameworks and package managers
- dependencies
- API surface
- authentication and rate-limit posture
- traditional AppSec sink patterns
- memory/context poisoning risks
- AI-agent and application capabilities
- trust boundaries
- guardrail coverage
- policy-based deployment readiness
- remedy planning

---

## Currently implemented baseline

The existing v1/v2 workflow is still intact:

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

---

## v3 implemented artifacts

Every scan response now includes the following v3 artifacts while keeping v2 fields backward compatible.

### Gate 1 — Project understanding foundation

Implemented:

- `schema_version: "3.0"`
- `project_metadata`
- `file_inventory`
- `framework_detection`

Purpose:

- identify project shape before deeper scanners run
- detect languages, file roles, package managers, frameworks, and deployment hints
- keep analysis deterministic and safe

### Gate 2A — Dependency scanner foundation

Implemented:

- `dependency_risks`
- `package.json` parser
- `package-lock.json` parser
- `requirements.txt` parser
- unpinned npm dependency detection
- unpinned Python dependency detection
- direct URL/git/editable dependency detection
- invalid manifest detection
- missing npm lockfile detection
- suspicious/placeholder package name detection

Current limitation:

- no OSV/CVE lookup yet
- current dependency findings are local hygiene/supply-chain signals, not confirmed vulnerability advisories

### Gate 2B — API surface + memory/context risk foundation

Implemented:

- `api_surface`
- FastAPI route extraction
- Express route extraction
- Next.js API route detection
- missing visible authentication heuristic
- missing visible rate-limit heuristic
- weak/wildcard CORS heuristic
- upload endpoint risk heuristic
- LLM/API-cost endpoint tagging
- `context_poisoning_risks`
- persistent memory write risk detection
- vector/RAG ingestion source-control detection
- retrieved-context-to-tool-decision risk detection

### Gate 2C — AppSec scanner subset

Implemented:

- `appsec_risks`
- path traversal detection
- SSRF sink detection
- command/code execution sink detection
- dynamic SQL construction detection
- raw HTML/XSS sink detection
- weak JWT/auth config detection
- unsafe deserialization detection
- unsafe archive extraction detection

Scanner behavior:

- skips comment-only lines
- uses bounded nearby context windows
- suppresses obvious false positives when visible controls exist
- reports confidence instead of claiming every sink is exploitable

### Gate 3A — Capability map + trust boundary map

Implemented:

- `capability_map`
- static function capability extraction for Python, JS, TS, JSX, and TSX
- API endpoint capability extraction
- AppSec-derived capability extraction
- context-risk-derived capability extraction
- capability types for read, write, external, file, memory, API, database, auth, and code execution behavior
- approval/audit/allowlist/control-gap detection around capabilities
- `trust_boundaries`
- boundaries for unauthenticated API input, missing abuse throttling, privileged actions without approval, external effects without audit logs, sensitive data without masking, context poisoning, and high-impact AppSec sinks

### Gate 3B — Guardrail coverage matrix

Implemented:

- `guardrail_matrix`
- coverage calculation for security controls across existing deterministic artifacts
- relevant/protected/risk instance counts
- statuses: `strong`, `partial`, `weak`, `not_applicable`, `unknown`
- evidence snippets and related artifact IDs
- recommended control-specific action

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

### Gate 3C — Policy packs + comprehensive remedy plan

Implemented in the current patch:

- `policy_evaluation`
- `remedy_plan`
- policy pack catalog
- deterministic v3 policy evaluation
- hard blocker detection from guardrail gaps and risk types
- required-control review detection
- v3 gate score calculation
- prioritized remedy plan generation
- release path guidance
- validation steps per remedy action

Initial policy packs:

- `general_ai_app`
- `agent_with_tools`
- `ai_coding_agent`
- `customer_support_agent`
- `data_sensitive_app`
- `public_saas_api`

Architecture decision:

- Policy packs consume deterministic v3 artifacts. AI does not decide release posture.
- The old v2 deployment gate remains unchanged for frontend compatibility.
- `policy_evaluation` is the v3 release-policy signal.
- `remedy_plan` is the v3 fix-sequencing artifact and should become the main fix UI in the frontend redesign.


### Demo fixtures refresh — v3-aligned vulnerable and secured agents

Implemented after Gate 3C:

- upgraded `sample_agents/vulnerable-support-agent` from a tiny toy agent into a realistic insecure AI support-agent project
- upgraded `sample_agents/secured-support-agent` into a safer companion project with the same product shape
- added dependency manifests so dependency scanning is visible in demo scans
- added FastAPI routes so API surface, auth, rate-limit, upload, and CORS checks are exercised
- added memory/RAG-style files so context poisoning checks are exercised
- added vulnerable AppSec sinks: SSRF, path traversal, unsafe archive extraction, dynamic SQL, command execution, unsafe deserialization, and weak JWT verification
- added safer controls in the secured agent: environment secrets, pinned dependencies, lockfile, authentication, rate-limit hook, typed requests, CORS restriction, approval IDs, audit logs, URL allowlist, safe path handling, safe archive extraction, and source metadata
- removed fixed demo score overrides so demo scores now come from the scanner output instead of hardcoded values

Architecture decision:

- demo agents should exercise the same v3 artifacts as real scans; otherwise the demo becomes misleading as the scanner grows.
- old v2 demo graph/replay text remains for frontend compatibility, but score/status now stay scanner-driven.

---

## Current architecture decisions

## 1. Deterministic artifacts before AI

A-DAP-T v3 must not depend on AI to produce primary findings, scores, release decisions, or blocker logic.

AI should explain, summarize, map, and help reason over deterministic artifacts. It should not invent primary findings or decide release verdicts.

## 2. v3 schema remains backward compatible

Old v2 reports should not break frontend or saved report history.

The v3 schema adds optional fields instead of deleting existing v2 fields.

Current v3 top-level fields:

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
guardrail_matrix
policy_evaluation
remedy_plan
```

## 3. Scanned code is never executed

All scanners treat uploaded/GitHub code as untrusted text.

A-DAP-T should not import, execute, run tests for, or shell into scanned projects.

## 4. Local-first security analysis

The first implementation for each new scanner should work without external network calls.

External APIs such as OSV.dev should be added only after local deterministic parsers are stable and tested.

## 5. Report data model first, frontend redesign later

The frontend should not be redesigned around fake or incomplete data.

Correct v3 order:

```text
backend artifacts → report schema → tests → report UI redesign → DAP upgrade
```

---

## Recently added / changed backend files

```text
backend/app/inventory/file_inventory.py
backend/app/inventory/framework_detector.py
backend/app/dependencies/dependency_scanner.py
backend/app/api_security/api_surface_scanner.py
backend/app/context_security/context_poisoning_scanner.py
backend/app/appsec/appsec_scanner.py
backend/app/capabilities/capability_mapper.py
backend/app/capabilities/trust_boundary_mapper.py
backend/app/guardrails/coverage_matrix.py
backend/app/policies/policy_packs.py
backend/app/remedy/remedy_planner.py
backend/app/schemas/scan_schema.py
backend/app/services/scan_pipeline.py
```

Recent test files:

```text
backend/tests/test_v3_inventory.py
backend/tests/test_v3_dependency_scanner.py
backend/tests/test_v3_api_surface_scanner.py
backend/tests/test_v3_appsec_scanner.py
backend/tests/test_v3_capability_map.py
backend/tests/test_v3_guardrail_matrix.py
backend/tests/test_v3_policy_remedy.py
```

---

## Validation status

Recommended backend validation command after Gate 3C:

```bash
cd backend
python -m pytest -q tests/test_v3_inventory.py tests/test_v3_dependency_scanner.py tests/test_v3_api_surface_scanner.py tests/test_v3_appsec_scanner.py tests/test_v3_capability_map.py tests/test_v3_guardrail_matrix.py tests/test_v3_policy_remedy.py tests/test_schemas.py tests/test_v2_report_artifacts.py
python scripts/v2_smoke_report_artifacts.py
```

Expected result after current patch:

```text
96 passed
v2 smoke artifacts still generated
```

---

## Immediate next planned work

## Gate 4 — Frontend v3 report redesign

Now that the backend has enough real v3 data, frontend redesign can start.

Planned report information architecture:

- Overview
- Surfaces
- Dependencies
- API Surface
- Capabilities
- Trust Boundaries
- Guardrails
- Policy
- Remedy Plan
- Release Diff
- Raw Evidence
- DAP Reviewer

Key frontend requirements:

- do not dump all artifacts into one long page
- use tabs or left-side report navigation
- overview must answer: can I ship, why not, what should I fix first
- remedy plan should be a primary section, not buried under patch previews
- guardrail matrix must be readable as a table
- capability and trust-boundary sections must be visual and simple

## Gate 5 — DAP Security Reviewer v2

Planned DAP upgrades:

- action-based reviewer instead of simple chat
- Explain Gate Decision
- Prioritize Fixes
- Review API Surface
- Explain Dependency Risk
- Explain Memory Poisoning Risk
- Generate Abuse Brief
- Create Release Review Summary
- security-doc-aware retrieval over curated markdown notes

## Later backend upgrades

- OSV.dev dependency vulnerability lookup
- private GitHub repo scan beta
- v3-native scoring model
- v3 deployment gate replacing old v2 gate
- Release Diff over v3 artifacts

---

## Current risks / watch-outs

- The report object is now large. Frontend must load/render sections lazily.
- `policy_evaluation` currently defaults to `general_ai_app` unless policy selection is passed later.
- Scanner page does not yet expose v3 policy selection.
- v3 policy evaluation is separate from old `deployment_gate`; frontend must distinguish them clearly.
- Dependency scanner does not yet do CVE lookup.
- Private GitHub scanning is not implemented yet.
- Do not overclaim that A-DAP-T replaces SAST, DAST, dependency audit tools, or professional security review.

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
Gate 3C policy packs and remedy plan: complete
Gate 4 frontend redesign: pending
Gate 5 DAP Security Reviewer v2: pending
Gate 6 release diff and stabilization: pending
```

A-DAP-T v3 now has the backend foundation needed to understand project structure, dependency posture, API surface, context/memory poisoning risks, application-security sink patterns, capabilities, trust boundaries, guardrail coverage, selected policy posture, and prioritized remedy actions.
