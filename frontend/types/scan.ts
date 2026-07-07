export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'critical' | 'high' | 'medium' | 'low' | string;

export type Finding = {
  id?: string;
  title?: string;
  category?: string;
  severity?: Severity;
  file?: string;
  line?: number | string | null;
  description?: string;
  why_it_matters?: string;
  suggested_fix?: string;
  evidence?: string;
};

export type AttackSimulation = {
  finding_id?: string;
  title?: string;
  attack_goal?: string;
  malicious_input?: string;
  weakness_exploited?: string;
  expected_behavior?: string;
  impact?: string;
  required_fix?: string;
  risk_level?: string;
  simulation_type?: string;
  file?: string;
  line?: number | string | null;
  evidence?: string;
  location?: string;
  guardrail?: string;
  priority_score?: number;
  preconditions?: string[];
  attack_steps?: string[];
  detection_signal?: string;
  safe_test_note?: string;
};

export type PatchPreview = {
  finding_id?: string;
  title?: string;
  file?: string;
  patch_type?: string;
  patch_filename?: string;
  copy_label?: string;
  download_label?: string;
  before?: string;
  after?: string;
  diff?: string;
  explanation?: string;
  confidence?: string;
  manual_review_required?: boolean;
  line?: number | string | null;
  language?: string;
  apply_strategy?: string;
  estimated_effort?: string;
  risk_reduction?: string;
  affected_controls?: string[];
  validation_steps?: string[];
  review_notes?: string[];
};

export type DeploymentGate = {
  decision?: 'ALLOW' | 'REVIEW' | 'BLOCK' | string;
  decision_badge?: string;
  summary?: string;
  decision_reason?: string;
  required_action?: string;
  minimum_safety_score?: number;
  safety_score?: number;
  gate_score?: number;
  blockers?: string[];
  next_actions?: string[];
  recommended_policy?: Record<string, unknown>;
  category_blocker_counts?: Record<string, number>;
  workflow_filename?: string;
  policy_filename?: string;
  github_actions_yaml?: string;
  policy_json?: string;
  download_assets?: Array<{ filename?: string; label?: string; content_type?: string }>;
  ci_secret_requirements?: string[];
  severity_counts?: Record<string, number>;
};

export type ProjectMetadata = {
  project_name?: string;
  scan_type?: string;
  source_type?: string;
  detected_languages?: string[];
  detected_frameworks?: string[];
  package_managers?: string[];
  total_files_scanned?: number;
  total_lines_scanned?: number;
};

export type FileInventory = {
  project_name?: string;
  total_files?: number;
  supported_files?: number;
  ignored_files?: number;
  total_lines?: number;
  total_size_bytes?: number;
  languages?: Record<string, number>;
  roles?: Record<string, number>;
  extensions?: Record<string, number>;
  package_managers?: string[];
  files?: Array<{ path?: string; extension?: string; language?: string; size_bytes?: number; line_count?: number; role?: string }>;
  truncated?: boolean;
};

export type FrameworkDetection = {
  frontend?: string[];
  backend?: string[];
  agent_frameworks?: string[];
  package_managers?: string[];
  deployment?: string[];
  evidence?: Array<Record<string, string>>;
};

export type DependencyRisk = {
  id?: string;
  title?: string;
  severity?: Severity;
  ecosystem?: string;
  package?: string;
  version?: string;
  file?: string;
  line?: number;
  risk_type?: string;
  evidence?: string;
  why_it_matters?: string;
  recommended_fix?: string;
  related_dependency?: string;
};

export type DependencyRecord = {
  name?: string;
  version?: string;
  ecosystem?: string;
  manifest?: string;
  source?: string;
  scope?: string;
  exact?: boolean;
  lockfile_version?: string;
};

export type DependencyRiskReport = {
  summary?: Record<string, any>;
  manifests?: Array<Record<string, any>>;
  dependencies?: DependencyRecord[];
  risks?: DependencyRisk[];
  truncated?: boolean;
  scanner_version?: string;
  notes?: string[];
};

export type ApiEndpoint = {
  id?: string;
  method?: string;
  path?: string;
  framework?: string;
  file?: string;
  line?: number;
  handler?: string;
  auth_status?: string;
  rate_limit_status?: string;
  cors_status?: string;
  request_body_status?: string;
  risk_level?: string;
  tags?: string[];
  evidence?: string;
};

export type ApiRisk = {
  id?: string;
  title?: string;
  severity?: Severity;
  risk_type?: string;
  endpoint_id?: string;
  method?: string;
  path?: string;
  framework?: string;
  file?: string;
  line?: number;
  evidence?: string;
  why_it_matters?: string;
  recommended_fix?: string;
  related_control?: string;
};

export type ApiSurfaceReport = {
  summary?: Record<string, any>;
  endpoints?: ApiEndpoint[];
  risks?: ApiRisk[];
  scanner_version?: string;
  notes?: string[];
};

export type ContextPoisoningRisk = {
  id?: string;
  title?: string;
  severity?: Severity;
  risk_type?: string;
  file?: string;
  line?: number;
  evidence?: string;
  source?: string;
  sink?: string;
  missing_control?: string;
  why_it_matters?: string;
  recommended_fix?: string;
};

export type ContextPoisoningReport = {
  summary?: Record<string, any>;
  risks?: ContextPoisoningRisk[];
  scanner_version?: string;
  notes?: string[];
};

export type AppSecRisk = {
  id?: string;
  title?: string;
  severity?: Severity;
  risk_type?: string;
  cwe?: string;
  file?: string;
  line?: number;
  evidence?: string;
  source?: string;
  sink?: string;
  missing_control?: string;
  confidence?: string;
  why_it_matters?: string;
  recommended_fix?: string;
};

export type AppSecRiskReport = {
  summary?: Record<string, any>;
  risks?: AppSecRisk[];
  scanner_version?: string;
  notes?: string[];
};

export type Capability = {
  id?: string;
  name?: string;
  label?: string;
  capability_type?: string;
  source?: string;
  risk_level?: string;
  file?: string;
  line?: number;
  language?: string;
  evidence?: string;
  data_touched?: string[];
  external_effect?: boolean;
  requires_approval?: boolean;
  approval_found?: boolean;
  audit_logging_found?: boolean;
  allowlist_found?: boolean;
  control_gaps?: string[];
  related_findings?: string[];
  related_api_endpoints?: string[];
  related_appsec_risks?: string[];
  related_context_risks?: string[];
  confidence?: string;
  recommended_review?: string;
};

export type CapabilityMapReport = {
  summary?: Record<string, any>;
  capabilities?: Capability[];
  scanner_version?: string;
  notes?: string[];
};

export type TrustBoundary = {
  id?: string;
  source?: string;
  target?: string;
  risk_type?: string;
  status?: string;
  severity?: Severity;
  file?: string;
  line?: number;
  evidence?: string;
  related_capabilities?: string[];
  related_risks?: string[];
  recommended_control?: string;
};

export type TrustBoundaryReport = {
  summary?: Record<string, any>;
  boundaries?: TrustBoundary[];
  scanner_version?: string;
  notes?: string[];
};

export type GuardrailControl = {
  control_id?: string;
  label?: string;
  category?: string;
  status?: string;
  coverage_percent?: number | null;
  relevant_instances?: number;
  protected_instances?: number;
  risk_instances?: number;
  risk_level?: string;
  evidence?: Array<Record<string, any>>;
  recommended_action?: string;
  related_artifacts?: string[];
  notes?: string[];
};

export type GuardrailMatrixReport = {
  summary?: Record<string, any>;
  controls?: GuardrailControl[];
  scanner_version?: string;
  notes?: string[];
};

export type PolicyEvaluation = {
  selected_policy?: Record<string, any>;
  available_policies?: Array<Record<string, any>>;
  decision?: string;
  summary?: string;
  minimum_safety_score?: number;
  safety_score?: number;
  legacy_safety_score?: number;
  score_basis?: string;
  score_passed?: boolean;
  v3_gate_score?: number;
  required_controls_total?: number;
  required_controls_passed?: number;
  required_controls_missing?: number;
  passed_controls?: string[];
  review_controls?: string[];
  missing_required_controls?: Array<Record<string, any>>;
  hard_blockers?: Array<Record<string, any>>;
  blocker_count?: number;
  review_count?: number;
  scanner_version?: string;
  notes?: string[];
};

export type RemedyPlanStep = {
  id?: string;
  priority?: number;
  priority_score?: number;
  source?: string;
  title?: string;
  severity?: Severity;
  control_id?: string;
  affected_capabilities?: string[];
  related_artifacts?: string[];
  risk_instances?: number;
  recommended_fix?: string;
  why_it_matters?: string;
  estimated_effort?: string;
  expected_gate_impact?: string;
  validation_steps?: string[];
  evidence?: Array<Record<string, any>>;
  manual_review_required?: boolean;
};

export type RemedyPlanReport = {
  summary?: Record<string, any>;
  steps?: RemedyPlanStep[];
  release_path?: string[];
  summary_text?: string;
  scanner_version?: string;
  notes?: string[];
};

export type ScanReport = {
  schema_version?: string;
  policy_id?: string;
  project_name?: string;
  scan_type?: string;
  repo_url?: string;
  repo_owner?: string;
  repo_name?: string;
  repo_branch?: string;
  safety_score?: number;
  status?: string;
  v3_security_score?: number | null;
  v3_status?: string | null;
  v3_score_breakdown?: Record<string, any> | null;
  project_metadata?: ProjectMetadata | null;
  file_inventory?: FileInventory | null;
  framework_detection?: FrameworkDetection | null;
  dependency_risks?: DependencyRiskReport | null;
  api_surface?: ApiSurfaceReport | null;
  context_poisoning_risks?: ContextPoisoningReport | null;
  appsec_risks?: AppSecRiskReport | null;
  capability_map?: CapabilityMapReport | null;
  trust_boundaries?: TrustBoundaryReport | null;
  guardrail_matrix?: GuardrailMatrixReport | null;
  policy_evaluation?: PolicyEvaluation | null;
  remedy_plan?: RemedyPlanReport | null;
  summary?: Record<string, number>;
  category_scores?: Record<string, number>;
  findings?: Finding[];
  attack_simulations?: AttackSimulation[];
  patches?: PatchPreview[];
  deployment_gate?: DeploymentGate | null;
  graph?: { nodes?: unknown[]; edges?: unknown[] } | Record<string, unknown>;
  attack_replay?: unknown[];
  remediation_checklist?: unknown[];
  ai_summary?: string;
  ai_report_summary?: string;
  ai_remediation_plan?: string[];
  ai_next_steps?: string[];
  ai_enrichment_status?: string;
  saved_report?: boolean;
  report_id?: string | null;
  id?: string | null;
  created_at?: string | null;
  timestamp?: string | null;
  upload_name?: string | null;
};
