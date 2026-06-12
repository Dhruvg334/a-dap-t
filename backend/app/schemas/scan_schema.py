from pydantic import BaseModel


class FindingSchema(BaseModel):
    title:          str
    severity:       str
    category:       str
    file:           str
    line:           int
    why_it_matters: str
    suggested_fix:  str


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
    id:    str
    label: str


class GraphEdgeSchema(BaseModel):
    source: str
    target: str
    risk:   str


class GraphSchema(BaseModel):
    nodes: list[GraphNodeSchema]
    edges: list[GraphEdgeSchema]


class ScanResultSchema(BaseModel):
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
