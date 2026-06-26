'use client';

import { useState } from 'react';
import { AdaptBadge, AdaptButton, PageHeader, SectionTitle } from '@/components/ui/AdaptUI';

const pipeline = [
  ['Inventory', 'Build file inventory, detect frameworks, package managers, and project structure.'],
  ['Surface mapping', 'Review dependencies, APIs, AppSec sinks, context flows, capabilities, and trust boundaries.'],
  ['Guardrail coverage', 'Measure visible controls such as auth, rate limits, approval gates, audit logs, allowlists, and masking.'],
  ['Policy evaluation', 'Apply the selected release policy to score, blockers, required controls, and review conditions.'],
  ['Remedy planning', 'Convert findings into an ordered fix sequence with expected gate impact and validation steps.'],
  ['Report review', 'Use DAP to explain report evidence, weak guardrails, policy decisions, and fix priorities.'],
];

const surfaces = [
  ['File Inventory', 'Project structure, supported files, languages, roles, and line counts.', 'source role map'],
  ['Dependency Risks', 'Unpinned packages, missing lockfiles, direct-source specs, and supply-chain drift.', 'missing lockfile'],
  ['API Surface', 'Routes, visible auth, rate limits, CORS, upload paths, and costly endpoints.', 'missing rate limit'],
  ['AppSec Sinks', 'Static evidence for risky file, network, command, SQL, archive, and HTML sinks.', 'SSRF sink'],
  ['Capabilities', 'Actions the app or agent can perform across tools, files, memory, APIs, and services.', 'external effect'],
  ['Guardrail Matrix', 'Coverage for approval, audit, auth, masking, sandboxing, allowlists, and dependency security.', 'weak approval'],
];

const limitations = [
  ['Static review is not runtime proof', 'A-DAP-T reads source and configuration. It does not execute uploaded projects.'],
  ['Controls can exist outside the repo', 'A missing visible control means the scan did not find proof inside the submitted project.'],
  ['AI explanations can be unavailable', 'If model limits are reached, deterministic report artifacts may still be available.'],
  ['Manual review still matters', 'Production-critical systems need human security review beyond static signals.'],
];

export default function MethodologyPage() {
  const [openLimit, setOpenLimit] = useState(0);
  return (
    <main className="adapt-page methodology-workspace">
      <div className="adapt-container methodology-grid">
        <aside className="methodology-rail">
          {['Pipeline', 'Surfaces', 'Scoring', 'AI Role', 'Limitations'].map((item) => <a href={`#${item.toLowerCase().replace(' ', '-')}`} key={item}>{item}</a>)}
        </aside>
        <div>
          <PageHeader label="Methodology" title="How A-DAP-T reviews AI application security">
            A-DAP-T performs a static review of project code and configuration to map release risks, weak controls, policy blockers, and fix-first actions before deployment.
          </PageHeader>

          <section id="pipeline" className="adapt-panel methodology-section">
            <SectionTitle label="Review pipeline" title="From project files to release decision" />
            <div className="method-process-grid">{pipeline.map(([title, body], index) => <article key={title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
          </section>

          <section id="surfaces" className="adapt-panel methodology-section">
            <SectionTitle label="Security surfaces" title="What A-DAP-T reviews" />
            <div className="surface-method-table">{surfaces.map(([title, body, signal]) => <div key={title}><strong>{title}</strong><p>{body}</p><AdaptBadge tone="neutral">{signal}</AdaptBadge></div>)}</div>
          </section>

          <section id="scoring" className="adapt-panel methodology-section scoring-explain-grid">
            <div><SectionTitle label="Scoring and policy" title="Score is not the whole decision" /><p>A-DAP-T produces a security score, but release decisions also depend on required controls and hard blockers.</p></div>
            <div className="decision-chain"><span>Score check</span><i /> <span>Required controls</span><i /> <span>Hard blockers</span><i /> <strong>Final decision</strong></div>
          </section>

          <section id="ai-role" className="methodology-two-col">
            <div className="adapt-panel"><SectionTitle label="AI role" title="AI explains report evidence" /><ul><li>explain the policy decision</li><li>summarize release risk</li><li>prioritize fix-first actions</li><li>write developer handoff briefs</li></ul></div>
            <div className="adapt-panel"><SectionTitle label="Boundaries" title="AI does not invent the verdict" /><ul><li>does not execute project code</li><li>does not confirm live exploits</li><li>does not replace manual review</li><li>does not decide release verdicts alone</li></ul></div>
          </section>

          <section id="limitations" className="adapt-panel methodology-section">
            <SectionTitle label="Limitations" title="What A-DAP-T does not claim" />
            <div className="limit-accordion">{limitations.map(([title, body], index) => <details key={title} open={openLimit === index} onToggle={(event) => { if ((event.target as HTMLDetailsElement).open) setOpenLimit(index); }}><summary>{title}</summary><p>{body}</p></details>)}</div>
          </section>

          <section className="final-method-cta"><h2>Ready to review a project?</h2><p>Start with the built-in demo, then scan your own GitHub repository or ZIP project.</p><div><AdaptButton tone="primary" href="/scanner">Start Scan</AdaptButton><AdaptButton tone="secondary" href="/report/current">View Sample Report</AdaptButton></div></section>
        </div>
      </div>
    </main>
  );
}
