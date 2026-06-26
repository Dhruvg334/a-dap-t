'use client';

import { useState } from 'react';
import { AdaptBadge, AdaptButton, PageHeader, SectionTitle } from '@/components/ui/AdaptUI';

const pipeline = [
  ['01', 'Inventory', 'Detect project structure, frameworks, package files, and supported source files.'],
  ['02', 'Surface map', 'Read dependencies, APIs, risky sinks, context flows, capabilities, and trust boundaries.'],
  ['03', 'Controls', 'Check visible auth, rate limits, approvals, audit logs, allowlists, masking, and isolation.'],
  ['04', 'Decision', 'Apply policy gates using score, required controls, hard blockers, and evidence.'],
  ['05', 'Remedy', 'Convert findings into a fix-first sequence with validation steps.'],
];

const surfaces = [
  ['Dependencies', 'Unpinned packages, missing lockfiles, direct-source specs.', 'missing lockfile'],
  ['API Surface', 'Routes, visible auth, rate limits, CORS, uploads, costly endpoints.', 'missing rate limit'],
  ['AppSec Sinks', 'Path traversal, SSRF, command sinks, SQL patterns, unsafe extraction.', 'static sink evidence'],
  ['Capabilities', 'Actions the app can perform across tools, files, APIs, memory, and services.', 'external effect'],
  ['Guardrails', 'Approval, audit, auth, masking, sandboxing, allowlists, and isolation.', 'weak approval'],
  ['Policy & Remedy', 'Release decision, hard blockers, required controls, and ordered fixes.', 'BLOCK / REVIEW / ALLOW'],
];

const limitations = [
  ['Static review is not runtime proof', 'A-DAP-T reads source and configuration. It does not execute uploaded projects.'],
  ['Some controls may live outside the repo', 'Missing visible evidence means the scan did not find proof in the submitted project.'],
  ['Manual review still matters', 'Production-critical systems still need human security review beyond static signals.'],
];

export default function MethodologyPage() {
  const [openLimit, setOpenLimit] = useState(0);

  return (
    <main className="adapt-page methodology-workspace methodology-clean">
      <div className="adapt-container">
        <PageHeader label="Methodology" title="How A-DAP-T reviews AI application security">
          A-DAP-T performs a static, evidence-led review of project files to map release risk, weak controls, policy blockers, and fix-first actions before deployment.
        </PageHeader>

        <nav className="methodology-mini-nav" aria-label="Methodology sections">
          {['Pipeline', 'Surfaces', 'Decision logic', 'AI role', 'Limitations'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replaceAll(' ', '-')}`}>{item}</a>
          ))}
        </nav>

        <section id="pipeline" className="adapt-panel method-compact-section">
          <SectionTitle label="Review pipeline" title="From project files to release decision">
            Five steps. No project code execution.
          </SectionTitle>
          <div className="method-step-row">
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
          <SectionTitle label="Security surfaces" title="What the scanner actually reviews" />
          <div className="surface-method-table compact">
            {surfaces.map(([title, body, signal]) => (
              <div key={title}>
                <strong>{title}</strong>
                <p>{body}</p>
                <AdaptBadge tone="neutral">{signal}</AdaptBadge>
              </div>
            ))}
          </div>
        </section>

        <section id="decision-logic" className="methodology-decision-card">
          <div className="adapt-panel">
            <SectionTitle label="Scoring and policy" title="Score is not the whole decision" />
            <p>A-DAP-T produces a security score, but the release decision also depends on required controls and hard blockers.</p>
          </div>
          <div className="adapt-panel decision-chain-panel">
            <span>Score check</span>
            <span>Required controls</span>
            <span>Hard blockers</span>
            <strong>Final decision</strong>
          </div>
        </section>

        <section id="ai-role" className="methodology-two-col compact-two-col">
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
              <li>Does not replace manual review</li>
              <li>Does not decide release verdicts alone</li>
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
          <div><AdaptButton tone="primary" href="/scanner">Start Scan</AdaptButton><AdaptButton tone="secondary" href="/report/current">View Sample Report</AdaptButton></div>
        </section>
      </div>
    </main>
  );
}
