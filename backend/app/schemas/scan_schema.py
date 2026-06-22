from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class FindingSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    id:            str = ""
    title:         str
    severity:      str
    category:      str
    file:          str
    line:          int
    why_it_matters: str
    suggested_fix: str
    description:   str = ""
    evidence:      str = ""


class CategoryScoresSchema(BaseModel):
    prompt_injection: int
    secret_exposure:  int
    tool_permission:  int
    human_approval:   int
    data_exposure:    int
    auditability:     int


class SummarySchema(BaseModel):
    critical: int
    high:     int
    medium:   int
    low:      int


class GraphNodeSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    id:    str
    label: str


class GraphEdgeSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    source: str
    target: str
    risk:   str


class GraphSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    nodes: list[GraphNodeSchema]
    edges: list[GraphEdgeSchema]


class AttackSimulationSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    finding_id: str
    title: str
    attack_goal: str
    malicious_input: str
    weakness_exploited: str
    expected_behavior: str
    impact: str
    required_fix: str
    risk_level: str
    simulation_type: str = ""
    file: str = ""
    line: int | None = None
    evidence: str = ""
    location: str = ""
    guardrail: str = ""
    priority_score: int = 0
    preconditions: list[str] = Field(default_factory=list)
    attack_steps: list[str] = Field(default_factory=list)
    detection_signal: str = ""
    safe_test_note: str = ""


class PatchPreviewSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    finding_id: str
    title: str
    file: str
    patch_type: str
    patch_filename: str = "patch-preview.patch"
    copy_label: str = "Copy patch preview"
    download_label: str = "Download .patch"
    before: str
    after: str
    diff: str
    explanation: str
    confidence: str = "medium"
    manual_review_required: bool = True
    line: int | None = None
    language: str = "text"
    apply_strategy: str = "preview_only"
    estimated_effort: str = "medium"
    risk_reduction: str = ""
    affected_controls: list[str] = Field(default_factory=list)
    validation_steps: list[str] = Field(default_factory=list)
    review_notes: list[str] = Field(default_factory=list)


class DeploymentGateSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    decision: str
    decision_badge: str = ""
    minimum_safety_score: int = 75
    safety_score: int = 0
    gate_score: int = 0
    blockers: list[str] = Field(default_factory=list)
    recommended_policy: dict[str, Any] = Field(default_factory=dict)
    github_actions_yaml: str = ""
    policy_json: str = ""
    summary: str = ""
    decision_reason: str = ""
    required_action: str = ""
    next_actions: list[str] = Field(default_factory=list)
    workflow_filename: str = "adapt-agent-safety-gate.yml"
    policy_filename: str = "adapt-policy.json"
    download_assets: list[dict[str, Any]] = Field(default_factory=list)
    ci_secret_requirements: list[dict[str, str]] = Field(default_factory=list)
    category_blocker_counts: dict[str, int] = Field(default_factory=dict)
    severity_counts: dict[str, int] = Field(default_factory=dict)


class ProjectMetadataSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    project_name: str = ""
    scan_type: str = ""
    source_type: str = "unknown"
    detected_languages: list[str] = Field(default_factory=list)
    detected_frameworks: list[str] = Field(default_factory=list)
    package_managers: list[str] = Field(default_factory=list)
    total_files_scanned: int = 0
    total_lines_scanned: int = 0


class FileInventoryItemSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    path: str
    extension: str = ""
    language: str = "unknown"
    size_bytes: int = 0
    line_count: int = 0
    role: str = "application_code"


class FileInventorySchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    project_name: str = ""
    total_files: int = 0
    supported_files: int = 0
    ignored_files: int = 0
    total_lines: int = 0
    total_size_bytes: int = 0
    languages: dict[str, int] = Field(default_factory=dict)
    roles: dict[str, int] = Field(default_factory=dict)
    extensions: dict[str, int] = Field(default_factory=dict)
    package_managers: list[str] = Field(default_factory=list)
    files: list[FileInventoryItemSchema] = Field(default_factory=list)
    truncated: bool = False


class FrameworkDetectionSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    frontend: list[str] = Field(default_factory=list)
    backend: list[str] = Field(default_factory=list)
    agent_frameworks: list[str] = Field(default_factory=list)
    package_managers: list[str] = Field(default_factory=list)
    deployment: list[str] = Field(default_factory=list)
    evidence: list[dict[str, str]] = Field(default_factory=list)




class DependencyRecordSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str
    version: str = ""
    ecosystem: str
    manifest: str
    source: str = ""
    scope: str = "runtime"
    exact: bool = False
    lockfile_version: str = ""


class DependencyRiskSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    title: str
    severity: str
    ecosystem: str
    package: str = ""
    version: str = ""
    file: str
    line: int = 1
    risk_type: str
    evidence: str = ""
    why_it_matters: str
    recommended_fix: str
    related_dependency: str = ""


class DependencyRiskReportSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    summary: dict[str, Any] = Field(default_factory=dict)
    manifests: list[dict[str, Any]] = Field(default_factory=list)
    dependencies: list[DependencyRecordSchema] = Field(default_factory=list)
    risks: list[DependencyRiskSchema] = Field(default_factory=list)
    truncated: bool = False
    scanner_version: str = ""
    notes: list[str] = Field(default_factory=list)




class ApiEndpointSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    method: str
    path: str
    framework: str
    file: str
    line: int
    handler: str = ""
    auth_status: str = "unknown"
    rate_limit_status: str = "unknown"
    cors_status: str = "unknown"
    request_body_status: str = "unknown"
    risk_level: str = "low"
    tags: list[str] | tuple[str, ...] = Field(default_factory=list)
    evidence: str = ""


class ApiRiskSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    title: str
    severity: str
    risk_type: str
    endpoint_id: str
    method: str
    path: str
    framework: str
    file: str
    line: int
    evidence: str = ""
    why_it_matters: str
    recommended_fix: str
    related_control: str = ""


class ApiSurfaceReportSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    summary: dict[str, Any] = Field(default_factory=dict)
    endpoints: list[ApiEndpointSchema] = Field(default_factory=list)
    risks: list[ApiRiskSchema] = Field(default_factory=list)
    scanner_version: str = ""
    notes: list[str] = Field(default_factory=list)




class ContextPoisoningRiskSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    title: str
    severity: str
    risk_type: str
    file: str
    line: int
    evidence: str = ""
    source: str = ""
    sink: str = ""
    missing_control: str = ""
    why_it_matters: str
    recommended_fix: str


class ContextPoisoningReportSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    summary: dict[str, Any] = Field(default_factory=dict)
    risks: list[ContextPoisoningRiskSchema] = Field(default_factory=list)
    scanner_version: str = ""
    notes: list[str] = Field(default_factory=list)


class ScanResultSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    schema_version: str = "2.0"
    project_metadata: ProjectMetadataSchema | None = None
    file_inventory: FileInventorySchema | None = None
    framework_detection: FrameworkDetectionSchema | None = None
    dependency_risks: DependencyRiskReportSchema | None = None
    api_surface: ApiSurfaceReportSchema | None = None
    context_poisoning_risks: ContextPoisoningReportSchema | None = None

    project_name:          str
    scan_type:             str
    safety_score:          int
    status:                str
    summary:               SummarySchema
    category_scores:       CategoryScoresSchema
    findings:              list[FindingSchema]
    graph:                 GraphSchema
    attack_replay:         list[str]
    remediation_checklist: list[str]

    attack_simulations: list[AttackSimulationSchema] = Field(default_factory=list)
    patches: list[PatchPreviewSchema] = Field(default_factory=list)
    deployment_gate: DeploymentGateSchema | None = None
    score_delta: dict[str, Any] | None = None

    ai_summary: str = ""
    ai_report_summary: str = ""
    ai_remediation_plan: list[str] = Field(default_factory=list)
    ai_next_steps: list[str] = Field(default_factory=list)
    ai_enrichment_status: str = "not_requested"
    saved_report: bool = False
    report_id: str | None = None
