# A-DAP-T

**A-DAP-T** is a pre-deployment AI-agent risk scanner for GenAI and agentic application projects.

It helps developers identify common AI-agent safety and security risks before deployment, including exposed secrets, unsafe tool permissions, missing human approval gates, weak auditability, sensitive data exposure, and prompt-injection-prone workflows.

---

## Problem

AI agents are increasingly connected to tools, APIs, files, databases, customer records, emails, and business workflows.

That creates risks that traditional repository analyzers do not focus on:

* prompts can manipulate agent behavior
* tools may be callable without approval
* API keys and secrets may be exposed in code
* sensitive data may be returned without masking
* agent actions may not be logged
* developers may not clearly understand what their agent is allowed to do

A-DAP-T focuses specifically on **AI-agent deployment risk visibility**.

---

## Solution

A-DAP-T scans AI-agent projects and generates a safety-focused dashboard showing:

* overall AI-agent safety score
* exposed secret risks
* dangerous tool/function risks
* missing human approval gaps
* weak auditability/logging gaps
* prompt injection risk indicators
* simulated attack replay
* agent-to-tool permission graph
* remediation checklist
* AI-generated scan explanation
* scan report

The goal is to help developers catch common high-risk patterns before deployment.

---

## Core Demo

The main demo uses a customer support/refund AI agent.

The vulnerable version includes risks such as:

* hardcoded demo secrets
* refund tool callable without approval
* customer data access without masking
* weak or missing audit logging
* internal policy exposure
* unsafe tool behavior under prompt injection

The secured version improves the same workflow with:

* environment-based secret loading
* approval gates for risky actions
* audit logging
* masked sensitive data
* safer tool design
* basic suspicious prompt handling

Expected demo contrast:

* vulnerable-support-agent: high-risk score range
* secured-support-agent: low-risk / strong score range

---

## Current Features

* Static frontend
* FastAPI backend
* Built-in vulnerable AI support agent
* Built-in secured AI support agent
* Demo scan endpoints
* ZIP upload scanning endpoint
* Secret exposure scanner
* Dangerous tool/function scanner
* Human approval gap scanner
* Audit/logging gap scanner
* Risk scoring
* Permission graph data
* Attack replay data
* Remediation checklist
* Gemini AI enrichment layer
* AI-generated scan summary
* AI-generated remediation plan
* AI-generated report summary
* AI-generated developer next steps
* Methodology and evaluation documentation

---

## Risk Categories

A-DAP-T evaluates six AI-agent risk categories:

* Prompt Injection Risk
* Secret Exposure Risk
* Tool Permission Risk
* Human Approval Risk
* Data Exposure Risk
* Auditability Risk

---

## Tech Stack

### Frontend

* Static HTML
* CSS
* JavaScript
* Backend API integration through FastAPI endpoints

### Backend

* Python
* FastAPI
* Pydantic
* Uvicorn
* Rule-based scanner modules
* Temporary ZIP extraction and safe file scanning

### AI Layer

* Gemini AI enrichment
* Static fallback when Gemini is unavailable
* Core detection remains rule-based and explainable

---

## Project Structure

```
a-dap-t/
  frontend/
    index.html
    main.js
    shared.css
    pages/
      scanner.html
      dashboard.html
      report.html
      methodology.html

  backend/
    main.py
    requirements.txt
    .env.example
    app/
      ai/
      scanners/
      risk/
      schemas/
      utils/
      graph/
      attack_lab/
      content/

  sample_agents/
    vulnerable-support-agent/
    secured-support-agent/

  docs/
    mock_responses/
    evaluation/
    THREAT_MODEL.md
    SCORING_METHODOLOGY.md
    LIMITATIONS.md
    DEMO_SCRIPT.md
    BACKEND_AI_INTEGRATION_NOTES.md
    GEMINI_INTEGRATION_PLAN.md
```

---

## Run Locally

### 1. Run Backend

From the project root:

```
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at:

```
http://127.0.0.1:8000
```

Useful endpoints:

```
http://127.0.0.1:8000/health
http://127.0.0.1:8000/scan/demo/vulnerable
http://127.0.0.1:8000/scan/demo/secured
http://127.0.0.1:8000/docs
```

### 2. Run Frontend

Open a second terminal from the project root:

```
cd frontend
python -m http.server 5173
```

Frontend runs at:

```
http://localhost:5173/index.html
```

Pages:

```
http://localhost:5173/pages/scanner.html
http://localhost:5173/pages/dashboard.html
http://localhost:5173/pages/report.html
http://localhost:5173/pages/methodology.html
```

---

## Environment Variables

Create a local backend `.env` file only for local development if needed.

Do not commit real secrets.

Expected variables:

```
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

If `GEMINI_API_KEY` is missing, A-DAP-T still works using static fallback AI text.

---

## Backend Endpoints

### GET /health

Returns backend health status.

### GET /scan/demo/vulnerable

Scans the built-in vulnerable support agent.

Target folder:

```
sample_agents/vulnerable-support-agent
```

### GET /scan/demo/secured

Scans the built-in secured support agent.

Target folder:

```
sample_agents/secured-support-agent
```

### POST /scan/upload

Accepts a ZIP file and scans supported project files.

Current upload rules:

* maximum ZIP size: 20 MB
* maximum files: 300
* maximum nesting depth: 6
* maximum single file size: 500 KB
* uploaded code is not executed
* files are read as text only

---

## Expected Scan Response Shape

A-DAP-T scan endpoints return a structured response containing:

* project_name
* scan_type
* safety_score
* status
* summary
* category_scores
* findings
* graph
* attack_replay
* remediation_checklist
* ai_summary
* ai_remediation_plan
* ai_report_summary
* ai_next_steps
* ai_enrichment_status

Mock examples are available in:

```
docs/mock_responses/
```

---

## AI Enrichment

A-DAP-T uses Gemini after scanner output is generated.

Gemini does not decide:

* findings
* severity
* category scores
* safety score
* deployment status

Gemini is used only for:

* scan summary
* remediation plan
* report summary
* developer next steps

If Gemini is unavailable, the backend returns fallback AI text so the app still works.

---

## Current Status

The current V1 build includes:

* frontend connected to backend scan flow
* FastAPI backend
* demo scan endpoints
* ZIP upload endpoint
* rule-based scanner modules
* vulnerable and secured sample agents
* scanner score separation for demo agents
* Gemini AI enrichment
* report rendering from backend response
* dashboard rendering from backend response
* methodology and evaluation docs

Still pending:

* deployment
* production backend URL configuration
* final hosted end-to-end testing
* optional V2 features after V1 deployment

The current scope is focused on a polished MVP, not a full enterprise security platform.

---

## Limitations

A-DAP-T is an MVP and uses heuristic static scanning plus controlled attack simulation.

It does not:

* execute arbitrary uploaded projects
* replace a professional security audit
* detect every possible vulnerability
* fully validate runtime agent behavior
* guarantee that an AI agent is safe

It is designed to provide early risk visibility for developers building AI-agent systems.

---

## Planned V2 Features

After V1 deployment, planned upgrades include:

* public GitHub repository link scanning
* user accounts and authentication
* user profile page
* saved report history
* report-aware AI assistant
* optional local LLM / Ollama provider support
* larger UI/UX upgrade

These are not part of the V1 deployment scope.

---

## Team

Built by:

* Dhruv Gupta — Backend, AI enrichment, attack/remediation logic, integration
* Akshhaya Isa — Frontend
* Pavit Aggarwal — Backend scanner
