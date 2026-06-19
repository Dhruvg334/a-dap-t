'use client';

import { useState } from 'react';
import type { AttackSimulation, PatchPreview, ScanReport } from '@/types/scan';
import { categoryName, gateClass, severityClass, severityLabel } from '@/lib/score';
import { copyText, downloadText } from '@/lib/api';
import { DapPanel } from '@/components/dap/DapPanel';

function riskFillStyle(value: number): string {
  const score = Math.max(0, Math.min(100, Number(value) || 0));
  if (score <= 39) return 'linear-gradient(90deg, #10b981 0%, #34d399 100%)';
  if (score <= 69) return 'linear-gradient(90deg, #10b981 0%, #f59e0b 100%)';
  return 'linear-gradient(90deg, #10b981 0%, #f59e0b 58%, #ef4444 100%)';
}

export function ReportWorkspace({ report }: { report: ScanReport }) {
  const gate = report.deployment_gate || null;
  const summary = report.summary || {};
  const findings = report.findings || [];
  const attacks = report.attack_simulations || [];
  const patches = report.patches || [];
  const categories = report.category_scores || {};

  const projectName = report.project_name || report.repo_name || 'Current scan';
  const score = Number(report.safety_score ?? 0);
  const gateDecision = gate?.decision || (score >= 80 ? 'ALLOW' : score >= 60 ? 'REVIEW' : 'BLOCK');

  return (
    <main className="page-shell">
      <div className="container">
        <div className="page-head centered">
          <div>
            <div className="tech-label page-kicker"><span className="pulse-dot" /> V2 REPORT WORKSPACE</div>
            <h1 className="page-title">Deployment<br />verdict.</h1>
            <p className="page-desc">One workspace for the score, category risks, findings, static proof paths, generated patch previews, deployment gate, and DAP assistant.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => downloadText(`${projectName}-report.json`, JSON.stringify(report, null, 2), 'application/json')}>Download JSON</button>
            <button className="btn btn-primary" onClick={() => window.print()}>Export PDF</button>
          </div>
        </div>

        <section className="stat-grid" style={{ marginBottom: 18 }}>
          <div className="glass-card stat shimmer">
            <div className="stat-value">{score}</div>
            <div className="stat-label">Safety Score</div>
          </div>
          <div className="glass-card stat">
            <div className="stat-value">{gateDecision}</div>
            <div className="stat-label">Deployment Gate</div>
          </div>
          <div className="glass-card stat">
            <div className="stat-value">{summary.critical ?? 0}</div>
            <div className="stat-label">Critical</div>
          </div>
          <div className="glass-card stat">
            <div className="stat-value">{findings.length}</div>
            <div className="stat-label">Findings</div>
          </div>
        </section>

        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.55fr) minmax(340px, 0.8fr)', alignItems: 'start' }}>
          <div className="grid">
            <ExecutiveVerdict report={report} />
            <CategoryPanel categories={categories} />
            <FindingsPanel findings={findings} />
            <AttackPanel attacks={attacks} />
            <PatchPanel patches={patches} />
            <DeploymentGatePanel gate={gate} score={score} />
          </div>
          <DapPanel report={report} />
        </div>
      </div>
    </main>
  );
}

function ExecutiveVerdict({ report }: { report: ScanReport }) {
  const gate = report.deployment_gate;
  const decision = gate?.decision || 'REVIEW';
  return (
    <section className="glass-card panel shimmer">
      <div className="panel-head">
        <div>
          <div className="panel-label">Executive verdict</div>
          <h2 className="panel-title">Can this agent ship?</h2>
        </div>
        <span className={`pill ${gateClass(decision)}`}>{gate?.decision_badge || decision}</span>
      </div>
      <p className="muted">{gate?.summary || report.ai_report_summary || report.ai_summary || 'A-DAP-T generated a deterministic risk report for this agent.'}</p>
      {gate?.decision_reason && <p className="faint">{gate.decision_reason}</p>}
      {gate?.required_action && <p><strong>Required action:</strong> <span className="muted">{gate.required_action}</span></p>}
    </section>
  );
}

function CategoryPanel({ categories }: { categories: Record<string, number> }) {
  const entries = Object.entries(categories);
  if (!entries.length) return null;

  return (
    <section className="glass-card panel">
      <div className="panel-head">
        <div>
          <div className="panel-label">Category risk scoring</div>
          <h2 className="panel-title">Where the risk is concentrated.</h2>
        </div>
        <span className="pill neutral">Higher is worse</span>
      </div>
      {entries.map(([key, value]) => (
        <div className="category-row" key={key}>
          <div className="category-name">{categoryName(key)}</div>
          <div className="risk-bar"><div className="risk-fill" style={{ width: `${Math.min(100, Math.max(0, Number(value)))}%`, background: riskFillStyle(Number(value)) }} /></div>
          <div className="faint">{value}</div>
        </div>
      ))}
    </section>
  );
}

function FindingsPanel({ findings }: { findings: ScanReport['findings'] }) {
  if (!findings?.length) return null;

  return (
    <section className="grid">
      <div className="panel-head" style={{ marginTop: 12 }}>
        <div>
          <div className="panel-label">Findings</div>
          <h2 className="section-title">What needs attention.</h2>
        </div>
      </div>
      {findings.map((finding, index) => (
        <article className="glass-card finding-card" key={finding.id || `${finding.title}-${index}`}>
          <div className="finding-title-row">
            <div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <span className={`pill ${severityClass(finding.severity)}`}>{severityLabel(finding.severity)}</span>
                {finding.category && <span className="pill neutral">{finding.category}</span>}
                {finding.id && <span className="pill neutral">{finding.id}</span>}
              </div>
              <h3 className="finding-title">{finding.title || 'Untitled finding'}</h3>
              <p className="muted">{finding.description || finding.why_it_matters}</p>
            </div>
            <span className="faint">{finding.file}{finding.line ? `:${finding.line}` : ''}</span>
          </div>
          {finding.evidence && <pre className="code-block">{finding.evidence}</pre>}
          {finding.suggested_fix && <p><strong>Suggested fix:</strong> <span className="muted">{finding.suggested_fix}</span></p>}
        </article>
      ))}
    </section>
  );
}

function AttackPanel({ attacks }: { attacks: AttackSimulation[] }) {
  if (!attacks.length) return null;
  return (
    <section className="grid">
      <div className="panel-head" style={{ marginTop: 22 }}>
        <div>
          <div className="panel-label">Prove Mode</div>
          <h2 className="section-title">Static attack paths.</h2>
        </div>
        <span className="pill warning">No live exploit</span>
      </div>
      <div className="grid grid-2">
        {attacks.slice(0, 8).map((attack, index) => <AttackCard key={`${attack.finding_id}-${index}`} attack={attack} />)}
      </div>
    </section>
  );
}

function AttackCard({ attack }: { attack: AttackSimulation }) {
  return (
    <article className="glass-card artifact-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <span className="pill danger">{attack.simulation_type || attack.risk_level || 'attack path'}</span>
          <h3>{attack.title || 'Static attack simulation'}</h3>
        </div>
        <span className="faint">{attack.location || attack.file}</span>
      </div>
      <p className="muted"><strong>Goal:</strong> {attack.attack_goal}</p>
      {attack.malicious_input && <pre className="code-block">{attack.malicious_input}</pre>}
      {attack.attack_steps?.length ? <ol className="list-clean">{attack.attack_steps.map((step, i) => <li key={i}>{step}</li>)}</ol> : null}
      {attack.detection_signal && <p className="faint"><strong>Detection signal:</strong> {attack.detection_signal}</p>}
      {attack.guardrail && <p><strong>Guardrail:</strong> <span className="muted">{attack.guardrail}</span></p>}
    </article>
  );
}

function PatchPanel({ patches }: { patches: PatchPreview[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (!patches.length) return null;

  return (
    <section className="grid">
      <div className="panel-head" style={{ marginTop: 22 }}>
        <div>
          <div className="panel-label">Generated fixes</div>
          <h2 className="section-title">Patch previews.</h2>
        </div>
        <span className="pill neutral">Preview only</span>
      </div>
      {patches.slice(0, 8).map((patch, index) => {
        const id = patch.finding_id || `${patch.title}-${index}`;
        const isOpen = openId === id;
        return (
          <article className="glass-card artifact-card" key={id}>
            <div className="finding-title-row">
              <div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span className="pill safe">{patch.patch_type || 'patch'}</span>
                  {patch.estimated_effort && <span className="pill neutral">{patch.estimated_effort} effort</span>}
                </div>
                <h3 className="finding-title">{patch.title || 'Generated patch preview'}</h3>
                <p className="muted">{patch.risk_reduction || patch.explanation}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary btn-small" onClick={() => setOpenId(isOpen ? null : id)}>{isOpen ? 'Hide diff' : 'View diff'}</button>
                <button className="btn btn-secondary btn-small" onClick={() => copyText(patch.diff || '')}>Copy</button>
                <button className="btn btn-primary btn-small" onClick={() => downloadText(patch.patch_filename || 'adapt.patch', patch.diff || '')}>Download</button>
              </div>
            </div>
            {isOpen && <pre className="code-block">{patch.diff || 'No diff provided.'}</pre>}
            {patch.validation_steps?.length ? <ul className="list-clean">{patch.validation_steps.map((step, i) => <li key={i}>{step}</li>)}</ul> : null}
          </article>
        );
      })}
    </section>
  );
}

function DeploymentGatePanel({ gate, score }: { gate: ScanReport['deployment_gate']; score: number }) {
  if (!gate) return null;
  const workflow = gate.github_actions_yaml || '';
  const policy = gate.policy_json || JSON.stringify(gate.recommended_policy || {}, null, 2);
  return (
    <section className="glass-card panel shimmer">
      <div className="panel-head">
        <div>
          <div className="panel-label">Deployment gate</div>
          <h2 className="panel-title">Block unsafe releases.</h2>
        </div>
        <span className={`pill ${gateClass(gate.decision)}`}>{gate.decision_badge || gate.decision}</span>
      </div>
      <div className="grid grid-2">
        <div>
          <p><strong>Gate score:</strong> <span className="muted">{gate.gate_score ?? score}</span></p>
          <p><strong>Minimum score:</strong> <span className="muted">{gate.minimum_safety_score ?? 75}</span></p>
          {gate.blockers?.length ? <ul className="list-clean">{gate.blockers.map((b, i) => <li key={i}>{b}</li>)}</ul> : null}
        </div>
        <div>
          {gate.next_actions?.length ? <ul className="list-clean">{gate.next_actions.map((a, i) => <li key={i}>{a}</li>)}</ul> : null}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            <button className="btn btn-secondary btn-small" onClick={() => copyText(workflow)}>Copy workflow</button>
            <button className="btn btn-secondary btn-small" onClick={() => downloadText(gate.workflow_filename || 'adapt-safety-gate.yml', workflow, 'text/yaml')}>Download workflow</button>
            <button className="btn btn-primary btn-small" onClick={() => downloadText(gate.policy_filename || 'adapt-policy.json', policy, 'application/json')}>Download policy</button>
          </div>
        </div>
      </div>
    </section>
  );
}
