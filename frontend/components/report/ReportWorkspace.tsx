'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Bot, Braces, CheckCircle2, ChevronRight, Download, Filter, Search, ShieldAlert } from 'lucide-react';
import type { Capability, Finding, GuardrailControl, RemedyPlanStep, ScanReport } from '@/types/scan';
import { copyText, downloadText } from '@/lib/api';
import { AdaptBadge, AdaptButton, EmptyState, SectionTitle, StatTile } from '@/components/ui/AdaptUI';
import { categoryName, displayNumber, gateClass, riskClass, scoreTone, severityClass, severityLabel } from '@/lib/score';

type Panel = 'overview' | 'surfaces' | 'capabilities' | 'guardrails' | 'policy' | 'remedy' | 'proof' | 'evidence' | 'dap';
type FilterTone = 'all' | 'danger' | 'warning' | 'safe';

const panels: Array<{ id: Panel; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'surfaces', label: 'Surfaces' },
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'guardrails', label: 'Guardrails' },
  { id: 'policy', label: 'Policy' },
  { id: 'remedy', label: 'Remedy' },
  { id: 'proof', label: 'Proof' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'dap', label: 'DAP Reviewer' },
];

function text(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined || value === '') return fallback;
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || fallback;
  return String(value);
}

function decision(report: ScanReport) {
  return report.policy_evaluation?.decision || report.deployment_gate?.decision || 'REVIEW';
}

function securityScore(report: ScanReport) {
  return displayNumber(report.v3_security_score ?? report.safety_score, 0);
}

function statusTone(value?: string): 'safe' | 'warning' | 'danger' | 'neutral' {
  const tone = gateClass(value);
  if (tone === 'safe' || tone === 'warning' || tone === 'danger') return tone;
  return 'neutral';
}

function artifactCounts(report: ScanReport) {
  return {
    dependencies: report.dependency_risks?.risks?.length || 0,
    api: report.api_surface?.risks?.length || 0,
    appsec: report.appsec_risks?.risks?.length || 0,
    context: report.context_poisoning_risks?.risks?.length || 0,
    capabilities: report.capability_map?.capabilities?.length || 0,
    boundaries: report.trust_boundaries?.boundaries?.length || 0,
    weakGuardrails: displayNumber(report.guardrail_matrix?.summary?.risky_controls, 0),
    remedy: report.remedy_plan?.steps?.length || 0,
  };
}

function topBlockers(report: ScanReport) {
  const items: string[] = [];
  report.policy_evaluation?.hard_blockers?.slice(0, 4).forEach((blocker) => items.push(text(blocker.title || blocker.control_id || blocker.risk_type, 'Policy blocker')));
  report.guardrail_matrix?.controls?.filter((control) => ['weak', 'partial'].includes(String(control.status).toLowerCase())).slice(0, 4).forEach((control) => {
    const label = text(control.label || control.control_id, 'Guardrail gap');
    if (!items.includes(label)) items.push(label);
  });
  return items.slice(0, 4);
}

export function ReportWorkspace({ report }: { report: ScanReport }) {
  const [activePanel, setActivePanel] = useState<Panel>('overview');
  const [capabilityFilter, setCapabilityFilter] = useState<FilterTone>('all');
  const [guardrailFilter, setGuardrailFilter] = useState('all');
  const [evidenceQuery, setEvidenceQuery] = useState('');
  const [openCapability, setOpenCapability] = useState<Capability | null>(null);
  const [openRemedy, setOpenRemedy] = useState<string | null>(null);

  const score = securityScore(report);
  const counts = artifactCounts(report);
  const projectName = report.project_name || report.repo_name || report.upload_name || 'Current scan';
  const currentDecision = decision(report);
  const findings = report.findings || [];

  const filteredCapabilities = useMemo(() => {
    const capabilities = report.capability_map?.capabilities || [];
    if (capabilityFilter === 'all') return capabilities;
    return capabilities.filter((cap) => riskClass(cap.risk_level) === capabilityFilter || severityClass(cap.risk_level) === capabilityFilter);
  }, [report.capability_map?.capabilities, capabilityFilter]);

  const filteredControls = useMemo(() => {
    const controls = report.guardrail_matrix?.controls || [];
    if (guardrailFilter === 'all') return controls;
    return controls.filter((control) => String(control.status || '').toLowerCase() === guardrailFilter);
  }, [report.guardrail_matrix?.controls, guardrailFilter]);

  const evidenceRows = useMemo(() => {
    const rows = [
      ...findings.map((item) => ({ type: item.category || 'Finding', title: item.title || 'Finding', severity: item.severity, file: item.file, line: item.line, detail: item.description || item.why_it_matters || item.evidence, fix: item.suggested_fix })),
      ...(report.appsec_risks?.risks || []).map((item) => ({ type: 'AppSec', title: item.title, severity: item.severity, file: item.file, line: item.line, detail: item.why_it_matters || item.evidence, fix: item.recommended_fix })),
      ...(report.api_surface?.risks || []).map((item) => ({ type: 'API', title: item.title, severity: item.severity, file: item.file, line: item.line, detail: item.why_it_matters || item.evidence, fix: item.recommended_fix })),
      ...(report.context_poisoning_risks?.risks || []).map((item) => ({ type: 'Context', title: item.title, severity: item.severity, file: item.file, line: item.line, detail: item.why_it_matters || item.evidence, fix: item.recommended_fix })),
      ...(report.dependency_risks?.risks || []).map((item) => ({ type: 'Dependency', title: item.title || item.package, severity: item.severity, file: item.file, line: item.line, detail: item.why_it_matters || item.evidence, fix: item.recommended_fix })),
    ];
    const query = evidenceQuery.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query));
  }, [report, findings, evidenceQuery]);

  return (
    <main className="adapt-page report-workspace-page">
      <div className="adapt-container report-shell-grid">
        <section className={`report-hero-card ${statusTone(currentDecision)}`}>
          <div>
            <div className="adapt-kicker"><span />Security review report</div>
            <h1>{projectName}</h1>
            <p>Policy: {text(report.policy_evaluation?.selected_policy?.label || report.policy_id, 'General AI App')} · Source: {text(report.scan_type)} · Static text scan</p>
          </div>
          <div className="report-score-card">
            <span className="report-score-label">Overall score</span>
            <strong>{score}</strong>
            <small>Security score</small>
            <AdaptBadge tone={statusTone(currentDecision)}>{String(currentDecision).toUpperCase()}</AdaptBadge>
          </div>
          <div className="report-hero-actions">
            <AdaptButton tone="secondary" onClick={() => downloadText(`${projectName}-adapt-report.json`, JSON.stringify(report, null, 2), 'application/json')}><Download size={14} />Export</AdaptButton>
            <AdaptButton tone="secondary" href="/compare">Compare</AdaptButton>
            <AdaptButton tone="primary" href="/scanner">Open Scanner</AdaptButton>
          </div>
        </section>

        <nav className="report-panel-nav" aria-label="Report panels">
          {panels.map((panel) => <button key={panel.id} className={activePanel === panel.id ? 'active' : ''} onClick={() => setActivePanel(panel.id)}>{panel.label}</button>)}
        </nav>

        <section className="report-panel-stage">
          {activePanel === 'overview' && <OverviewPanel report={report} score={score} counts={counts} blockers={topBlockers(report)} setPanel={setActivePanel} />}
          {activePanel === 'surfaces' && <SurfacesPanel report={report} counts={counts} />}
          {activePanel === 'capabilities' && <CapabilitiesPanel capabilities={filteredCapabilities} filter={capabilityFilter} setFilter={setCapabilityFilter} onOpen={setOpenCapability} />}
          {activePanel === 'guardrails' && <GuardrailsPanel controls={filteredControls} filter={guardrailFilter} setFilter={setGuardrailFilter} />}
          {activePanel === 'policy' && <PolicyPanel report={report} />}
          {activePanel === 'remedy' && <RemedyPanel steps={report.remedy_plan?.steps || []} openRemedy={openRemedy} setOpenRemedy={setOpenRemedy} />}
          {activePanel === 'proof' && <ProofPanel report={report} />}
          {activePanel === 'evidence' && <EvidencePanel rows={evidenceRows} query={evidenceQuery} setQuery={setEvidenceQuery} />}
          {activePanel === 'dap' && <DapPanelLocal report={report} />}
        </section>
      </div>

      {openCapability ? <CapabilityDrawer capability={openCapability} onClose={() => setOpenCapability(null)} /> : null}
    </main>
  );
}

function OverviewPanel({ report, score, counts, blockers, setPanel }: { report: ScanReport; score: number; counts: ReturnType<typeof artifactCounts>; blockers: string[]; setPanel: (panel: Panel) => void }) {
  const fixes = report.remedy_plan?.steps?.slice(0, 4) || [];
  return (
    <div className="report-panel-content overview-panel">
      <div className="overview-decision-card">
        <div className="adapt-kicker"><span />Release decision</div>
        <h2>Can this app ship?</h2>
        <p>{report.policy_evaluation?.summary || 'The release decision is based on score, required controls, hard blockers, and visible evidence in the scan report.'}</p>
        <div className="overview-score-row">
          <StatTile label="Security score" value={`${score}/100`} tone={scoreTone(score) as any} />
          <StatTile label="Decision" value={decision(report)} tone={statusTone(decision(report))} />
          <StatTile label="Remedy steps" value={counts.remedy} tone="accent" />
        </div>
      </div>
      <div className="overview-side-grid">
        <div className="adapt-panel">
          <SectionTitle label="Top blockers" title="Why it stops" />
          {blockers.length ? <ul className="adapt-list">{blockers.map((item) => <li key={item}><ShieldAlert size={14} />{item}</li>)}</ul> : <p>No hard blockers were returned by the selected policy.</p>}
          <AdaptButton tone="secondary" onClick={() => setPanel('policy')}>Open policy logic</AdaptButton>
        </div>
        <div className="adapt-panel">
          <SectionTitle label="Fix first" title="Remedy queue" />
          {fixes.length ? <ol className="adapt-ordered-list">{fixes.map((step) => <li key={step.id || step.title}>{step.title}</li>)}</ol> : <p>No remedy steps were generated for this report.</p>}
          <AdaptButton tone="secondary" onClick={() => setPanel('remedy')}>Open remedy plan</AdaptButton>
        </div>
      </div>
      <div className="surface-metric-row">
        <StatTile label="Dependencies" value={counts.dependencies} />
        <StatTile label="API risks" value={counts.api} />
        <StatTile label="AppSec" value={counts.appsec} />
        <StatTile label="Capabilities" value={counts.capabilities} />
        <StatTile label="Weak guardrails" value={counts.weakGuardrails} tone={counts.weakGuardrails ? 'warning' : 'safe'} />
      </div>
    </div>
  );
}

function SurfacesPanel({ report, counts }: { report: ScanReport; counts: ReturnType<typeof artifactCounts> }) {
  const surfaces = [
    ['File Inventory', displayNumber(report.file_inventory?.supported_files), 'Supported files scanned'],
    ['Dependencies', counts.dependencies, 'Risky specs or hygiene gaps'],
    ['API Surface', counts.api, 'Endpoint control risks'],
    ['AppSec Sinks', counts.appsec, 'Static risky sink evidence'],
    ['Context Risk', counts.context, 'Memory/RAG influence risks'],
    ['Capabilities', counts.capabilities, 'Actions the app can perform'],
    ['Trust Boundaries', counts.boundaries, 'Cross-zone data/control flows'],
    ['Guardrails', counts.weakGuardrails, 'Weak or partial controls'],
  ];
  return <div className="report-panel-content"><SectionTitle label="Security surfaces" title="What A-DAP-T reviewed" /><div className="surface-review-grid">{surfaces.map(([name, value, note]) => <div className="surface-review-row" key={String(name)}><strong>{name}</strong><span>{value}</span><p>{note}</p></div>)}</div></div>;
}

function CapabilitiesPanel({ capabilities, filter, setFilter, onOpen }: { capabilities: Capability[]; filter: FilterTone; setFilter: (filter: FilterTone) => void; onOpen: (cap: Capability) => void }) {
  return (
    <div className="report-panel-content">
      <SectionTitle label="Capability map" title="What this app can actually do" action={<FilterChips values={['all', 'danger', 'warning', 'safe']} active={filter} onSelect={setFilter} />} />
      {capabilities.length ? <div className="capability-table"><div className="capability-row head"><span>Capability</span><span>Type</span><span>Approval</span><span>Audit</span><span>Risk</span></div>{capabilities.slice(0, 24).map((cap) => <button key={cap.id || cap.name} className="capability-row" onClick={() => onOpen(cap)}><span><strong>{cap.label || cap.name}</strong><small>{text(cap.file)}:{text(cap.line, '')}</small></span><span>{categoryName(text(cap.capability_type, 'capability'))}</span><span>{cap.approval_found || !cap.requires_approval ? 'Covered' : 'Missing'}</span><span>{cap.audit_logging_found ? 'Visible' : 'Missing'}</span><span><AdaptBadge tone={riskClass(cap.risk_level) as any}>{text(cap.risk_level, 'review')}</AdaptBadge></span></button>)}</div> : <EmptyState title="No capabilities detected">The scanner did not identify tool, file, memory, database, or external-action capabilities.</EmptyState>}
    </div>
  );
}

function GuardrailsPanel({ controls, filter, setFilter }: { controls: GuardrailControl[]; filter: string; setFilter: (filter: string) => void }) {
  return (
    <div className="report-panel-content">
      <SectionTitle label="Guardrail matrix" title="Controls protecting the release surface" action={<FilterChips values={['all', 'weak', 'partial', 'strong', 'not_applicable']} active={filter} onSelect={setFilter} />} />
      <div className="guardrail-matrix-table"><div className="guardrail-row head"><span>Control</span><span>Status</span><span>Coverage</span><span>Risk instances</span><span>Recommendation</span></div>{controls.map((control) => <details key={control.control_id} className="guardrail-row"><summary><span><strong>{control.label || control.control_id}</strong><small>{categoryName(text(control.category))}</small></span><span><AdaptBadge tone={riskClass(control.status) as any}>{text(control.status)}</AdaptBadge></span><span>{control.coverage_percent == null ? 'N/A' : `${control.coverage_percent}%`}</span><span>{displayNumber(control.risk_instances)}</span><span>{text(control.recommended_action).slice(0, 120)}</span></summary><p>{text(control.recommended_action)}</p></details>)}</div>
    </div>
  );
}

function PolicyPanel({ report }: { report: ScanReport }) {
  const policy = report.policy_evaluation;
  if (!policy) return <EmptyState title="No policy artifact">This report does not include policy evaluation.</EmptyState>;
  return (
    <div className="report-panel-content policy-panel-grid">
      <div className="adapt-panel policy-summary-card">
        <SectionTitle label="Policy evaluation" title={text(policy.selected_policy?.label || policy.selected_policy?.policy_id, 'Selected policy')} />
        <div className="policy-decision-chain"><span>Score check</span><ChevronRight size={14} /><span>Required controls</span><ChevronRight size={14} /><span>Hard blockers</span><ChevronRight size={14} /><strong>{policy.decision}</strong></div>
        <div className="surface-metric-row"><StatTile label="Score" value={policy.safety_score ?? '—'} /><StatTile label="Minimum" value={policy.minimum_safety_score ?? '—'} /><StatTile label="Controls passed" value={`${policy.required_controls_passed || 0}/${policy.required_controls_total || 0}`} /><StatTile label="Blockers" value={policy.blocker_count || 0} tone={(policy.blocker_count || 0) > 0 ? 'danger' : 'safe'} /></div>
      </div>
      <div className="adapt-panel">
        <SectionTitle label="Hard blockers" title="Why the decision was made" />
        {policy.hard_blockers?.length ? <ul className="adapt-list">{policy.hard_blockers.map((blocker, index) => <li key={index}><AlertTriangle size={14} />{text(blocker.title || blocker.control_id || blocker.risk_type)}</li>)}</ul> : <p>No hard blockers returned.</p>}
      </div>
    </div>
  );
}

function RemedyPanel({ steps, openRemedy, setOpenRemedy }: { steps: RemedyPlanStep[]; openRemedy: string | null; setOpenRemedy: (id: string | null) => void }) {
  return <div className="report-panel-content"><SectionTitle label="Remedy plan" title="Fix sequence by release impact" />{steps.length ? <div className="remedy-workqueue">{steps.map((step, index) => { const id = step.id || step.title || String(index); const isOpen = openRemedy === id; return <article className="remedy-workitem" key={id}><button onClick={() => setOpenRemedy(isOpen ? null : id)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step.title}</strong><AdaptBadge tone={severityClass(step.severity) as any}>{severityLabel(step.severity)}</AdaptBadge></button><div className="remedy-workitem-meta"><em>Impact: {text(step.expected_gate_impact)}</em><em>Effort: {text(step.estimated_effort)}</em><button onClick={() => copyText(`${step.title}\n${step.recommended_fix || ''}`)}>Copy fix brief</button></div>{isOpen ? <div className="remedy-detail"><p>{step.why_it_matters}</p><strong>Recommended fix</strong><p>{step.recommended_fix}</p>{step.validation_steps?.length ? <ul>{step.validation_steps.map((v) => <li key={v}>{v}</li>)}</ul> : null}</div> : null}</article>; })}</div> : <EmptyState title="No remedy steps generated">The selected policy did not return prioritized remediation work for this report.</EmptyState>}</div>;
}

function ProofPanel({ report }: { report: ScanReport }) {
  const attacks = report.attack_simulations || [];
  const patches = report.patches || [];
  return <div className="report-panel-content"><SectionTitle label="Static proof" title="Attack paths and patch previews">Proof paths are static simulations. They do not execute the target project.</SectionTitle><div className="proof-grid">{attacks.slice(0, 6).map((attack, index) => <article className="adapt-panel proof-card" key={`${attack.finding_id}-${index}`}><AdaptBadge tone="warning">Static proof only</AdaptBadge><h3>{attack.title || 'Attack path'}</h3><p>{attack.attack_goal || attack.impact}</p>{attack.malicious_input ? <pre>{attack.malicious_input}</pre> : null}<small>{attack.guardrail || attack.required_fix}</small></article>)}{!attacks.length ? <EmptyState title="No proof paths">This report does not include legacy proof-mode artifacts.</EmptyState> : null}</div>{patches.length ? <div className="patch-preview-strip"><SectionTitle label="Patch previews" title="Generated fix artifacts" /><div className="proof-grid">{patches.slice(0, 3).map((patch) => <article className="adapt-panel proof-card" key={patch.finding_id || patch.title}><h3>{patch.title}</h3><p>{patch.risk_reduction || patch.explanation}</p><button onClick={() => downloadText(patch.patch_filename || 'adapt.patch', patch.diff || '')}>Download patch</button></article>)}</div></div> : null}</div>;
}

function EvidencePanel({ rows, query, setQuery }: { rows: any[]; query: string; setQuery: (query: string) => void }) {
  return <div className="report-panel-content"><SectionTitle label="Evidence" title="Developer evidence table" action={<label className="evidence-search"><Search size={14} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search evidence..." /></label>} />{rows.length ? <div className="evidence-table"><div className="evidence-row head"><span>Severity</span><span>Category</span><span>Location</span><span>Evidence</span><span>Fix</span></div>{rows.slice(0, 50).map((row, index) => <details className="evidence-row" key={`${row.title}-${index}`}><summary><span><AdaptBadge tone={severityClass(row.severity) as any}>{severityLabel(row.severity)}</AdaptBadge></span><span>{row.type}</span><span>{text(row.file)}:{text(row.line, '')}</span><span>{text(row.title)}</span><span>{text(row.fix).slice(0, 80)}</span></summary><p>{text(row.detail)}</p><p><strong>Fix:</strong> {text(row.fix)}</p></details>)}</div> : <EmptyState title="No evidence rows">No matching evidence for the current query.</EmptyState>}</div>;
}

function DapPanelLocal({ report }: { report: ScanReport }) {
  const quick = ['Explain the release decision', 'What should I fix first?', 'Which guardrails are weakest?', 'Write a developer handoff brief'];
  return <div className="report-panel-content dap-reviewer-panel"><div className="adapt-panel dap-action-panel"><SectionTitle label="DAP reviewer" title="Ask the report, not a generic bot" /><div className="dap-quick-grid">{quick.map((item) => <button key={item}>{item}</button>)}</div></div><div className="adapt-panel dap-answer-panel"><Bot size={22} /><h3>Sample answer</h3><p>Based on this report, the release is blocked because high-impact actions lack visible approval and audit coverage. Fix approval gates first, then rate limits, then memory/context isolation.</p><textarea placeholder="Ask about this report..." /></div></div>;
}

function CapabilityDrawer({ capability, onClose }: { capability: Capability; onClose: () => void }) {
  return <div className="adapt-drawer-backdrop" onClick={onClose}><aside className="adapt-drawer" onClick={(e) => e.stopPropagation()}><button className="drawer-close" onClick={onClose}>Close</button><div className="adapt-kicker"><span />Capability detail</div><h2>{capability.label || capability.name}</h2><p>{capability.recommended_review}</p><dl><div><dt>Type</dt><dd>{categoryName(text(capability.capability_type))}</dd></div><div><dt>Risk</dt><dd>{text(capability.risk_level)}</dd></div><div><dt>Data touched</dt><dd>{text(capability.data_touched)}</dd></div><div><dt>Approval</dt><dd>{capability.approval_found ? 'Visible' : 'Missing or not required'}</dd></div><div><dt>Audit log</dt><dd>{capability.audit_logging_found ? 'Visible' : 'Missing'}</dd></div></dl><pre>{capability.evidence}</pre></aside></div>;
}

function FilterChips<T extends string>({ values, active, onSelect }: { values: T[]; active: T; onSelect: (value: T) => void }) {
  return <div className="filter-chip-row"><Filter size={14} />{values.map((value) => <button key={value} className={active === value ? 'active' : ''} onClick={() => onSelect(value)}>{categoryName(value)}</button>)}</div>;
}
