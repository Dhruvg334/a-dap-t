from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from pathlib import PurePosixPath


LANGUAGE_BY_EXTENSION: dict[str, str] = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".json": "json",
    ".env": "env",
    ".md": "markdown",
    ".txt": "text",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".toml": "toml",
}

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


@dataclass(frozen=True)
class InventoryFile:
    path: str
    extension: str
    language: str
    size_bytes: int
    line_count: int
    role: str


def _extension(path: str) -> str:
    name = PurePosixPath(path).name
    if name == ".env":
        return ".env"
    suffix = PurePosixPath(path).suffix.lower()
    return suffix


def _language_for_path(path: str) -> str:
    return LANGUAGE_BY_EXTENSION.get(_extension(path), "unknown")


def _role_for_path(path: str) -> str:
    lowered = path.lower()
    name = PurePosixPath(path).name

    if name in PACKAGE_MANIFESTS:
        return "dependency_manifest"
    if "/test" in lowered or lowered.startswith("test") or "/__tests__/" in lowered:
        return "test"
    if "prompt" in lowered or lowered.endswith("system_prompt.txt"):
        return "prompt"
    if "tool" in lowered or "agent" in lowered:
        return "agent_logic"
    if "config" in lowered or lowered.endswith(".env"):
        return "configuration"
    if lowered.startswith("app/api/") or "/api/" in lowered or "routes" in lowered:
        return "api_surface"
    return "application_code"


def _line_count(text: str) -> int:
    if not text:
        return 0
    return len(text.splitlines())


def build_file_inventory(files: dict[str, str], project_name: str | None = None) -> dict:
    """Summarise the files A-DAP-T actually scanned.

    Keep this intentionally boring and deterministic. We are looking at untrusted
    project text, so the inventory only uses paths and already-loaded content.
    """
    inventory_files: list[InventoryFile] = []

    for path, text in sorted(files.items()):
        encoded_size = len(text.encode("utf-8", errors="ignore"))
        inventory_files.append(
            InventoryFile(
                path=path,
                extension=_extension(path),
                language=_language_for_path(path),
                size_bytes=encoded_size,
                line_count=_line_count(text),
                role=_role_for_path(path),
            )
        )

    languages = Counter(item.language for item in inventory_files if item.language != "unknown")
    roles = Counter(item.role for item in inventory_files)
    extensions = Counter(item.extension or "no_extension" for item in inventory_files)
    package_managers = sorted(
        {
            PACKAGE_MANIFESTS[PurePosixPath(item.path).name]
            for item in inventory_files
            if PurePosixPath(item.path).name in PACKAGE_MANIFESTS
        }
    )

    total_lines = sum(item.line_count for item in inventory_files)
    total_size = sum(item.size_bytes for item in inventory_files)

    return {
        "project_name": project_name or "unknown_project",
        "total_files": len(inventory_files),
        "supported_files": len(inventory_files),
        "ignored_files": 0,
        "total_lines": total_lines,
        "total_size_bytes": total_size,
        "languages": dict(sorted(languages.items())),
        "roles": dict(sorted(roles.items())),
        "extensions": dict(sorted(extensions.items())),
        "package_managers": package_managers,
        "files": [
            {
                "path": item.path,
                "extension": item.extension,
                "language": item.language,
                "size_bytes": item.size_bytes,
                "line_count": item.line_count,
                "role": item.role,
            }
            for item in inventory_files[:250]
        ],
        "truncated": len(inventory_files) > 250,
    }


def build_project_metadata(
    *,
    project_name: str,
    scan_type: str,
    source_type: str,
    file_inventory: dict,
    framework_detection: dict,
) -> dict:
    return {
        "project_name": project_name,
        "scan_type": scan_type,
        "source_type": source_type,
        "detected_languages": sorted(file_inventory.get("languages", {}).keys()),
        "detected_frameworks": sorted(
            set(framework_detection.get("backend", []))
            | set(framework_detection.get("frontend", []))
            | set(framework_detection.get("agent_frameworks", []))
        ),
        "package_managers": framework_detection.get("package_managers", []),
        "total_files_scanned": file_inventory.get("supported_files", 0),
        "total_lines_scanned": file_inventory.get("total_lines", 0),
    }
