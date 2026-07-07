# Sample Agents

This folder contains the paired AI-agent projects used by A-DAP-T's built-in demo scans.

- `vulnerable-support-agent` is intentionally built like a rushed student/developer AI support agent. It includes a FastAPI API surface, broad tool-calling behavior, persistent memory/RAG-style context use, dependency manifests, file/webhook helpers, exposed prompts, and multiple AppSec mistakes. It is designed to exercise the v3 scanners across dependencies, APIs, AppSec sinks, context poisoning, capability mapping, trust boundaries, guardrails, policy evaluation, and remedy planning.
- `secured-support-agent` keeps the same general product shape but adds safer patterns: environment-based secrets, pinned dependencies and lockfile, authenticated and rate-limited endpoints, restricted CORS, typed request models, prompt screening, human approval IDs, audit logging, PII masking, source metadata for memory/RAG, URL allowlists, safe file handling, safe archive extraction, and JWT verification.

These agents are demonstration fixtures for scanner validation and product walkthroughs. They are still intentionally compact, but they now represent realistic AI application patterns instead of tiny single-file examples.
