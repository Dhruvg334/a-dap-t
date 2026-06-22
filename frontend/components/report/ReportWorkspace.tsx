'use client';

import { useMemo, useState } from 'react';
import type {
  ApiEndpoint,
  ApiRisk,
  AppSecRisk,
  AttackSimulation,
  Capability,
  ContextPoisoningRisk,
  DependencyRisk,
  Finding,
  GuardrailControl,
  PatchPreview,
  RemedyPlanStep,
  ScanReport,
  Severity,
  TrustBoundary,
} from '@/types/scan';
import { categoryName, displayNumber, gateClass, riskClass, scoreTone, severityClass, severityLabel } from '@/lib/score';
import { copyText, downloadText } from '@/lib/api';
import { DapPanel } from '@/components/dap/DapPanel';

type SectionId =
  | 'overview'
  | 'surfaces'
  | 'dependencies'
  | 'api'
  | 'capabilities'
  | 'boundaries'
  | 'guardrails'
  | 'policy'
  | 'remedy'
  | 'evidence';

const sections: Array<{ id: SectionId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'surfaces', label: 'Surfaces' },
  { id: 'dependencies', label: 'Dependencies' },
  { id: 'api', label: 'API Surface' },
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'boundaries', label: 'Boundaries' },
  { id: 'guardrails', label: 'Guardrails' },
  { id: 'policy', label: 'Policy' },
  { id: 'remedy', label: 'Remedy' },
  { id: 'evidence', label: 'Evidence' },
];

function text(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined || value === '') return fallback;
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || fallback;
  return String(value);
}

function count<T>(items?: T[] | null): number {
  return Array.isArray(items) ? items.length : 0;
}

function gateLabel(decision?: string): string {
  const clean = String(decision || 'REVIEW').toUpperCase();
  if (clean === 'BLOCK') return 'BLOCKED';
  if (clean === 'ALLOW') return 'ALLOWED';
  return 'REVIEW';
}

function riskFillStyle(value: number): string {
  const score = Math.max(0, Math.min(100, Number(value) || 0));
  if (score <= 39) return 'linear-gradient(90deg, #10b981 0%, #34d399 100%)';
  if (score <= 69) return 'linear-gradient(90deg, #10b981 0%, #f59e0b 100%)';
  return 'linear-gradient(90deg, #10b981 0%, #f59e0b 58%, #ef4444 100%)';
}

function policyName(report: ScanReport): string {
  return text(report.policy_evaluation?.selected_policy?.label || report.policy_id, 'General AI App');
}

function v3Decision(report: ScanReport): string {
  return report.policy_evaluation?.decision || report.deployment_gate?.decision || 'REVIEW';
}

function topRisks(report: ScanReport): string[] {
  const out: string[] = [];
  report.policy_evaluation?.hard_blockers?.slice(0, 3).forEach((item) => out.push(text(item.title || item.control_id || item.risk_type, 'Policy blocker')));
  report.remedy_plan?.steps?.slice(0, 3).forEach((step) => {
    const title = text(step.title, 'Remedy step');
    if (!out.includes(title)) out.push(title);
  });
  report.appsec_risks?.risks?.slice(0, 2).forEach((risk) => {
    const title = text(risk.title, 'AppSec risk');
    if (!out.includes(title)) out.push(title);
  });
  return out.slice(0, 4);
}

function sectionLink(id: SectionId, label: string, active: SectionId, setActive: (id: SectionId) => void) {
  return (
    <a key={id} className={`report-v3-nav-link ${active === id ? 'active' : ''}`} href={`#${id}`} onClick={() => setActive(id)}>
      {label}
    </a>
  );
}

export function ReportWorkspace({ report }: { report: ScanReport }) {
  const [active, setActive] = useState<SectionId>('overview');
  const projectName = report.project_name || report.repo_name || 'Current scan';
  const legacyScore = displayNumber(report.safety_score, 0);
  const v3Score = report.v3_security_score ?? legacyScore;
  const decision = v3Decision(report);
  const findings = report.findings || [];

  const surfaceCounts = useMemo(() => ({
    dependencies: count(report.dependency_risks?.risks),
    api: count(report.api_surface?.risks),
    appsec: count(report.appsec_risks?.risks),
    context: count(report.context_poisoning_risks?.risks),
    capabilities: count(report.capability_map?.capabilities),
    boundaries: count(report.trust_boundaries?.boundaries),
    guardrails: displayNumber(report.guardrail_matrix?.summary?.risky_controls, 0),
    remedy: count(report.remedy_plan?.steps),
  }), [report]);

  return (
    <main className="page-shell report-page-shell report-v3-page">
      <div className="container report-container report-v3-container">
        <div className="report-v3-hero glass-card panel shimmer">
          <div>
            <div className="tech-label page-kicker"><span className="pulse-dot" /> V3 SECURITY REPORT</div>
            <h1 className="page-title">Release security review.</h1>
            <p className="page-desc">A-DAP-T now reviews code, dependencies, APIs, AppSec sinks, context risks, capabilities, guardrails, policy, and remedy steps before deployment.</p>
            <div className="report-v3-meta-row">
              <span className="pill neutral">{projectName}</span>
              <span className="pill neutral">{policyName(report)}</span>
              <span className="pill neutral">Schema {report.schema_version || '2.x'}</span>
            </div>
          </div>
          <div className="report-export-actions">
            <button className="btn btn-secondary" onClick={() => downloadText(`${projectName}-v3-report.json`, JSON.stringify(report, null, 2), 'application/json')}>Download JSON</button>
            <button className="btn btn-primary" onClick={() => window.print()}>Export PDF</button>
          </div>
        </div>

        <div className="report-v3-layout">
          <aside className="report-v3-nav glass-card">
            <div className="panel-label">Report sections</div>
            {sections.map((item) => sectionLink(item.id, item.label, active, setActive))}
          </aside>

          <div className="report-v3-content">
            <OverviewSection report={report} projectName={projectName} legacyScore={legacyScore} v3Score={v3Score} decision={decision} surfaceCounts={surfaceCounts} />
            <SurfacesSection report={report} counts={surfaceCounts} />
            <DependenciesSection report={report} />
            <ApiSurfaceSection report={report} />
            <CapabilitiesSection report={report} />
            <TrustBoundariesSection report={report} />
            <GuardrailsSection report={report} />
            <PolicySection report={report} />
            <RemedySection report={report} />
            <EvidenceSection report={report} findings={findings} />
            <LegacyArtifactsSection report={report} />
          </div>
        </div>

        <DapPanel report={report} />
      </div>
    </main>
  );
}

function OverviewSection({ report, projectName, legacyScore, v3Score, decision, surfaceCounts }: { report: ScanReport; projectName: string; legacyScore: number; v3Score: number; decision: string; surfaceCounts: Record<string, number> }) {
  const top = topRisks(report);
  return (
    <section id="overview" className="report-v3-section">
      <div className="report-v3-section-head">
        <div>
          <div className="panel-label">Overview</div>
          <h2 className="section-title">Can this project ship?</h2>
        </div>
        <span className={`pill ${gateClass(decision)}`}>{gateLabel(decision)}</span>
      </div>

      <div className="report-v3-score-grid">
        <ScoreCard label="V3 Security Score" value={v3Score} tone={scoreTone(v3Score)} caption={report.v3_status || 'Current v3 posture'} />
        <ScoreCard label="Legacy Agent Score" value={legacyScore} tone={scoreTone(legacyScore)} caption="Kept for v2 compatibility" />
        <div className="glass-card stat report-v3-decision-card">
          <div className="stat-value text">{gateLabel(decision)}</div>
          <div className="stat-label">Policy decision</div>
          <p className="faint">{report.policy_evaluation?.summary || report.deployment_gate?.summary || 'Decision generated from static report evidence.'}</p>
        </div>
        <div className="glass-card stat report-v3-decision-card">
          <div className="stat-value">{surfaceCounts.remedy}</div>
          <div className="stat-label">Remedy steps</div>
          <p className="faint">Prioritized from policy blockers, weak guardrails, and risky capabilities.</p>
        </div>
      </div>

      <div className="grid grid-2 report-v3-overview-split">
        <div className="glass-card panel">
          <div className="panel-label">Release readout</div>
          <h3 className="panel-title">{projectName}</h3>
          <p className="muted">Policy: <strong>{policyName(report)}</strong>. Source: <strong>{text(report.project_metadata?.source_type || report.scan_type)}</strong>.</p>
          <div className="v3-score-note">
            <span className="pill neutral">V3 uses all artifacts</span>
            <span className="pill neutral">Legacy score remains visible</span>
          </div>
          <p className="faint">The v3 score includes dependency, API, AppSec, context, capability, trust-boundary, and guardrail signals. This avoids the old contradiction where an agent could look safe on legacy categories while failing release controls.</p>
        </div>
        <div className="glass-card panel">
          <div className="panel-label">Top release reasons</div>
          {top.length ? <ul className="list-clean v3-reason-list">{top.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p className="muted">No major blockers were returned by the current policy.</p>}
        </div>
      </div>

      <SurfaceKpiGrid counts={surfaceCounts} />
    </section>
  );
}

function ScoreCard({ label, value, tone, caption }: { label: string; value: number; tone: string; caption: string }) {
  return (
    <div className={`glass-card stat v3-score-card ${tone}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      <p className="faint">{caption}</p>
    </div>
  );
}

function SurfaceKpiGrid({ counts }: { counts: Record<string, number> }) {
  const cards = [
    ['Dependency risks', counts.dependencies],
    ['API risks', counts.api],
    ['AppSec risks', counts.appsec],
    ['Context risks', counts.context],
    ['Capabilities', counts.capabilities],
    ['Weak boundaries', counts.boundaries],
    ['Risky guardrails', counts.guardrails],
    ['Remedy steps', counts.remedy],
  ];
  return (
    <div className="v3-kpi-grid">
      {cards.map(([label, value]) => (
        <div className="glass-card v3-kpi-card" key={label as string}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function SurfacesSection({ report, counts }: { report: ScanReport; counts: Record<string, number> }) {
  const frameworks = [
    ...(report.framework_detection?.frontend || []),
    ...(report.framework_detection?.backend || []),
    ...(report.framework_detection?.agent_frameworks || []),
  ];
  return (
    <section id="surfaces" className="report-v3-section">
      <SectionHead label="Security surfaces" title="What A-DAP-T inspected." badge="Project map" />
      <div className="grid grid-2">
        <div className="glass-card panel">
          <div className="panel-label">File inventory</div>
          <h3 className="panel-title">{displayNumber(report.file_inventory?.supported_files)} supported files</h3>
          <p className="muted">{displayNumber(report.file_inventory?.total_lines)} lines scanned across {displayNumber(report.file_inventory?.total_files)} files.</p>
          <KeyValueGrid items={{ Languages: Object.keys(report.file_inventory?.languages || {}).join(', ') || 'Unknown', Roles: Object.keys(report.file_inventory?.roles || {}).join(', ') || 'Not classified', 'Package managers': text(report.file_inventory?.package_managers) }} />
        </div>
        <div className="glass-card panel">
          <div className="panel-label">Detected stack</div>
          <h3 className="panel-title">{frameworks.length ? frameworks.join(', ') : 'No major framework detected'}</h3>
          <p className="muted">Framework detection is used to route API, agent, dependency, and deployment checks.</p>
          <KeyValueGrid items={{ Frontend: text(report.framework_detection?.frontend), Backend: text(report.framework_detection?.backend), Agents: text(report.framework_detection?.agent_frameworks), Deployment: text(report.framework_detection?.deployment) }} />
        </div>
      </div>
      <SurfaceKpiGrid counts={counts} />
    </section>
  );
}

function DependenciesSection({ report }: { report: ScanReport }) {
  const risks = report.dependency_risks?.risks || [];
  const deps = report.dependency_risks?.dependencies || [];
  return (
    <section id="dependencies" className="report-v3-section">
      <SectionHead label="Dependencies" title="Supply-chain and dependency hygiene." badge={`${risks.length} risks`} />
      <SummaryStrip items={{ Manifests: displayNumber(report.dependency_risks?.summary?.manifests_found), Dependencies: displayNumber(report.dependency_risks?.summary?.total_dependencies || deps.length), Risky: displayNumber(report.dependency_risks?.summary?.risky_dependencies || risks.length), Pinned: displayNumber(report.dependency_risks?.summary?.exactly_pinned_dependencies) }} />
      {risks.length ? <RiskTable rows={risks.slice(0, 12).map((risk) => ({ title: text(risk.package || risk.title), severity: risk.severity, meta: `${text(risk.ecosystem)} · ${text(risk.version)}`, file: `${text(risk.file)}:${text(risk.line, '')}`, detail: risk.why_it_matters, fix: risk.recommended_fix }))} /> : <EmptyState title="No dependency risks detected" body="A-DAP-T did not find unpinned, direct-source, missing-lockfile, or suspicious dependency hygiene issues in the supported manifests." />}
    </section>
  );
}

function ApiSurfaceSection({ report }: { report: ScanReport }) {
  const endpoints = report.api_surface?.endpoints || [];
  const risks = report.api_surface?.risks || [];
  return (
    <section id="api" className="report-v3-section">
      <SectionHead label="API Surface" title="Routes, controls, and abuse throttles." badge={`${endpoints.length} endpoints`} />
      <SummaryStrip items={{ Endpoints: endpoints.length, Risks: risks.length, 'Missing auth': displayNumber(report.api_surface?.summary?.auth_missing), 'Missing rate limits': displayNumber(report.api_surface?.summary?.rate_limit_missing) }} />
      <div className="v3-table-card glass-card">
        <div className="v3-table v3-api-table">
          <div className="v3-table-head"><span>Method</span><span>Route</span><span>Framework</span><span>Auth</span><span>Rate limit</span><span>Risk</span></div>
          {endpoints.slice(0, 16).map((endpoint) => <EndpointRow endpoint={endpoint} key={endpoint.id || `${endpoint.method}-${endpoint.path}-${endpoint.line}`} />)}
        </div>
      </div>
      {risks.length ? <RiskTable rows={risks.slice(0, 8).map(apiRiskRow)} compact /> : null}
    </section>
  );
}

function EndpointRow({ endpoint }: { endpoint: ApiEndpoint }) {
  return (
    <div className="v3-table-row">
      <span className="mono method-cell">{text(endpoint.method)}</span>
      <span className="mono route-cell">{text(endpoint.path)}</span>
      <span>{text(endpoint.framework)}</span>
      <span className={`pill ${riskClass(endpoint.auth_status)}`}>{text(endpoint.auth_status)}</span>
      <span className={`pill ${riskClass(endpoint.rate_limit_status)}`}>{text(endpoint.rate_limit_status)}</span>
      <span className={`pill ${riskClass(endpoint.risk_level)}`}>{text(endpoint.risk_level)}</span>
    </div>
  );
}

function CapabilitiesSection({ report }: { report: ScanReport }) {
  const capabilities = report.capability_map?.capabilities || [];
  return (
    <section id="capabilities" className="report-v3-section">
      <SectionHead label="Capability map" title="What this project can actually do." badge={`${capabilities.length} capabilities`} />
      <div className="v3-capability-grid">
        {capabilities.slice(0, 12).map((cap) => <CapabilityCard capability={cap} key={cap.id || `${cap.name}-${cap.line}`} />)}
      </div>
      {!capabilities.length ? <EmptyState title="No privileged capabilities detected" body="A-DAP-T did not identify obvious tool, API, memory, file, or execution capabilities in the current scan." /> : null}
    </section>
  );
}

function CapabilityCard({ capability }: { capability: Capability }) {
  const gaps = capability.control_gaps || [];
  return (
    <article className="glass-card panel v3-cap-card">
      <div className="report-pill-row">
        <span className={`pill ${riskClass(capability.risk_level)}`}>{text(capability.risk_level, 'review')}</span>
        <span className="pill neutral">{categoryName(text(capability.capability_type, 'capability'))}</span>
      </div>
      <h3 className="panel-title">{text(capability.label || capability.name, 'Detected capability')}</h3>
      <p className="muted mono">{text(capability.file)}{capability.line ? `:${capability.line}` : ''}</p>
      <div className="v3-control-grid">
        <ControlDot label="Approval" ok={capability.approval_found || !capability.requires_approval} />
        <ControlDot label="Audit" ok={capability.audit_logging_found} />
        <ControlDot label="Allowlist" ok={capability.allowlist_found} />
        <ControlDot label="External" ok={!capability.external_effect} invert />
      </div>
      {capability.data_touched?.length ? <p className="faint">Data touched: {capability.data_touched.slice(0, 5).join(', ')}</p> : null}
      {gaps.length ? <div className="v3-gap-row">{gaps.slice(0, 3).map((gap) => <span className="pill warning" key={gap}>{categoryName(gap)}</span>)}</div> : null}
    </article>
  );
}

function TrustBoundariesSection({ report }: { report: ScanReport }) {
  const boundaries = report.trust_boundaries?.boundaries || [];
  return (
    <section id="boundaries" className="report-v3-section">
      <SectionHead label="Trust boundaries" title="Where data and authority cross zones." badge={`${boundaries.length} crossings`} />
      <div className="v3-boundary-flow glass-card panel">
        <span>User / Input</span><i /> <span>API</span><i /> <span>App Logic</span><i /> <span>Agent / Tools</span><i /> <span>Data / External Systems</span>
      </div>
      <div className="v3-boundary-list">
        {boundaries.slice(0, 10).map((boundary) => <BoundaryCard boundary={boundary} key={boundary.id || `${boundary.source}-${boundary.target}`} />)}
      </div>
      {!boundaries.length ? <EmptyState title="No weak trust boundaries detected" body="No weak static crossings were generated from the current report artifacts." /> : null}
    </section>
  );
}

function BoundaryCard({ boundary }: { boundary: TrustBoundary }) {
  return (
    <article className="glass-card panel v3-boundary-card">
      <div className="v3-boundary-route"><strong>{text(boundary.source)}</strong><span>→</span><strong>{text(boundary.target)}</strong></div>
      <div className="report-pill-row"><span className={`pill ${severityClass(boundary.severity)}`}>{severityLabel(boundary.severity)}</span><span className="pill neutral">{categoryName(text(boundary.risk_type))}</span><span className={`pill ${riskClass(boundary.status)}`}>{text(boundary.status)}</span></div>
      <p className="muted">{boundary.recommended_control || 'Review this boundary and add the missing control before release.'}</p>
      {boundary.file ? <p className="faint mono">{boundary.file}:{boundary.line}</p> : null}
    </article>
  );
}

function GuardrailsSection({ report }: { report: ScanReport }) {
  const controls = report.guardrail_matrix?.controls || [];
  return (
    <section id="guardrails" className="report-v3-section">
      <SectionHead label="Guardrail matrix" title="Control coverage across the project." badge={`${controls.length} controls`} />
      <div className="v3-table-card glass-card">
        <div className="v3-table v3-guardrail-table">
          <div className="v3-table-head"><span>Control</span><span>Status</span><span>Coverage</span><span>Risk instances</span><span>Action</span></div>
          {controls.map((control) => <GuardrailRow control={control} key={control.control_id} />)}
        </div>
      </div>
    </section>
  );
}

function GuardrailRow({ control }: { control: GuardrailControl }) {
  const coverage = control.coverage_percent === null || control.coverage_percent === undefined ? 'N/A' : `${control.coverage_percent}%`;
  return (
    <div className="v3-table-row">
      <span><strong>{text(control.label || control.control_id)}</strong><em>{text(control.category)}</em></span>
      <span className={`pill ${riskClass(control.status)}`}>{text(control.status)}</span>
      <span>{coverage}</span>
      <span>{displayNumber(control.risk_instances)}</span>
      <span className="muted">{text(control.recommended_action).slice(0, 140)}</span>
    </div>
  );
}

function PolicySection({ report }: { report: ScanReport }) {
  const policy = report.policy_evaluation;
  if (!policy) return null;
  return (
    <section id="policy" className="report-v3-section">
      <SectionHead label="Policy evaluation" title="Release decision under selected policy." badge={gateLabel(policy.decision)} />
      <div className="grid grid-2">
        <div className="glass-card panel shimmer">
          <div className="panel-label">Selected policy</div>
          <h3 className="panel-title">{text(policy.selected_policy?.label || policy.selected_policy?.policy_id)}</h3>
          <p className="muted">{text(policy.selected_policy?.description || policy.summary)}</p>
          <SummaryStrip items={{ 'V3 score': displayNumber(policy.safety_score), Minimum: displayNumber(policy.minimum_safety_score), 'Controls passed': displayNumber(policy.required_controls_passed), Missing: displayNumber(policy.required_controls_missing) }} />
        </div>
        <div className="glass-card panel">
          <div className="panel-label">Hard blockers</div>
          {policy.hard_blockers?.length ? <ul className="list-clean">{policy.hard_blockers.slice(0, 8).map((blocker, i) => <li key={i}>{text(blocker.title || blocker.control_id || blocker.risk_type)}</li>)}</ul> : <p className="muted">No hard policy blockers returned.</p>}
        </div>
      </div>
    </section>
  );
}

function RemedySection({ report }: { report: ScanReport }) {
  const steps = report.remedy_plan?.steps || [];
  return (
    <section id="remedy" className="report-v3-section">
      <SectionHead label="Remedy plan" title="What to fix first." badge={`${steps.length} steps`} />
      {report.remedy_plan?.summary_text ? <p className="page-desc left-desc">{report.remedy_plan.summary_text}</p> : null}
      <div className="v3-remedy-list">
        {steps.slice(0, 10).map((step) => <RemedyCard step={step} key={step.id || step.title} />)}
      </div>
      {!steps.length ? <EmptyState title="No remedy steps generated" body="The current policy did not produce prioritized fix steps from the available artifacts." /> : null}
    </section>
  );
}

function RemedyCard({ step }: { step: RemedyPlanStep }) {
  return (
    <article className="glass-card panel v3-remedy-card">
      <div className="v3-remedy-number">{step.priority || 0}</div>
      <div>
        <div className="report-pill-row"><span className={`pill ${severityClass(step.severity)}`}>{severityLabel(step.severity)}</span>{step.control_id ? <span className="pill neutral">{categoryName(step.control_id)}</span> : null}{step.estimated_effort ? <span className="pill neutral">{step.estimated_effort} effort</span> : null}</div>
        <h3 className="panel-title">{text(step.title, 'Remedy step')}</h3>
        <p className="muted">{step.why_it_matters}</p>
        <p><strong>Fix:</strong> <span className="muted">{step.recommended_fix}</span></p>
        {step.expected_gate_impact ? <p className="faint"><strong>Expected gate impact:</strong> {step.expected_gate_impact}</p> : null}
        {step.validation_steps?.length ? <ul className="list-clean">{step.validation_steps.slice(0, 4).map((item, i) => <li key={i}>{item}</li>)}</ul> : null}
      </div>
    </article>
  );
}

function EvidenceSection({ report, findings }: { report: ScanReport; findings: Finding[] }) {
  const appsec = report.appsec_risks?.risks || [];
  const context = report.context_poisoning_risks?.risks || [];
  const api = report.api_surface?.risks || [];
  const dependency = report.dependency_risks?.risks || [];
  return (
    <section id="evidence" className="report-v3-section">
      <SectionHead label="Evidence" title="Raw scanner evidence and legacy findings." badge={`${findings.length + appsec.length + context.length + api.length + dependency.length} items`} />
      <RiskTable rows={[
        ...findings.map(findingRow),
        ...appsec.map(appsecRiskRow),
        ...context.map(contextRiskRow),
        ...api.map(apiRiskRow),
        ...dependency.map(dependencyRiskRow),
      ].slice(0, 24)} />
    </section>
  );
}

function LegacyArtifactsSection({ report }: { report: ScanReport }) {
  return (
    <section className="report-v3-section legacy-artifacts-section">
      <SectionHead label="Legacy v2 artifacts" title="Proof paths, patch previews, and CI gate exports." badge="Compatibility" />
      <AttackPanel attacks={report.attack_simulations || []} />
      <PatchPanel patches={report.patches || []} />
      <DeploymentGatePanel gate={report.deployment_gate} score={displayNumber(report.safety_score)} />
    </section>
  );
}

function AttackPanel({ attacks }: { attacks: AttackSimulation[] }) {
  if (!attacks.length) return null;
  return (
    <div className="report-section nested-report-section">
      <div className="panel-head report-section-head"><div><div className="panel-label">Prove Mode</div><h3 className="section-title small-section-title">Static attack paths.</h3></div><span className="pill warning">No live exploit</span></div>
      <div className="report-attack-grid">{attacks.slice(0, 6).map((attack, index) => <AttackCard key={`${attack.finding_id}-${index}`} attack={attack} />)}</div>
    </div>
  );
}

function AttackCard({ attack }: { attack: AttackSimulation }) {
  const path = attack.location || attack.file || 'Project path unavailable';
  return (
    <article className="glass-card artifact-card attack-path-card">
      <div className="attack-card-head"><div><div className="report-pill-row"><span className="pill danger">{attack.simulation_type || attack.risk_level || 'attack path'}</span>{attack.priority_score ? <span className="pill neutral">priority {attack.priority_score}</span> : null}</div><h3>{attack.title || 'Static attack simulation'}</h3></div><span className="path-label">{path}</span></div>
      <p className="muted"><strong>Goal:</strong> {attack.attack_goal || 'Demonstrate a plausible risky path without executing the target project.'}</p>
      {attack.malicious_input && <pre className="code-block attack-input">{attack.malicious_input}</pre>}
      {attack.attack_steps?.length ? <ol className="list-clean attack-steps">{attack.attack_steps.map((step, i) => <li key={i}>{step}</li>)}</ol> : null}
      {attack.guardrail && <p><strong>Guardrail:</strong> <span className="muted">{attack.guardrail}</span></p>}
    </article>
  );
}

function PatchPanel({ patches }: { patches: PatchPreview[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (!patches.length) return null;
  return (
    <div className="report-section nested-report-section">
      <div className="panel-head report-section-head"><div><div className="panel-label">Generated fixes</div><h3 className="section-title small-section-title">Patch previews.</h3></div><span className="pill neutral">Preview only</span></div>
      <div className="grid report-patch-grid">
        {patches.slice(0, 6).map((patch, index) => {
          const id = patch.finding_id || `${patch.title}-${index}`;
          const isOpen = openId === id;
          return (
            <article className="glass-card artifact-card report-patch-card" key={id}>
              <div className="finding-title-row report-card-heading"><div><div className="report-pill-row"><span className="pill safe">{patch.patch_type || 'patch'}</span>{patch.estimated_effort && <span className="pill neutral">{patch.estimated_effort} effort</span>}</div><h3 className="finding-title">{patch.title || 'Generated patch preview'}</h3><p className="muted">{patch.risk_reduction || patch.explanation}</p></div><div className="patch-action-row"><button className="btn btn-secondary btn-small" onClick={() => setOpenId(isOpen ? null : id)}>{isOpen ? 'Hide diff' : 'View diff'}</button><button className="btn btn-secondary btn-small" onClick={() => copyText(patch.diff || '')}>Copy</button><button className="btn btn-primary btn-small" onClick={() => downloadText(patch.patch_filename || 'adapt.patch', patch.diff || '')}>Download</button></div></div>
              {isOpen && <pre className="code-block">{patch.diff || 'No diff provided.'}</pre>}
              {patch.validation_steps?.length ? <ul className="list-clean">{patch.validation_steps.map((step, i) => <li key={i}>{step}</li>)}</ul> : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function DeploymentGatePanel({ gate, score }: { gate: ScanReport['deployment_gate']; score: number }) {
  if (!gate) return null;
  const workflow = gate.github_actions_yaml || '';
  const policy = gate.policy_json || JSON.stringify(gate.recommended_policy || {}, null, 2);
  return (
    <div className="glass-card panel shimmer deployment-gate-panel">
      <div className="panel-head report-panel-head"><div><div className="panel-label">Legacy deployment gate</div><h3 className="panel-title">CI artifact output.</h3></div><span className={`pill ${gateClass(gate.decision)}`}>{gate.decision_badge || gateLabel(gate.decision)}</span></div>
      <div className="gate-action-row"><button className="btn btn-secondary btn-small" onClick={() => copyText(workflow)}>Copy workflow</button><button className="btn btn-secondary btn-small" onClick={() => downloadText(gate.workflow_filename || 'adapt-safety-gate.yml', workflow, 'text/yaml')}>Download workflow</button><button className="btn btn-primary btn-small" onClick={() => downloadText(gate.policy_filename || 'adapt-policy.json', policy, 'application/json')}>Download policy</button></div>
    </div>
  );
}

function SectionHead({ label, title, badge }: { label: string; title: string; badge?: string }) {
  return <div className="report-v3-section-head"><div><div className="panel-label">{label}</div><h2 className="section-title">{title}</h2></div>{badge ? <span className="pill neutral">{badge}</span> : null}</div>;
}

function SummaryStrip({ items }: { items: Record<string, number | string> }) {
  return <div className="v3-summary-strip">{Object.entries(items).map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>;
}

function KeyValueGrid({ items }: { items: Record<string, string | number> }) {
  return <div className="v3-keyvalue-grid">{Object.entries(items).map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="glass-card panel empty-state-card"><div className="panel-label">Empty state</div><h3 className="panel-title">{title}</h3><p className="muted">{body}</p></div>;
}

function ControlDot({ label, ok, invert }: { label: string; ok?: boolean; invert?: boolean }) {
  const good = invert ? !ok : !!ok;
  return <span className={`v3-control-dot ${good ? 'ok' : 'bad'}`}><i />{label}</span>;
}

type RiskRow = { title: string; severity?: Severity; meta?: string; file?: string; detail?: string; fix?: string };

function RiskTable({ rows, compact = false }: { rows: RiskRow[]; compact?: boolean }) {
  if (!rows.length) return <EmptyState title="No evidence rows" body="No matching risks were returned for this section." />;
  return (
    <div className={`v3-risk-list ${compact ? 'compact' : ''}`}>
      {rows.map((row, i) => (
        <article className="glass-card v3-risk-row" key={`${row.title}-${i}`}>
          <div className="report-pill-row"><span className={`pill ${severityClass(row.severity)}`}>{severityLabel(row.severity)}</span>{row.meta ? <span className="pill neutral">{row.meta}</span> : null}</div>
          <h3>{row.title}</h3>
          {row.file ? <p className="faint mono">{row.file}</p> : null}
          {row.detail ? <p className="muted">{row.detail}</p> : null}
          {row.fix ? <p><strong>Fix:</strong> <span className="muted">{row.fix}</span></p> : null}
        </article>
      ))}
    </div>
  );
}

function findingRow(f: Finding): RiskRow { return { title: text(f.title), severity: f.severity, meta: text(f.category), file: `${text(f.file)}:${text(f.line, '')}`, detail: f.description || f.why_it_matters, fix: f.suggested_fix }; }
function dependencyRiskRow(r: DependencyRisk): RiskRow { return { title: text(r.package || r.title), severity: r.severity, meta: `${text(r.ecosystem)} · ${text(r.risk_type)}`, file: `${text(r.file)}:${text(r.line, '')}`, detail: r.why_it_matters, fix: r.recommended_fix }; }
function apiRiskRow(r: ApiRisk): RiskRow { return { title: text(r.title), severity: r.severity, meta: `${text(r.method)} ${text(r.path)}`, file: `${text(r.file)}:${text(r.line, '')}`, detail: r.why_it_matters, fix: r.recommended_fix }; }
function appsecRiskRow(r: AppSecRisk): RiskRow { return { title: text(r.title), severity: r.severity, meta: `${text(r.risk_type)} · ${text(r.cwe)}`, file: `${text(r.file)}:${text(r.line, '')}`, detail: r.why_it_matters, fix: r.recommended_fix }; }
function contextRiskRow(r: ContextPoisoningRisk): RiskRow { return { title: text(r.title), severity: r.severity, meta: text(r.risk_type), file: `${text(r.file)}:${text(r.line, '')}`, detail: r.why_it_matters, fix: r.recommended_fix }; }
