# A-DAP-T

**A-DAP-T** is a pre-deployment risk scanning dashboard for AI-agent and GenAI application projects.

It helps developers identify common AI-agent safety and security risks such as exposed secrets, unsafe tool permissions, missing human approval gates, weak auditability, and prompt-injection-prone workflows before deployment.

---

## Problem

AI agents are no longer limited to answering questions. They can access tools, APIs, files, databases, emails, customer records, and business workflows.

That creates a new class of risks:

- prompts can manipulate agent behavior
- tools may be callable without approval
- API keys may be exposed in code
- sensitive data may be returned without masking
- agent actions may not be logged
- developers may not clearly understand what their agent is allowed to do

Traditional repository analyzers focus on code quality and documentation. A-DAP-T focuses specifically on **AI-agent risk visibility**.

---

## Solution

A-DAP-T scans AI-agent projects and generates a safety-focused dashboard showing:

- overall AI-agent safety score
- exposed secret risks
- dangerous tool/function risks
- missing human approval gaps
- weak auditability/logging gaps
- simulated prompt injection attack replay
- agent-to-tool permission graph
- remediation suggestions
- printable security report

The goal is to help developers catch common high-risk patterns before deployment.

---

## Core Demo

The main demo uses a customer support/refund AI agent.

The vulnerable version includes risks such as:

- hardcoded API key
- refund tool callable without approval
- customer data access without masking
- weak or missing audit logging
- exposed internal policy/system prompt
- unsafe tool behavior under prompt injection

The secured version improves the same workflow with:

- environment-based secrets
- approval gates for risky actions
- audit logging
- masked sensitive data
- safer tool design

---

## Planned MVP Features

- Built-in vulnerable AI support agent
- Built-in secured AI support agent
- ZIP upload for project scanning
- Secret exposure scanner
- Dangerous tool/function scanner
- Human approval gap scanner
- Audit/logging gap scanner
- Prompt injection attack simulation
- Permission graph for agent-tool relationships
- Safety score dashboard
- Findings table with severity
- Remediation checklist
- Before/after comparison
- Printable HTML report

---

## Tech Stack

### Frontend

- React / Vite
- Tailwind CSS
- Recharts
- React Flow
- Lucide React

### Backend

- FastAPI
- Python
- Rule-based scanner modules
- Temporary ZIP extraction
- Gemini API for optional explanation generation

### Deployment

- Frontend: Vercel
- Backend: Render / Railway

---

## Project Structure

```text
adap-t/
  frontend/
  backend/
  sample_agents/
    vulnerable-support-agent/
    secured-support-agent/
  docs/
```

---

## Current Status

Initial build in progress.

The current scope is intentionally focused on a polished MVP, not a full enterprise security platform.

---

## Limitations

A-DAP-T is a MVP and uses heuristic static scanning plus controlled attack simulation.

It does not:

- execute arbitrary uploaded projects
- replace a professional security audit
- detect every possible vulnerability
- fully validate runtime agent behavior
- guarantee that an AI agent is safe

It is designed to provide early risk visibility for developers building AI-agent systems.

---

## Team

Built by:
- Dhruv Gupta (Backend + AI Logic)
- Akshhaya Isa (Frontend)
- Pavit Aggarwal (Backend + AI)


