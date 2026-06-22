# Secured Support Agent

This is the safer companion project for the A-DAP-T demo scan.

It keeps the same product shape as the vulnerable agent — FastAPI backend, tool-calling support agent, memory, customer data, dependency manifests, and file/webhook helpers — but adds visible security controls:

- secrets loaded from environment variables
- typed request models and authenticated API dependencies
- visible rate-limit checks
- restricted CORS origins
- prompt-injection screening before tool use
- human approval IDs for refund/profile/email actions
- tool allowlist and scoped action policy
- structured audit logging with trace IDs
- PII masking before agent responses
- source metadata and sanitization before memory/RAG ingestion
- URL allowlist and private-network blocking for webhooks
- safe file path containment and safe archive extraction
- pinned dependencies and npm lockfile
- JWT verification with algorithm, issuer, audience, and expiration checks

This is still a demo fixture, not a production system, but it gives A-DAP-T realistic secure patterns to recognize.
