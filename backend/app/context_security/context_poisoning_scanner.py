from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class ContextRisk:
    id: str
    title: str
    severity: str
    risk_type: str
    file: str
    line: int
    evidence: str
    source: str
    sink: str
    missing_control: str
    why_it_matters: str
    recommended_fix: str


_MEMORY_WRITE_PATTERNS = (
    "chat_history.append",
    "messages.append",
    "conversation_history.append",
    "memory.save",
    "save_context",
    "add_message",
    "firestore",
    "redis",
)
_VECTOR_INGEST_PATTERNS = (
    "add_documents",
    "from_documents",
    "vectorstore.add",
    "chroma.from_documents",
    "pinecone",
    "supabase_vector",
    "embeddings",
)
_RETRIEVAL_TO_PROMPT_PATTERNS = (
    "retriever.invoke",
    "similarity_search",
    "get_relevant_documents",
    "context =",
    "rag",
    "prompt.format",
    "system_prompt",
)
_SANITIZATION_TERMS = (
    "sanitize",
    "strip_prompt_injection",
    "validate_source",
    "trusted_source",
    "source_metadata",
    "content_filter",
    "redact",
    "mask_pii",
)
_TOOL_CALL_TERMS = ("tool.call", "invoke_tool", "execute_tool", "function_call", "tools=", "agent_executor", "tool_node")


def _line_number(text: str, needle: str) -> int:
    lowered = needle.lower()
    for lineno, line in enumerate(text.splitlines(), start=1):
        if lowered in line.lower():
            return lineno
    return 1


def _evidence_line(text: str, line: int) -> str:
    lines = text.splitlines()
    if 1 <= line <= len(lines):
        return lines[line - 1].strip()[:260]
    return ""


def _contains_any(text: str, patterns: tuple[str, ...]) -> str:
    lowered = text.lower()
    for pattern in patterns:
        if pattern.lower() in lowered:
            return pattern
    return ""


def _has_control_nearby(lines: list[str], index: int) -> bool:
    start = max(0, index - 8)
    end = min(len(lines), index + 10)
    window = "\n".join(lines[start:end]).lower()
    return any(term in window for term in _SANITIZATION_TERMS)


def _risk_id(path: str, line: int, risk_type: str) -> str:
    raw = f"context_{risk_type}_{path}_{line}".lower()
    return re.sub(r"[^a-z0-9]+", "_", raw).strip("_")[:120]


def _scan_file(path: str, text: str) -> list[ContextRisk]:
    risks: list[ContextRisk] = []
    lines = text.splitlines()
    full_lower = text.lower()

    for index, line in enumerate(lines):
        line_lower = line.lower()

        memory_pattern = next((p for p in _MEMORY_WRITE_PATTERNS if p.lower() in line_lower), "")
        if memory_pattern and not _has_control_nearby(lines, index):
            risks.append(ContextRisk(
                id=_risk_id(path, index + 1, "persistent_memory_without_sanitization"),
                title="Persistent memory write lacks nearby sanitization/source controls",
                severity="High" if _contains_any(text, _TOOL_CALL_TERMS) else "Medium",
                risk_type="persistent_memory_without_sanitization",
                file=path,
                line=index + 1,
                evidence=line.strip()[:260],
                source="user_or_conversation_content",
                sink="persistent_memory",
                missing_control="source validation or prompt-injection sanitization",
                why_it_matters=(
                    "Agent memory can become a long-lived attack surface. If untrusted text is saved and reused later, a prompt injection can persist across sessions."
                ),
                recommended_fix="Store source metadata, sanitize untrusted content before saving, and isolate user-controlled memory from privileged tool decisions.",
            ))

        vector_pattern = next((p for p in _VECTOR_INGEST_PATTERNS if p.lower() in line_lower), "")
        if vector_pattern and not _has_control_nearby(lines, index):
            risks.append(ContextRisk(
                id=_risk_id(path, index + 1, "vector_ingestion_without_source_controls"),
                title="Vector/RAG ingestion lacks clear source trust controls",
                severity="High",
                risk_type="vector_ingestion_without_source_controls",
                file=path,
                line=index + 1,
                evidence=line.strip()[:260],
                source="documents_or_external_content",
                sink="retrieval_context",
                missing_control="trusted source metadata",
                why_it_matters=(
                    "RAG systems can retrieve poisoned content later and place it into the agent context as if it were trusted knowledge."
                ),
                recommended_fix="Track source trust, document origin, ingestion time, and validation status before adding content to retrieval memory.",
            ))

    retrieval_pattern = _contains_any(text, _RETRIEVAL_TO_PROMPT_PATTERNS)
    has_tool_calls = _contains_any(text, _TOOL_CALL_TERMS)
    has_sanitization = _contains_any(text, _SANITIZATION_TERMS)
    if retrieval_pattern and has_tool_calls and not has_sanitization:
        line = _line_number(text, retrieval_pattern)
        risks.append(ContextRisk(
            id=_risk_id(path, line, "retrieved_context_can_influence_tool_use"),
            title="Retrieved context may influence tool execution without trust checks",
            severity="High",
            risk_type="retrieved_context_can_influence_tool_use",
            file=path,
            line=line,
            evidence=_evidence_line(text, line),
            source="retrieved_context",
            sink="agent_tool_decision",
            missing_control="retrieval trust boundary check",
            why_it_matters=(
                "When retrieved text can influence tool calls, poisoned memory or untrusted documents can become an indirect command channel."
            ),
            recommended_fix="Separate retrieved context from tool instructions, track source trust, and require approval before retrieved content can trigger sensitive actions.",
        ))

    # Keep repeated warnings under control. Same line/pattern duplicates are not useful in a report.
    deduped: dict[str, ContextRisk] = {risk.id: risk for risk in risks}
    return list(deduped.values())


def _summary(risks: list[ContextRisk]) -> dict[str, Any]:
    severity_counts: dict[str, int] = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    risk_types: dict[str, int] = {}
    for risk in risks:
        severity_counts[risk.severity] = severity_counts.get(risk.severity, 0) + 1
        risk_types[risk.risk_type] = risk_types.get(risk.risk_type, 0) + 1
    return {
        "risk_count": len(risks),
        "severity_counts": severity_counts,
        "risk_types": risk_types,
    }


def build_context_poisoning_risks(files: dict[str, str]) -> dict[str, Any]:
    risks: list[ContextRisk] = []
    for path, text in sorted(files.items()):
        if not path.endswith((".py", ".js", ".jsx", ".ts", ".tsx")):
            continue
        risks.extend(_scan_file(path, text))
    return {
        "summary": _summary(risks),
        "risks": [asdict(risk) for risk in risks],
        "scanner_version": "v3-context-poisoning-1",
        "notes": [] if risks else ["No obvious persistent memory or retrieved-context poisoning risks were detected in supported files."],
    }
