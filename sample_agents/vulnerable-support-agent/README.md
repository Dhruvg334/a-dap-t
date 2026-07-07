# Vulnerable Support Agent

This is an intentionally vulnerable AI support-agent project used by A-DAP-T's built-in demo scan.

It now represents a more realistic student/developer-built agent rather than a tiny toy script. The app mixes a FastAPI backend, tool-calling agent logic, persistent memory, dependency manifests, API endpoints, file upload/download helpers, customer data, and RAG-style context handling.

Intentional risks include:

- hardcoded API/JWT secrets
- exposed system prompt and internal refund policy
- public API endpoints with missing auth and missing rate limits
- unsafe CORS configuration
- direct refund/email/customer-data tools without approval gates
- customer PII passed directly into agent responses
- persistent memory writes without sanitization/source trust
- vector/RAG ingestion without source metadata
- retrieved context influencing tool decisions
- SSRF through user-controlled webhook/URL fetching
- path traversal through user-controlled filenames
- unsafe archive extraction
- dynamic SQL construction
- command execution through a prompt-controlled utility
- unpinned/direct-source dependencies and missing lockfile discipline
- weak JWT decoding / auth verification patterns
- missing structured audit logs

The code is deliberately unsafe and must not be reused in production.
