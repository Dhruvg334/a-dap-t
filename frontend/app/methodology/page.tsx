'use client';

import { useState } from 'react';
import { AdaptBadge, AdaptButton, PageHeader, SectionTitle } from '@/components/ui/AdaptUI';

const pipeline = [
  ['01', 'Inventory', 'Read source files as text, detect frameworks, package managers, config files, and project shape.'],
  ['02', 'Map surface', 'Build dependency, API, AppSec, context, capability, and trust-boundary artifacts.'],
  ['03', 'Check controls', 'Look for visible auth, rate limits, approval gates, audit logs, allowlists, masking, and isolation.'],
  ['04', 'Apply policy', 'Combine score, hard blockers, and required controls into BLOCK, REVIEW, or ALLOW.'],
  ['05', 'Plan remedy', 'Turn evidence into a fix-first sequence with expected gate impact and validation steps.'],
];

const surfaces = [
  ['Dependencies', 'Package hygiene and supply-chain drift.', 'Missing lockfile · unpinned spec · direct git dependency'],
  ['API Surface', 'Routes and endpoint controls.', 'Auth · rate limit · CORS · upload boundary'],
  ['AppSec Sinks', 'Risky static code paths.', 'SSRF · path traversal · command sink · unsafe extraction'],
  ['Capabilities', 'What the app can actually do.', 'Tool action · external effect · sensitive data'],
  ['Guardrails', 'Whether risky behavior is protected.', 'Approval · audit · allowlist · masking · isolation'],
  ['Policy & Remedy', 'Whether the release can move forward.', 'Decision · blockers · fix sequence · validation'],
];

const limitations = [
  ['Static review is not runtime proof', 'A-DAP-T reads project files and configuration. It does not execute uploaded projects or confirm live exploits.'],
  ['Missing evidence is not always absence', 'Some controls may live outside the scanned repository. The report says what was visible in the submitted project.'],
  ['AI explains, policy decides', 'The assistant helps interpret report evidence. It does not invent the verdict or replace manual security review.'],
];

export default function MethodologyPage() {
  const [openLimit, setOpenLimit] = useState(0);

  return (
    <main className="adapt-page methodology-workspace methodology-clean methodology-refined">
      <div className="adapt-container">
        <PageHeader label="Methodology" title="How A-DAP-T reviews AI application security">
          A-DAP-T performs a static, evidence-led review of project files to map release risk, weak controls, policy blockers, and fix-first actions before deployment.
        </PageHeader>

        <nav className="methodology-mini-nav" aria-label="Methodology sections">
          {['Pipeline', 'Surfaces', 'Decision logic', 'AI boundaries', 'Limitations'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replaceAll(' ', '-')}`}>{item}</a>
          ))}
        </nav>

        <section id="pipeline" className="adapt-panel method-compact-section method-hero-explain">
          <SectionTitle label="Review pipeline" title="From project files to release decision">
            The scanner turns project evidence into a release decision. Each step creates an artifact used by the report workspace.
          </SectionTitle>
          <div className="method-step-row refined">
            {pipeline.map(([num, title, body]) => (
              <article key={title}>
                <span>{num}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="surfaces" className="adapt-panel method-compact-section">
          <SectionTitle label="Security surfaces" title="What gets reviewed" />
          <div className="surface-method-table compact refined">
            {surfaces.map(([title, body, signal]) => (
              <div key={title}>
                <strong>{title}</strong>
                <p>{body}</p>
                <AdaptBadge tone="neutral">{signal}</AdaptBadge>
              </div>
            ))}
          </div>
        </section>

        <section id="decision-logic" className="methodology-decision-card refined">
          <div className="adapt-panel">
            <SectionTitle label="Scoring and policy" title="Score is not the whole decision" />
            <p>A-DAP-T produces a security score, but release status also depends on required controls and hard blockers. A high score can still need review if a critical guardrail is missing.</p>
          </div>
          <div className="adapt-panel decision-chain-panel refined">
            <span>Score check</span>
            <span>Required controls</span>
            <span>Hard blockers</span>
            <strong>Final decision</strong>
          </div>
        </section>

        <section id="ai-boundaries" className="methodology-two-col compact-two-col refined">
          <div className="adapt-panel">
            <SectionTitle label="AI role" title="AI explains report evidence" />
            <ul>
              <li>Explain the policy decision</li>
              <li>Summarize release risk</li>
              <li>Prioritize fix-first actions</li>
              <li>Write developer handoff briefs</li>
            </ul>
          </div>
          <div className="adapt-panel">
            <SectionTitle label="Boundaries" title="AI does not invent the verdict" />
            <ul>
              <li>Does not execute project code</li>
              <li>Does not confirm live exploits</li>
              <li>Does not guarantee production safety</li>
              <li>Does not replace manual review</li>
            </ul>
          </div>
        </section>

        <section id="limitations" className="adapt-panel method-compact-section">
          <SectionTitle label="Limitations" title="What A-DAP-T does not claim" />
          <div className="limit-accordion compact">
            {limitations.map(([title, body], index) => (
              <details key={title} open={openLimit === index} onToggle={(event) => { if ((event.target as HTMLDetailsElement).open) setOpenLimit(index); }}>
                <summary>{title}</summary>
                <p>{body}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="final-method-cta compact-final-cta">
          <h2>Ready to review a project?</h2>
          <p>Start with the built-in demo, then scan your own GitHub repository or ZIP project.</p>
          <div><AdaptButton tone="primary" href="/scanner">Start Scan</AdaptButton><AdaptButton tone="secondary" href="/report/current">View Report</AdaptButton></div>
        </section>
      </div>
    </main>
  );
}
