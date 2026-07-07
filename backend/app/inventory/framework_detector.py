from __future__ import annotations

import json
import re
from pathlib import PurePosixPath


DEPENDENCY_FRAMEWORK_HINTS: dict[str, tuple[str, str]] = {
    "next": ("frontend", "nextjs"),
    "react": ("frontend", "react"),
    "vue": ("frontend", "vue"),
    "svelte": ("frontend", "svelte"),
    "express": ("backend", "express"),
    "fastapi": ("backend", "fastapi"),
    "flask": ("backend", "flask"),
    "django": ("backend", "django"),
    "langchain": ("agent_frameworks", "langchain"),
    "langgraph": ("agent_frameworks", "langgraph"),
    "crewai": ("agent_frameworks", "crewai"),
    "openai": ("agent_frameworks", "openai_tools"),
    "@modelcontextprotocol/sdk": ("agent_frameworks", "mcp"),
}

IMPORT_PATTERNS: list[tuple[str, str, str]] = [
    (r"from\s+fastapi\s+import|import\s+fastapi", "backend", "fastapi"),
    (r"from\s+flask\s+import|import\s+flask", "backend", "flask"),
    (r"from\s+django\b|import\s+django", "backend", "django"),
    (r"require\(['\"]express['\"]\)|from\s+['\"]express['\"]|import\s+express", "backend", "express"),
    (r"from\s+langchain|import\s+langchain|from\s+['\"]langchain", "agent_frameworks", "langchain"),
    (r"from\s+langgraph|import\s+langgraph|from\s+['\"]langgraph", "agent_frameworks", "langgraph"),
    (r"from\s+crewai|import\s+crewai", "agent_frameworks", "crewai"),
    (r"from\s+openai\s+import|import\s+openai|from\s+['\"]openai", "agent_frameworks", "openai_tools"),
]

PACKAGE_MANIFESTS: dict[str, str] = {
    "package.json": "npm",
    "package-lock.json": "npm",
    "pnpm-lock.yaml": "pnpm",
    "yarn.lock": "yarn",
    "requirements.txt": "pip",
    "pyproject.toml": "python",
    "poetry.lock": "poetry",
    "Pipfile": "pipenv",
    "Pipfile.lock": "pipenv",
}


def _new_detection() -> dict[str, set[str]]:
    return {
        "frontend": set(),
        "backend": set(),
        "agent_frameworks": set(),
        "package_managers": set(),
        "deployment": set(),
    }


def _scan_package_json(text: str, detected: dict[str, set[str]]) -> None:
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        return

    dependencies = {}
    for section in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
        value = payload.get(section)
        if isinstance(value, dict):
            dependencies.update(value)

    for name in dependencies:
        hint = DEPENDENCY_FRAMEWORK_HINTS.get(name.lower())
        if hint:
            group, label = hint
            detected[group].add(label)


def _scan_requirements(text: str, detected: dict[str, set[str]]) -> None:
    for raw_line in text.splitlines():
        line = raw_line.strip().lower()
        if not line or line.startswith("#"):
            continue
        package = re.split(r"[<>=!~\[]", line, maxsplit=1)[0].strip()
        hint = DEPENDENCY_FRAMEWORK_HINTS.get(package)
        if hint:
            group, label = hint
            detected[group].add(label)


def _scan_imports(path: str, text: str, detected: dict[str, set[str]]) -> None:
    # Avoid scanning very large files with regexes. The loader already limits file size,
    # but this keeps framework detection predictable as v3 adds more scanners.
    sample = text[:80_000]
    for pattern, group, label in IMPORT_PATTERNS:
        if re.search(pattern, sample, flags=re.IGNORECASE):
            detected[group].add(label)

    lowered = path.lower()
    if lowered.startswith("app/") and lowered.endswith(("page.tsx", "layout.tsx")):
        detected["frontend"].add("nextjs")
    if "/app/api/" in f"/{lowered}" or "/pages/api/" in f"/{lowered}":
        detected["frontend"].add("nextjs_api_routes")


def detect_frameworks(files: dict[str, str]) -> dict:
    """Detect frameworks from manifests, imports, and path conventions.

    This is intentionally heuristic. The goal is not perfect fingerprinting; the
    goal is to give v3 scanners enough project context before deeper checks run.
    """
    detected = _new_detection()
    evidence: list[dict[str, str]] = []

    for path, text in sorted(files.items()):
        name = PurePosixPath(path).name
        if name in PACKAGE_MANIFESTS:
            detected["package_managers"].add(PACKAGE_MANIFESTS[name])
            evidence.append({"type": "package_manager", "label": PACKAGE_MANIFESTS[name], "file": path})

        before = {key: set(value) for key, value in detected.items()}
        if name == "package.json":
            _scan_package_json(text, detected)
        elif name == "requirements.txt":
            _scan_requirements(text, detected)
        _scan_imports(path, text, detected)

        for group, labels in detected.items():
            for label in labels - before[group]:
                evidence.append({"type": group, "label": label, "file": path})

    if any("agent" in path.lower() or "tool" in path.lower() for path in files):
        detected["agent_frameworks"].add("custom_agent")
        evidence.append({"type": "agent_frameworks", "label": "custom_agent", "file": "path conventions"})

    if any(PurePosixPath(path).name in {"vercel.json", "next.config.mjs", "next.config.js"} for path in files):
        detected["deployment"].add("vercel_or_nextjs")

    return {
        "frontend": sorted(detected["frontend"]),
        "backend": sorted(detected["backend"]),
        "agent_frameworks": sorted(detected["agent_frameworks"]),
        "package_managers": sorted(detected["package_managers"]),
        "deployment": sorted(detected["deployment"]),
        "evidence": evidence[:100],
    }
