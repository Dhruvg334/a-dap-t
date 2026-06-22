# A-DAP-T v3 Frontend Plan

## Purpose

This document defines the v3 frontend information architecture before visual redesign starts.

The backend now emits enough structured v3 artifacts for a proper security product UI. The frontend should stop treating the report as one long dashboard and instead guide the user through a release-review workflow.

Core frontend goal:

```text
Can I ship this project, what is risky, why is it risky, and what should I fix first?
```

---

## Main navigation

Recommended primary nav:

```text
Home
Scanner
Reports
Compare / Release Diff
Profile
Methodology
About
```

Profile should stay near auth/account controls, not duplicated in the center nav.

---

## Page map

## 1. Home / Landing page

Route:

```text
/
```

Purpose:

- explain A-DAP-T v3 positioning
- show the product loop
- route users to scan quickly
- make the app feel like an AI application security platform, not a toy scanner

Sections:

1. Hero
   - headline: AI application security before deployment
   - subheadline: scan code, APIs, dependencies, agent capabilities, memory risks, guardrails, and release policy
   - primary CTA: Start scan
   - secondary CTA: View methodology

2. Product loop
   - Scan
   - Map capabilities
   - Check guardrails
   - Build remedy plan
   - Gate release

3. Security surfaces covered
   - Dependencies
   - APIs
   - AppSec sinks
   - Memory/context poisoning
   - Agent capabilities
   - Trust boundaries

4. Demo path
   - Vulnerable demo
   - Secured demo
   - Compare release

5. Footer
   - GitHub
   - API docs
   - Methodology

Owner suggestion:

- Dhruv: messaging and product structure
- Akshhaya: visual polish and responsive layout

---

## 2. Scanner page

Route:

```text
/scanner
```

Purpose:

- let users run a scan
- choose source type
- choose policy pack
- understand what the scan will assess

Sections:

1. Source selector
   - Vulnerable demo
   - Secured demo
   - Public GitHub repo
   - ZIP upload
   - Private GitHub beta later, not v3 frontend MVP unless backend exists

2. Policy pack selector
   - General AI App
   - AI Agent with Tools
   - AI Coding Agent
   - Customer Support Agent
   - Data-Sensitive App
   - Public SaaS API

3. Scan configuration summary
   - selected source
   - selected policy
   - save report toggle
   - expected scan surfaces

4. Scan progress state
   - loading states for project loading, scanner, AI enrichment, save report
   - do not show a frozen button

5. Result redirect
   - after scan, store current report and go to `/report/current`

Owner suggestion:

- Dhruv: policy selector integration and scan contract
- Akshhaya: scanner layout and states

---

## 3. Current Report / v3 Report Workspace

Route:

```text
/report/current
```

Purpose:

This is the core v3 product page.

It should use a report shell with section navigation. Use tabs or a sticky left-side section nav.

Recommended sections:

```text
Overview
Security Surfaces
Dependencies
API Surface
Capabilities
Trust Boundaries
Guardrails
Policy
Remedy Plan
Evidence
DAP Reviewer
```

### 3.1 Overview section

Purpose:

Answer the release question immediately.

Content:

- project name
- source type
- selected policy
- legacy safety score
- v3 security score
- v3 status
- policy decision: ALLOW / REVIEW / BLOCK
- top 3 reasons
- top 3 remedy steps
- major surface counts:
  - dependency risks
  - API risks
  - AppSec risks
  - context risks
  - risky controls
  - weak boundaries

Design notes:

- decision card must be visually dominant
- explain if legacy score and v3 score differ
- avoid contradictions like “96 score but blocked” without explanation

### 3.2 Security Surfaces section

Purpose:

Show a compact security overview across all scanned surfaces.

Content:

- file inventory summary
- detected frameworks
- package managers
- API count
- dependency count
- capability count
- security-surface cards

### 3.3 Dependencies section

Uses:

```text
dependency_risks
```

Content:

- manifest summary
- risky dependency count
- pinned vs unpinned dependencies
- lockfile presence
- dependency risk table

Columns:

```text
Package
Ecosystem
Version spec
Risk type
Severity
Manifest
Recommended fix
```

Empty state:

- no dependency risks detected
- still show manifests found

### 3.4 API Surface section

Uses:

```text
api_surface
```

Content:

- endpoint table
- method
- path
- framework
- auth status
- rate-limit status
- tags
- risk level

Risk panel:

- missing auth
- missing rate limit
- weak CORS
- unsafe upload
- costly/LLM endpoint

### 3.5 Capabilities section

Uses:

```text
capability_map
```

Content:

- capability cards or table
- group by capability type:
  - API endpoint
  - external action
  - write action
  - file operation
  - memory operation
  - code execution
  - database access

Columns / card fields:

```text
Capability
Type
Risk
External effect
Data touched
Approval found
Audit found
Control gaps
Evidence
```

This is one of the most important v3 pages. It should answer “what can this project actually do?”

### 3.6 Trust Boundaries section

Uses:

```text
trust_boundaries
```

Content:

- simple horizontal/vertical flow visualization
- boundary cards below

Boundary card fields:

```text
From
To
Risk type
Status
Severity
Evidence
Recommended fix
```

Do not use a heavy graph library in the first version. A clean card-flow diagram is enough.

### 3.7 Guardrails section

Uses:

```text
guardrail_matrix
```

Content:

- control coverage table
- control status summary
- coverage percentage
- relevant/protected/risk instance counts

Columns:

```text
Control
Category
Status
Coverage
Risk instances
Evidence
Recommended action
```

This should be a flagship section. It shows that A-DAP-T is assessing controls, not just listing bugs.

### 3.8 Policy section

Uses:

```text
policy_evaluation
```

Content:

- selected policy
- decision
- minimum score
- v3 score
- score passed
- required controls passed/missing
- hard blockers
- review controls

Must explain:

```text
The policy gate uses v3_security_score and guardrail evidence. It does not depend only on the old safety score.
```

### 3.9 Remedy Plan section

Uses:

```text
remedy_plan
```

Content:

- prioritized remedy steps
- hard blockers first
- affected capabilities
- related controls
- why it matters
- recommended fix
- expected gate impact
- validation steps

This should become the main fix workflow, replacing the old scattered remediation checklist.

### 3.10 Evidence section

Uses all artifacts.

Content:

- raw findings
- AppSec risks
- API risks
- context risks
- dependency risks
- JSON download

This is for technical users who want evidence details.

### 3.11 DAP Reviewer section / drawer

Uses:

```text
current report context
future security knowledge base
```

v3 UI should make DAP action-based:

- Explain gate decision
- Prioritize fixes
- Explain a selected risk
- Generate abuse brief
- Create release review summary
- Ask custom question

Do not make DAP the center of the product. It should support the report.

Owner suggestion:

- Dhruv: report architecture and Overview/Policy/Remedy sections
- Akshhaya: Dependencies/API/Guardrails table components and responsive polish
- Pavit: Release Diff/Compare support if needed

---

## 4. Compare / Release Diff page

Route:

```text
/compare
```

Purpose:

Compare two saved scans and explain whether the release improved.

Rename in UI:

```text
Release Diff
```

Sections:

1. Report selectors
   - before report
   - after report

2. Summary
   - legacy score delta
   - v3 score delta
   - policy decision movement
   - blocker movement

3. Surface changes
   - dependency risk delta
   - API risk delta
   - AppSec risk delta
   - context risk delta
   - guardrail coverage delta

4. Remedy progress
   - fixed remedy items
   - remaining remedy items
   - new remedy items

5. Remaining release risk
   - what still blocks or needs review

Owner suggestion:

- Pavit: core compare logic
- Dhruv: v3 comparison rules and wording
- Akshhaya: layout polish

---

## 5. Profile / Projects page

Route:

```text
/profile
```

Purpose:

Saved scan history and project-level organization.

For v3, keep it simple:

- saved reports
- scores
- policy decision
- source type
- date
- project group labels
- view report
- compare from this report
- delete report

Future v4:

- persistent project workspaces
- GitHub-connected repos
- scheduled rescans

Owner suggestion:

- Akshhaya: UI polish
- Dhruv: report opening/comparison contract

---

## 6. Methodology page

Route:

```text
/methodology
```

Purpose:

Explain how A-DAP-T works without overclaiming.

Sections:

- what is scanned
- what is not executed
- legacy safety score vs v3 security score
- policy packs
- guardrail matrix
- limitations
- why AI does not decide findings or gate verdicts

This page is important for credibility.

---

## 7. About page

Route:

```text
/about
```

Purpose:

Product story and positioning.

Sections:

- why A-DAP-T exists
- who it is for
- what makes v3 different
- team
- limitations

---

## 8. Auth pages

Routes:

```text
/signin
/signup
```

Keep them clean. Do not over-invest until core report UI is done.

---

## Implementation order for frontend

Do not rebuild every page at once.

Recommended order:

```text
1. TypeScript report types for v3 artifacts
2. ReportWorkspace v3 shell and section navigation
3. Overview + Policy + Remedy sections
4. Dependencies + API Surface sections
5. Capabilities + Trust Boundaries sections
6. Guardrail Matrix section
7. Release Diff upgrade
8. Profile minor updates for v3 score/policy decision
9. Methodology update
10. Landing page repositioning
```

---

## Non-negotiable frontend rules

- No cramped cards.
- Prefer tables where comparison matters.
- Use cards only for summaries and prioritized actions.
- Every section needs an empty state.
- Every section needs a short explanation.
- Do not show raw JSON-like objects in normal UI.
- Do not rely on the old `safety_score` alone.
- Clearly separate `safety_score` and `v3_security_score`.
- DAP should be action-based, not a generic chatbot.
