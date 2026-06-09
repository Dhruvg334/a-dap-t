from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="A-DAP-T Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "A-DAP-T backend"
    }


@app.get("/scan/demo/vulnerable")
def scan_vulnerable_demo():
    return {
        "project_name": "vulnerable-support-agent",
        "scan_type": "demo_vulnerable",
        "safety_score": 34,
        "status": "Critical Risk",
        "summary": {
            "critical": 4,
            "high": 3,
            "medium": 2,
            "low": 1
        },
        "category_scores": {
            "prompt_injection": 82,
            "secret_exposure": 90,
            "tool_permission": 78,
            "human_approval": 85,
            "data_exposure": 60,
            "auditability": 70
        },
        "findings": [
            {
                "title": "Refund tool callable without approval",
                "severity": "Critical",
                "category": "Human Approval Risk",
                "file": "tools.py",
                "line": 18,
                "why_it_matters": "The agent can trigger a financial action directly without human review.",
                "suggested_fix": "Add a human approval checkpoint before executing refund actions."
            },
            {
                "title": "Hardcoded API key detected",
                "severity": "Critical",
                "category": "Secret Exposure Risk",
                "file": "config.py",
                "line": 4,
                "why_it_matters": "Hardcoded secrets can leak if the project is pushed to a public repository.",
                "suggested_fix": "Move API keys to environment variables and keep .env files out of Git."
            }
        ],
        "graph": {
            "nodes": [
                {"id": "user", "label": "User Prompt"},
                {"id": "agent", "label": "LLM Agent"},
                {"id": "refund", "label": "issue_refund()"},
                {"id": "customer_db", "label": "Customer Data"},
                {"id": "email", "label": "send_email()"}
            ],
            "edges": [
                {"source": "user", "target": "agent", "risk": "medium"},
                {"source": "agent", "target": "refund", "risk": "critical"},
                {"source": "agent", "target": "customer_db", "risk": "high"},
                {"source": "agent", "target": "email", "risk": "high"}
            ]
        },
        "attack_replay": [
            "Malicious prompt received",
            "Agent accepts fake admin role",
            "Agent reads internal policy",
            "Agent accesses customer record",
            "Agent calls issue_refund()",
            "No approval gate found",
            "Critical risk flagged"
        ],
        "remediation_checklist": [
            "Move secrets to environment variables",
            "Add approval gate before refund actions",
            "Add audit logging for tool calls",
            "Mask sensitive customer data",
            "Keep system prompts server-side"
        ]
    }


@app.get("/scan/demo/secured")
def scan_secured_demo():
    return {
        "project_name": "secured-support-agent",
        "scan_type": "demo_secured",
        "safety_score": 86,
        "status": "Low Risk",
        "summary": {
            "critical": 0,
            "high": 1,
            "medium": 2,
            "low": 2
        },
        "category_scores": {
            "prompt_injection": 25,
            "secret_exposure": 5,
            "tool_permission": 25,
            "human_approval": 10,
            "data_exposure": 20,
            "auditability": 10
        },
        "findings": [
            {
                "title": "Prompt injection attempts routed to safe response",
                "severity": "Medium",
                "category": "Prompt Injection Risk",
                "file": "agent.py",
                "line": 22,
                "why_it_matters": "The agent still receives untrusted user prompts, but risky actions are gated.",
                "suggested_fix": "Continue expanding adversarial prompt tests before production deployment."
            }
        ],
        "graph": {
            "nodes": [
                {"id": "user", "label": "User Prompt"},
                {"id": "agent", "label": "LLM Agent"},
                {"id": "approval", "label": "Human Approval Gate"},
                {"id": "refund", "label": "issue_refund()"},
                {"id": "audit", "label": "Audit Log"}
            ],
            "edges": [
                {"source": "user", "target": "agent", "risk": "medium"},
                {"source": "agent", "target": "approval", "risk": "low"},
                {"source": "approval", "target": "refund", "risk": "medium"},
                {"source": "refund", "target": "audit", "risk": "low"}
            ]
        },
        "attack_replay": [
            "Malicious prompt received",
            "Agent identifies risky refund request",
            "Sensitive customer data is masked",
            "Refund action is routed to human approval",
            "Tool call is logged",
            "Risk reduced"
        ],
        "remediation_checklist": [
            "Continue adversarial testing",
            "Add more tool-level unit tests",
            "Monitor failed attack attempts",
            "Review approval logs periodically"
        ]
    }