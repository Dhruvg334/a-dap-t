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
    finding_id: str
    title: str
    attack_goal: str
    malicious_input: str
    weakness_exploited: str
    expected_behavior: str
    impact: str
    required_fix: str
    risk_level: str


class PatchPreviewSchema(BaseModel):
    finding_id: str
    title: str
    file: str
    patch_type: str
    before: str
    after: str
    diff: str
    explanation: str
    confidence: str = "medium"
    manual_review_required: bool = True


class DeploymentGateSchema(BaseModel):
    decision: str
    minimum_safety_score: int = 75
    blockers: list[str] = Field(default_factory=list)
    recommended_policy: dict[str, Any] = Field(default_factory=dict)
    github_actions_yaml: str = ""
    policy_json: str = ""


class ScanResultSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

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
