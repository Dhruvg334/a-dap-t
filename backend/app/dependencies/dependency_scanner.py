from __future__ import annotations

import json
import re
from dataclasses import dataclass, asdict
from pathlib import PurePosixPath
from typing import Any


@dataclass(frozen=True)
class DependencyRecord:
    name: str
    version: str
    ecosystem: str
    manifest: str
    source: str
    scope: str = "runtime"
    exact: bool = False
    lockfile_version: str = ""


@dataclass(frozen=True)
class DependencyRisk:
    id: str
    title: str
    severity: str
    ecosystem: str
    package: str
    version: str
    file: str
    line: int
    risk_type: str
    evidence: str
    why_it_matters: str
    recommended_fix: str
    related_dependency: str = ""


_NPM_DEP_SECTIONS = (
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
)

_REQUIREMENT_NAME_RE = re.compile(r"^\s*([A-Za-z0-9_.-]+)")
_EXACT_REQUIREMENT_RE = re.compile(r"^\s*([A-Za-z0-9_.-]+)\s*==\s*([^\s;#]+)")
_RANGE_REQUIREMENT_RE = re.compile(r"^\s*([A-Za-z0-9_.-]+)\s*(>=|>|<=|<|~=|!=)\s*([^\s;#]+)")

_SUSPICIOUS_PACKAGE_TERMS = (
    "test-package",
    "example-package",
    "malware",
    "payload",
    "backdoor",
)

_DANGEROUS_NPM_SPECS = ("git+", "github:", "http://", "https://", "file:")
_DANGEROUS_PIP_PREFIXES = ("git+", "http://", "https://", "-e ", "--editable")


def _safe_json_loads(text: str, path: str) -> tuple[dict[str, Any] | None, DependencyRisk | None]:
    try:
        loaded = json.loads(text)
    except json.JSONDecodeError as exc:
        return None, DependencyRisk(
            id="dependency_manifest_invalid_json",
            title="Dependency manifest could not be parsed",
            severity="Medium",
            ecosystem="unknown",
            package="",
            version="",
            file=path,
            line=max(exc.lineno, 1),
            risk_type="invalid_manifest",
            evidence=str(exc)[:220],
            why_it_matters=(
                "Broken dependency manifests make dependency risk analysis unreliable and can hide "
                "the exact packages that will be installed in deployment."
            ),
            recommended_fix="Fix the manifest JSON and re-run the scan so A-DAP-T can inspect dependency posture.",
        )
    if not isinstance(loaded, dict):
        return None, DependencyRisk(
            id="dependency_manifest_invalid_shape",
            title="Dependency manifest has an unexpected shape",
            severity="Low",
            ecosystem="unknown",
            package="",
            version="",
            file=path,
            line=1,
            risk_type="invalid_manifest",
            evidence="Manifest root is not a JSON object.",
            why_it_matters="A-DAP-T expects dependency manifests to be object-shaped so dependencies can be inspected safely.",
            recommended_fix="Review the manifest and make sure it follows the package manager's expected format.",
        )
    return loaded, None


def _is_exact_npm_spec(spec: str) -> bool:
    cleaned = spec.strip()
    if not cleaned:
        return False
    if cleaned in {"*", "latest"}:
        return False
    if cleaned.startswith(("^", "~", ">", "<", "=", "*")):
        return False
    if any(cleaned.startswith(prefix) for prefix in _DANGEROUS_NPM_SPECS):
        return False
    return bool(re.match(r"^\d+(?:\.\d+){0,3}(?:[-+][A-Za-z0-9_.-]+)?$", cleaned))


def _line_for_package(text: str, package: str) -> int:
    token = f'"{package}"'
    for lineno, line in enumerate(text.splitlines(), start=1):
        if token in line or line.strip().startswith(package):
            return lineno
    return 1


def _parse_package_json(path: str, text: str) -> tuple[list[DependencyRecord], list[DependencyRisk], dict[str, Any]]:
    data, parse_risk = _safe_json_loads(text, path)
    if data is None:
        return [], [parse_risk] if parse_risk else [], {"path": path, "ecosystem": "npm", "parse_status": "failed"}

    records: list[DependencyRecord] = []
    risks: list[DependencyRisk] = []
    for section in _NPM_DEP_SECTIONS:
        dependencies = data.get(section) or {}
        if not isinstance(dependencies, dict):
            risks.append(DependencyRisk(
                id=f"dependency_{section}_invalid_shape",
                title=f"{section} is not object-shaped",
                severity="Low",
                ecosystem="npm",
                package="",
                version="",
                file=path,
                line=1,
                risk_type="invalid_manifest_section",
                evidence=f"{section} is not a dependency object.",
                why_it_matters="Unexpected manifest shapes make dependency installation and security review harder to reason about.",
                recommended_fix=f"Make {section} an object of package names to version specs.",
            ))
            continue

        for package, spec in sorted(dependencies.items()):
            spec_str = str(spec).strip()
            line = _line_for_package(text, package)
            exact = _is_exact_npm_spec(spec_str)
            scope = "development" if section == "devDependencies" else "runtime"
            records.append(DependencyRecord(
                name=package,
                version=spec_str,
                ecosystem="npm",
                manifest=path,
                source="package.json",
                scope=scope,
                exact=exact,
            ))

            if spec_str in {"*", "latest"} or spec_str.startswith(("^", "~", ">", "<")):
                risks.append(DependencyRisk(
                    id=f"npm_unpinned_{package}".replace("/", "_"),
                    title="Dependency version is not pinned",
                    severity="Medium" if scope == "runtime" else "Low",
                    ecosystem="npm",
                    package=package,
                    version=spec_str,
                    file=path,
                    line=line,
                    risk_type="unpinned_dependency",
                    evidence=f"{package}: {spec_str}",
                    why_it_matters=(
                        "Range-based dependency specs can silently pull newer package versions. For AI apps, dependency drift can "
                        "change tool behavior, auth behavior, or prompt/runtime handling without an intentional release review."
                    ),
                    recommended_fix="Pin the dependency through a lockfile and review upgrades intentionally.",
                    related_dependency=package,
                ))
            if any(spec_str.startswith(prefix) for prefix in _DANGEROUS_NPM_SPECS):
                risks.append(DependencyRisk(
                    id=f"npm_direct_source_{package}".replace("/", "_"),
                    title="Dependency is installed from a direct URL or repository source",
                    severity="High" if scope == "runtime" else "Medium",
                    ecosystem="npm",
                    package=package,
                    version=spec_str,
                    file=path,
                    line=line,
                    risk_type="direct_source_dependency",
                    evidence=f"{package}: {spec_str}",
                    why_it_matters=(
                        "Direct URL/git dependencies can bypass normal registry review and lockfile expectations. They are a common "
                        "supply-chain risk when projects move quickly."
                    ),
                    recommended_fix="Prefer a reviewed registry package and exact locked version. If this is required, document and review the source.",
                    related_dependency=package,
                ))
            if any(term in package.lower() for term in _SUSPICIOUS_PACKAGE_TERMS):
                risks.append(DependencyRisk(
                    id=f"npm_suspicious_name_{package}".replace("/", "_"),
                    title="Dependency name looks suspicious or placeholder-like",
                    severity="Low",
                    ecosystem="npm",
                    package=package,
                    version=spec_str,
                    file=path,
                    line=line,
                    risk_type="suspicious_dependency_name",
                    evidence=package,
                    why_it_matters="Placeholder or suspicious package names can indicate test code, typos, or unsafe package choices left in the project.",
                    recommended_fix="Verify the package is intentional, maintained, and needed before deployment.",
                    related_dependency=package,
                ))

    manifest_info = {
        "path": path,
        "ecosystem": "npm",
        "parse_status": "ok",
        "dependency_count": len(records),
        "sections": [section for section in _NPM_DEP_SECTIONS if isinstance(data.get(section), dict) and data.get(section)],
    }
    return records, risks, manifest_info


def _parse_package_lock(path: str, text: str) -> tuple[list[DependencyRecord], list[DependencyRisk], dict[str, Any]]:
    data, parse_risk = _safe_json_loads(text, path)
    if data is None:
        return [], [parse_risk] if parse_risk else [], {"path": path, "ecosystem": "npm", "parse_status": "failed", "is_lockfile": True}

    records: list[DependencyRecord] = []
    lock_version = str(data.get("lockfileVersion", ""))
    packages = data.get("packages")
    if isinstance(packages, dict):
        for package_path, meta in packages.items():
            if not package_path.startswith("node_modules/") or not isinstance(meta, dict):
                continue
            name = package_path.removeprefix("node_modules/")
            version = str(meta.get("version", ""))
            if not name or not version:
                continue
            records.append(DependencyRecord(
                name=name,
                version=version,
                ecosystem="npm",
                manifest=path,
                source="package-lock.json",
                scope="development" if meta.get("dev") else "runtime",
                exact=True,
                lockfile_version=lock_version,
            ))
    elif isinstance(data.get("dependencies"), dict):
        for name, meta in sorted(data["dependencies"].items()):
            if not isinstance(meta, dict):
                continue
            version = str(meta.get("version", ""))
            if version:
                records.append(DependencyRecord(
                    name=name,
                    version=version,
                    ecosystem="npm",
                    manifest=path,
                    source="package-lock.json",
                    scope="runtime",
                    exact=True,
                    lockfile_version=lock_version,
                ))

    return records, [], {
        "path": path,
        "ecosystem": "npm",
        "parse_status": "ok",
        "is_lockfile": True,
        "dependency_count": len(records),
        "lockfile_version": lock_version,
    }


def _normalise_requirement_line(line: str) -> str:
    return line.split("#", 1)[0].strip()


def _parse_requirements(path: str, text: str) -> tuple[list[DependencyRecord], list[DependencyRisk], dict[str, Any]]:
    records: list[DependencyRecord] = []
    risks: list[DependencyRisk] = []

    for lineno, raw_line in enumerate(text.splitlines(), start=1):
        raw_stripped = raw_line.strip()
        # Direct source requirements often carry #egg metadata. Do not remove that as a comment.
        if raw_stripped.lower().startswith(_DANGEROUS_PIP_PREFIXES):
            line = raw_stripped
        else:
            line = _normalise_requirement_line(raw_line)
        if not line or line.startswith("-") and not line.startswith(("-e ", "--editable")):
            continue

        lower_line = line.lower()
        if lower_line.startswith(_DANGEROUS_PIP_PREFIXES):
            package = line.split("#egg=")[-1] if "#egg=" in line else "direct-source-package"
            records.append(DependencyRecord(
                name=package,
                version=line,
                ecosystem="pip",
                manifest=path,
                source="requirements.txt",
                exact=False,
            ))
            risks.append(DependencyRisk(
                id=f"pip_direct_source_{lineno}",
                title="Python dependency is installed from a direct URL or editable source",
                severity="High",
                ecosystem="pip",
                package=package,
                version=line,
                file=path,
                line=lineno,
                risk_type="direct_source_dependency",
                evidence=line[:220],
                why_it_matters=(
                    "Direct source dependencies can move outside normal package registry controls and make builds harder to reproduce."
                ),
                recommended_fix="Use a reviewed package index version when possible. If a direct source is required, pin it to a reviewed commit.",
                related_dependency=package,
            ))
            continue

        exact_match = _EXACT_REQUIREMENT_RE.match(line)
        range_match = _RANGE_REQUIREMENT_RE.match(line)
        name_match = _REQUIREMENT_NAME_RE.match(line)
        if not name_match:
            continue

        name = name_match.group(1)
        if exact_match:
            version = exact_match.group(2)
            exact = True
        elif range_match:
            version = f"{range_match.group(2)}{range_match.group(3)}"
            exact = False
        else:
            version = ""
            exact = False

        records.append(DependencyRecord(
            name=name,
            version=version or "unversioned",
            ecosystem="pip",
            manifest=path,
            source="requirements.txt",
            exact=exact,
        ))

        if not exact:
            risks.append(DependencyRisk(
                id=f"pip_unpinned_{name}".replace("/", "_"),
                title="Python dependency version is not exactly pinned",
                severity="Medium",
                ecosystem="pip",
                package=name,
                version=version or "unversioned",
                file=path,
                line=lineno,
                risk_type="unpinned_dependency",
                evidence=line[:220],
                why_it_matters=(
                    "Unpinned Python dependencies can change between builds. For AI applications, that can unexpectedly affect "
                    "model clients, API behavior, auth middleware, or file handling."
                ),
                recommended_fix="Pin the dependency with == and review upgrades intentionally.",
                related_dependency=name,
            ))
        if any(term in name.lower() for term in _SUSPICIOUS_PACKAGE_TERMS):
            risks.append(DependencyRisk(
                id=f"pip_suspicious_name_{name}".replace("/", "_"),
                title="Dependency name looks suspicious or placeholder-like",
                severity="Low",
                ecosystem="pip",
                package=name,
                version=version or "unversioned",
                file=path,
                line=lineno,
                risk_type="suspicious_dependency_name",
                evidence=name,
                why_it_matters="Suspicious or placeholder-like package names should be reviewed before deployment.",
                recommended_fix="Verify the package is intentional, maintained, and needed.",
                related_dependency=name,
            ))

    return records, risks, {
        "path": path,
        "ecosystem": "pip",
        "parse_status": "ok",
        "dependency_count": len(records),
    }


def _dedupe_risks(risks: list[DependencyRisk]) -> list[DependencyRisk]:
    seen: set[tuple[str, str, str, str]] = set()
    unique: list[DependencyRisk] = []
    for risk in risks:
        key = (risk.risk_type, risk.ecosystem, risk.package, risk.file)
        if key in seen:
            continue
        seen.add(key)
        unique.append(risk)
    return unique


def build_dependency_risks(files: dict[str, str]) -> dict[str, Any]:
    """Build the v3 dependency posture artifact.

    This is intentionally local-first. Real CVE lookup comes later; this pass gives
    us deterministic dependency hygiene and supply-chain signals without making
    every scan depend on a network call.
    """
    records: list[DependencyRecord] = []
    risks: list[DependencyRisk] = []
    manifests: list[dict[str, Any]] = []

    has_package_json = False
    has_npm_lockfile = False

    for path, text in sorted(files.items()):
        name = PurePosixPath(path).name
        if name == "package.json":
            has_package_json = True
            parsed_records, parsed_risks, manifest = _parse_package_json(path, text)
        elif name == "package-lock.json":
            has_npm_lockfile = True
            parsed_records, parsed_risks, manifest = _parse_package_lock(path, text)
        elif name == "requirements.txt":
            parsed_records, parsed_risks, manifest = _parse_requirements(path, text)
        else:
            continue

        records.extend(parsed_records)
        risks.extend(parsed_risks)
        manifests.append(manifest)

    if has_package_json and not has_npm_lockfile:
        risks.append(DependencyRisk(
            id="npm_missing_lockfile",
            title="npm project has no package-lock.json in scanned files",
            severity="Medium",
            ecosystem="npm",
            package="",
            version="",
            file="package.json",
            line=1,
            risk_type="missing_lockfile",
            evidence="package.json was found but package-lock.json was not found in scanned files.",
            why_it_matters=(
                "Without a lockfile, production installs may resolve different dependency versions. This weakens reproducibility "
                "and makes supply-chain review less reliable."
            ),
            recommended_fix="Commit a lockfile generated from a reviewed dependency install.",
        ))

    unique_risks = _dedupe_risks(risks)
    ecosystems = sorted({record.ecosystem for record in records})
    exact_count = sum(1 for record in records if record.exact)

    return {
        "summary": {
            "manifests_found": len(manifests),
            "total_dependencies": len(records),
            "risky_dependencies": len(unique_risks),
            "exactly_pinned_dependencies": exact_count,
            "ecosystems": ecosystems,
            "has_lockfiles": any(manifest.get("is_lockfile") for manifest in manifests),
        },
        "manifests": manifests,
        "dependencies": [asdict(record) for record in records[:500]],
        "risks": [asdict(risk) for risk in unique_risks],
        "truncated": len(records) > 500,
        "scanner_version": "v3-local-dependency-hygiene-1",
        "notes": [
            "This first v3 dependency pass checks local manifests and lockfiles only.",
            "CVE lookup through OSV is planned after the local parser is stable.",
        ],
    }
