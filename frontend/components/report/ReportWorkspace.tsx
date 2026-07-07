'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, Download, Filter, Search, ShieldAlert } from 'lucide-react';
import type { Capability, GuardrailControl, RemedyPlanStep, ScanReport } from '@/types/scan';
import { copyText, downloadText } from '@/lib/api';
import { AdaptBadge, AdaptButton, EmptyState, SectionTitle, StatTile } from '@/components/ui/AdaptUI';
import { categoryName, displayNumber, gateClass, riskClass, scoreTone, severityClass, severityLabel } from '@/lib/score';

type Panel = 'overview' | 'surfaces' | 'capabilities' | 'guardrails' | 'policy_remedy' | 'proof' | 'evidence';
type FilterTone = 'all' | 'danger' | 'warning' | 'safe';

const panels: Array<{ id: Panel; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'surfaces', label: 'Surfaces' },
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'guardrails', label: 'Guardrails' },
  { id: 'policy_remedy', label: 'Policy & Remedy' },
  { id: 'proof', label: 'Proof' },
  { id: 'evidence', label: 'Evidence' },
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

function hasRealValue(value: unknown) {
  return value !== undefined && value !== null && value !== '';
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
    <main className="adapt-page report-workspace-page" style={{ paddingTop: '100px' }}>
      <div className="adapt-container" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '40px', alignItems: 'start', maxWidth: '1440px' }}>
        
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '100px' }}>
          
          <nav aria-label="Report panels" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {panels.map((panel) => (
              <button 
                key={panel.id} 
                onClick={() => setActivePanel(panel.id)}
                style={{
                  textAlign: 'left',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: activePanel === panel.id ? 700 : 500,
                  background: activePanel === panel.id ? 'var(--adapt-border)' : 'transparent',
                  color: activePanel === panel.id ? 'var(--adapt-accent)' : 'var(--adapt-muted)',
                  transition: 'all 0.2s ease',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {panel.label}
              </button>
            ))}
          </nav>
        </aside>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', minWidth: 0 }}>
          <header style={{ padding: '40px', background: 'var(--adapt-surface)', border: '1px solid var(--adapt-border)', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div className="adapt-kicker"><span />Security review report</div>
              <h1 style={{ fontFamily: 'Space Grotesk, Inter, sans-serif', fontSize: 'clamp(28px, 3.5vw, 42px)', lineHeight: 1.1, margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '-0.02em', color: 'var(--adapt-text)' }}>{projectName}</h1>
              <p style={{ color: 'var(--adapt-muted)', fontSize: '15px' }}>Policy: {text(report.policy_evaluation?.selected_policy?.label || report.policy_id, 'General AI App')} · Source: {text(report.scan_type)}</p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
              <AdaptButton tone="primary" href="/scanner">Open Scanner</AdaptButton>
              <AdaptButton tone="secondary" href="/compare">Compare</AdaptButton>
              <AdaptButton tone="secondary" onClick={() => downloadText(`${projectName}-adapt-report.json`, JSON.stringify(report, null, 2), 'application/json')}><Download size={14} />Export</AdaptButton>
            </div>
          </header>

          <section className="report-panel-stage" style={{ background: 'transparent', border: 'none', padding: 0 }}>
            {activePanel === 'overview' && <OverviewPanel report={report} score={score} counts={counts} blockers={topBlockers(report)} setPanel={setActivePanel} />}
            {activePanel === 'surfaces' && <SurfacesPanel report={report} counts={counts} />}
            {activePanel === 'capabilities' && <CapabilitiesPanel capabilities={filteredCapabilities} filter={capabilityFilter} setFilter={setCapabilityFilter} onOpen={setOpenCapability} />}
            {activePanel === 'guardrails' && <GuardrailsPanel controls={filteredControls} filter={guardrailFilter} setFilter={setGuardrailFilter} />}
            {activePanel === 'policy_remedy' && <PolicyRemedyPanel report={report} openRemedy={openRemedy} setOpenRemedy={setOpenRemedy} />}
            {activePanel === 'proof' && <ProofPanel report={report} />}
            {activePanel === 'evidence' && <EvidencePanel rows={evidenceRows} query={evidenceQuery} setQuery={setEvidenceQuery} />}
          </section>
        </div>
      </div>

      {openCapability ? <CapabilityDrawer capability={openCapability} onClose={() => setOpenCapability(null)} /> : null}
    </main>
  );
}

function OverviewPanel({ report, score, counts, blockers, setPanel }: { report: ScanReport; score: number; counts: ReturnType<typeof artifactCounts>; blockers: string[]; setPanel: (panel: Panel) => void }) {
  const fixes = report.remedy_plan?.steps?.slice(0, 3) || [];
  const currentDecision = decision(report);
  return (
    <div className="report-panel-content overview-panel refined">
      <section className="overview-release-card adapt-panel">
        <div className="adapt-kicker"><span />Release decision</div>
        <div className="overview-release-main">
          <h2>Can this app ship?</h2>
          <div className="overview-decision-badge"><AdaptBadge tone={statusTone(currentDecision)}>{currentDecision}</AdaptBadge><strong>{score}/100</strong></div>
        </div>
        <p>{report.policy_evaluation?.summary || 'The release decision is based on score, required controls, hard blockers, and visible evidence in the scan report.'}</p>
        <div className="overview-score-row compact">
          <StatTile label="Dependencies" value={counts.dependencies} />
          <StatTile label="API risks" value={counts.api} />
          <StatTile label="AppSec" value={counts.appsec} />
          <StatTile label="Capabilities" value={counts.capabilities} />
          <StatTile label="Weak guardrails" value={counts.weakGuardrails} tone={counts.weakGuardrails ? 'warning' : 'safe'} />
        </div>
      </section>

      <section className="overview-action-grid">
        <div className="adapt-panel">
          <SectionTitle label="Top blockers" title="What stops release" />
          {blockers.length ? <ul className="adapt-list refined-list">{blockers.map((item) => <li key={item}><ShieldAlert size={14} />{item}</li>)}</ul> : <p className="muted-copy">No hard blockers were returned by the selected policy.</p>}
          <AdaptButton tone="secondary" onClick={() => setPanel('policy_remedy')}>Open policy logic</AdaptButton>
        </div>
        <div className="adapt-panel">
          <SectionTitle label="Fix first" title="Next actions" />
          {fixes.length ? <ol className="adapt-ordered-list refined-list">{fixes.map((step) => <li key={step.id || step.title}>{step.title}</li>)}</ol> : <p className="muted-copy">No remedy steps were generated for this report.</p>}
          <AdaptButton tone="secondary" onClick={() => setPanel('policy_remedy')}>Open remedy plan</AdaptButton>
        </div>
      </section>
    </div>
  );
}

function SurfacesPanel({ report, counts }: { report: ScanReport; counts: ReturnType<typeof artifactCounts> }) {
  const surfaces = [
    ['File Inventory', displayNumber(report.file_inventory?.supported_files), 'Supported files read as text and grouped by framework/module.'],
    ['Dependencies', counts.dependencies, 'Package hygiene gaps such as unpinned specs, missing lockfiles, or direct-source dependencies.'],
    ['API Surface', counts.api, 'Routes checked for visible auth, rate limits, CORS posture, upload paths, and costly AI endpoints.'],
    ['AppSec Sinks', counts.appsec, 'Static code signals for path traversal, SSRF, command execution, SQL patterns, and unsafe extraction.'],
    ['Context Risk', counts.context, 'Memory/RAG flows where untrusted retrieved text can influence tool or response behavior.'],
    ['Capabilities', counts.capabilities, 'Tool, file, API, memory, database, and external-effect actions mapped to guardrail needs.'],
    ['Trust Boundaries', counts.boundaries, 'Data/control flows crossing user, app, model, tool, storage, and external-service zones.'],
    ['Guardrails', counts.weakGuardrails, 'Coverage for auth, approval, audit, rate limits, masking, allowlists, and isolation.'],
  ];
  return <div className="report-panel-content"><SectionTitle label="Security surfaces" title="What A-DAP-T reviewed" /><div className="surface-review-grid refined">{surfaces.map(([name, value, note]) => <div className="surface-review-row" key={String(name)}><strong>{name}</strong><span>{value}</span><p>{note}</p></div>)}</div></div>;
}

function CapabilitiesPanel({ capabilities, filter, setFilter, onOpen }: { capabilities: Capability[]; filter: FilterTone; setFilter: (filter: FilterTone) => void; onOpen: (cap: Capability) => void }) {
  return (
    <div className="report-panel-content">
      <SectionTitle label="Capability map" title="What this app can actually do" action={<FilterChips values={['all', 'danger', 'warning', 'safe']} active={filter} onSelect={setFilter} />} />
      {capabilities.length ? <div className="capability-table refined"><div className="capability-row head"><span>Capability</span><span>Type</span><span>Approval</span><span>Audit</span><span>Risk</span></div>{capabilities.slice(0, 24).map((cap) => <button key={cap.id || cap.name} className="capability-row" onClick={() => onOpen(cap)}><span><strong>{cap.label || cap.name}</strong><small>{text(cap.file)}:{text(cap.line, '')}</small></span><span>{categoryName(text(cap.capability_type, 'capability'))}</span><span>{cap.approval_found || !cap.requires_approval ? 'Covered' : 'Missing'}</span><span>{cap.audit_logging_found ? 'Visible' : 'Missing'}</span><span><AdaptBadge tone={riskClass(cap.risk_level) as any}>{text(cap.risk_level, 'review')}</AdaptBadge></span></button>)}</div> : <EmptyState title="No capabilities detected">The scanner did not identify tool, file, memory, database, or external-action capabilities.</EmptyState>}
    </div>
  );
}

function GuardrailsPanel({ controls, filter, setFilter }: { controls: GuardrailControl[]; filter: string; setFilter: (filter: string) => void }) {
  return (
    <div className="report-panel-content">
      <SectionTitle label="Guardrail matrix" title="Controls protecting the release surface" action={<FilterChips values={['all', 'weak', 'partial', 'strong', 'not_applicable']} active={filter} onSelect={setFilter} />} />
      {controls.length ? <div className="guardrail-card-grid">{controls.map((control) => <details key={control.control_id} className={`guardrail-card ${String(control.status || '').toLowerCase()}`}><summary><div><strong>{control.label || control.control_id}</strong><small>{categoryName(text(control.category))}</small></div><AdaptBadge tone={riskClass(control.status) as any}>{text(control.status)}</AdaptBadge></summary><div className="guardrail-card-body"><span>Coverage: {control.coverage_percent == null ? 'N/A' : `${control.coverage_percent}%`}</span><span>Risk instances: {displayNumber(control.risk_instances)}</span><p>{text(control.recommended_action)}</p></div></details>)}</div> : <EmptyState title="No guardrail controls">No guardrail matrix controls were returned.</EmptyState>}
    </div>
  );
}

function PolicyRemedyPanel({ report, openRemedy, setOpenRemedy }: { report: ScanReport; openRemedy: string | null; setOpenRemedy: (id: string | null) => void }) {
  const policy = report.policy_evaluation;
  const steps = report.remedy_plan?.steps || [];
  return (
    <div className="report-panel-content policy-remedy-panel">
      <section className="adapt-panel policy-summary-card">
        <SectionTitle label="Policy evaluation" title={text(policy?.selected_policy?.label || policy?.selected_policy?.policy_id || report.policy_id, 'Selected policy')} />
        <div className="policy-decision-chain"><span>Score check</span><ChevronRight size={14} /><span>Required controls</span><ChevronRight size={14} /><span>Hard blockers</span><ChevronRight size={14} /><strong>{policy?.decision || decision(report)}</strong></div>
        <div className="surface-metric-row compact"><StatTile label="Score" value={policy?.safety_score ?? securityScore(report)} /><StatTile label="Minimum" value={policy?.minimum_safety_score ?? '—'} /><StatTile label="Controls passed" value={`${policy?.required_controls_passed || 0}/${policy?.required_controls_total || 0}`} /><StatTile label="Blockers" value={policy?.blocker_count || 0} tone={(policy?.blocker_count || 0) > 0 ? 'danger' : 'safe'} /></div>
        {policy?.hard_blockers?.length ? <ul className="adapt-list refined-list policy-blockers">{policy.hard_blockers.map((blocker, index) => <li key={index}><AlertTriangle size={14} />{text(blocker.title || blocker.control_id || blocker.risk_type)}</li>)}</ul> : <p className="muted-copy">No hard blockers returned.</p>}
      </section>
      <section className="adapt-panel">
        <SectionTitle label="Remedy plan" title="Fix sequence by release impact" />
        {steps.length ? <div className="remedy-workqueue refined">{steps.map((step, index) => { const id = step.id || step.title || String(index); const isOpen = openRemedy === id; return <article className="remedy-workitem" key={id}><button onClick={() => setOpenRemedy(isOpen ? null : id)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step.title}</strong><AdaptBadge tone={severityClass(step.severity) as any}>{severityLabel(step.severity)}</AdaptBadge></button><div className="remedy-workitem-meta"><em>Impact: {text(step.expected_gate_impact)}</em><em>Effort: {text(step.estimated_effort)}</em><button onClick={() => copyText(`${step.title}\n${step.recommended_fix || ''}`)}>Copy fix brief</button></div>{isOpen ? <div className="remedy-detail"><p>{step.why_it_matters}</p><strong>Recommended fix</strong><p>{step.recommended_fix}</p>{step.validation_steps?.length ? <ul>{step.validation_steps.map((v) => <li key={v}>{v}</li>)}</ul> : null}</div> : null}</article>; })}</div> : <EmptyState title="No remedy steps generated">The selected policy did not return prioritized remediation work for this report.</EmptyState>}
      </section>
    </div>
  );
}

function ProofPanel({ report }: { report: ScanReport }) {
  const attacks = report.attack_simulations || [];
  const patches = report.patches || [];
  const fallbackProofs = [
    { title: 'Unapproved external action path', goal: 'A sensitive tool or external-effect function can be reached without visible reviewer approval.', input: 'Attempt the action without approval_id or reviewer context.', fix: 'Require approval state before executing external-effect actions.' },
    { title: 'Memory-influenced tool path', goal: 'Retrieved context can influence a downstream tool decision.', input: 'Inject instructions into stored context that change tool behavior.', fix: 'Isolate retrieved memory from tool execution and require explicit intent checks.' },
    { title: 'Untraceable action path', goal: 'A risky action executes without enough audit evidence for later review.', input: 'Complete a sensitive operation without logging actor, target, result, and timestamp.', fix: 'Add structured audit logging before or after high-impact tool calls.' },
  ];
  const proofRows = attacks.length ? attacks.slice(0, 6).map((attack) => ({ title: attack.title || 'Attack path', goal: attack.attack_goal || attack.impact || 'Static path that demonstrates why a guardrail is needed.', input: attack.malicious_input || '', fix: attack.guardrail || attack.required_fix || 'Add the missing guardrail before release.' })) : fallbackProofs;
  return <div className="report-panel-content"><SectionTitle label="Static proof" title="Attack paths and fix previews">Proof paths are static simulations. They explain risk paths without executing the target project.</SectionTitle><div className="proof-grid proof-grid-refined">{proofRows.map((attack, index) => <article className="adapt-panel proof-card" key={`${attack.title}-${index}`}><AdaptBadge tone="warning">Static proof only</AdaptBadge><h3>{attack.title}</h3><p>{attack.goal}</p>{attack.input ? <pre>{attack.input}</pre> : null}<div className="proof-fix"><strong>Guardrail needed</strong><span>{attack.fix}</span></div></article>)}</div>{patches.length ? <div className="patch-preview-strip"><SectionTitle label="Patch previews" title="Generated fix artifacts" /><div className="proof-grid proof-grid-refined">{patches.slice(0, 3).map((patch, index) => <article className="adapt-panel proof-card" key={patch.finding_id || patch.title || index}><h3>{patch.title}</h3><p>{patch.risk_reduction || patch.explanation}</p><AdaptButton tone="secondary" onClick={() => downloadText(patch.patch_filename || 'adapt.patch', patch.diff || '')}>Download patch</AdaptButton></article>)}</div></div> : null}</div>;
}

function EvidencePanel({ rows, query, setQuery }: { rows: any[]; query: string; setQuery: (query: string) => void }) {
  return (
    <div className="report-panel-content">
      <SectionTitle label="Evidence" title="Evidence index" action={<label className="evidence-search"><Search size={14} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search evidence..." /></label>} />
      {rows.length ? (
        <div className="evidence-card-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {rows.slice(0, 50).map((row, index) => (
            <details className="adapt-panel evidence-item-card" key={`${row.title}-${index}`} style={{ background: 'var(--adapt-surface)', border: '1px solid var(--adapt-border)', padding: '20px', borderRadius: '12px', cursor: 'pointer' }}>
              <summary style={{ display: 'flex', flexDirection: 'column', gap: '12px', listStyle: 'none' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                   <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                     <AdaptBadge tone={severityClass(row.severity) as any}>{severityLabel(row.severity)}</AdaptBadge>
                     <span style={{ fontSize: '13px', color: 'var(--adapt-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{row.type}</span>
                   </div>
                   <span style={{ fontSize: '12px', color: 'var(--adapt-faint)' }}>{text(row.file)}:{text(row.line, '')}</span>
                 </div>
                 <strong style={{ fontSize: '16px', lineHeight: 1.4, color: 'var(--adapt-text)', paddingRight: '24px' }}>{text(row.title)}</strong>
              </summary>
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--adapt-border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--adapt-faint)', marginBottom: '6px' }}>Details</strong>
                  <p style={{ margin: 0, color: 'var(--adapt-muted)', lineHeight: 1.6 }}>{text(row.detail)}</p>
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--adapt-faint)', marginBottom: '6px' }}>Recommended Fix</strong>
                  <p style={{ margin: 0, color: 'var(--adapt-text)', lineHeight: 1.6 }}>{text(row.fix)}</p>
                </div>
              </div>
            </details>
          ))}
        </div>
      ) : (
        <EmptyState title="No evidence rows">No matching evidence for the current query.</EmptyState>
      )}
    </div>
  );
}

function CapabilityDrawer({ capability, onClose }: { capability: Capability; onClose: () => void }) {
  return <div className="adapt-drawer-backdrop" onClick={onClose}><aside className="adapt-drawer" onClick={(e) => e.stopPropagation()}><button className="drawer-close" onClick={onClose}>Close</button><div className="adapt-kicker"><span />Capability detail</div><h2>{capability.label || capability.name}</h2><p>{capability.recommended_review}</p><dl><div><dt>Type</dt><dd>{categoryName(text(capability.capability_type))}</dd></div><div><dt>Risk</dt><dd>{text(capability.risk_level)}</dd></div><div><dt>Data touched</dt><dd>{text(capability.data_touched)}</dd></div><div><dt>Approval</dt><dd>{capability.approval_found ? 'Visible' : 'Missing or not required'}</dd></div><div><dt>Audit log</dt><dd>{capability.audit_logging_found ? 'Visible' : 'Missing'}</dd></div></dl>{hasRealValue(capability.evidence) ? <pre>{capability.evidence}</pre> : null}</aside></div>;
}

function FilterChips<T extends string>({ values, active, onSelect }: { values: T[]; active: T; onSelect: (value: T) => void }) {
  return <div className="filter-chip-row"><Filter size={14} />{values.map((value) => <button key={value} className={active === value ? 'active' : ''} onClick={() => onSelect(value)}>{categoryName(value)}</button>)}</div>;
}
