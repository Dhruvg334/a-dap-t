'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

const loopSteps = [
  ['01', 'Scan', 'Parse project files, dependencies, APIs, and security sinks.'],
  ['02', 'Map', 'Identify capabilities, data access, and trust boundaries.'],
  ['03', 'Guardrail', 'Measure auth, logs, rate limits, approvals, and masking.'],
  ['04', 'Remedy', 'Prioritize fixes by release impact and risk.'],
  ['05', 'Release', 'Decide BLOCK, REVIEW, or ALLOW with evidence.'],
];

const proofCards = [
  {
    tone: 'danger',
    eyebrow: 'Critical Risk | Policy: BLOCK',
    title: 'Vulnerable Support Agent',
    score: 15,
    rows: [
      ['Unapproved tool actions', 'Sensitive internal actions can run without secondary approval evidence.'],
      ['Memory poisoning exposure', 'Retrieved context can influence downstream tool choice.'],
      ['Unsafe file handling', 'Upload and archive paths need stronger validation boundaries.'],
    ],
  },
  {
    tone: 'safe',
    eyebrow: 'Low Risk | Policy: REVIEW',
    title: 'Secured Support Agent',
    score: 84,
    rows: [
      ['Approval-gated actions', 'High-impact tool calls require reviewer and approval state.'],
      ['Audited control path', 'External-effect actions leave actor, action, target, and result evidence.'],
      ['Bounded context flow', 'Memory and source metadata are isolated before tool execution.'],
    ],
  },
];

const surfaces = [
  {
    key: 'Dependencies',
    title: 'Dependency intelligence',
    copy: 'Goes beyond package-alert lists by checking lockfile presence, unpinned specs, direct-source dependencies, and supply-chain hygiene in the project structure.',
    signals: ['Lockfile posture', 'Version discipline', 'Direct source drift'],
    differentiator: 'Complements GitHub-style dependency alerts with release-readiness context and policy impact.',
  },
  {
    key: 'API Surface',
    title: 'API release surface',
    copy: 'Maps routes and checks visible auth, rate limits, CORS posture, uploads, and costly AI endpoints instead of treating APIs as isolated paths.',
    signals: ['Auth visibility', 'Rate-limit coverage', 'Upload boundaries'],
    differentiator: 'Connects endpoint exposure to AI cost, file handling, and release gating.',
  },
  {
    key: 'AppSec',
    title: 'Static AppSec signals',
    copy: 'Looks for risky sinks such as path traversal, SSRF, command execution, SQL patterns, and unsafe extraction with file-level evidence.',
    signals: ['SSRF patterns', 'Command sinks', 'Unsafe extraction'],
    differentiator: 'Keeps findings tied to proof and remedy instead of dumping generic scanner noise.',
  },
  {
    key: 'Capabilities',
    title: 'Agent capability map',
    copy: 'Maps what the app can actually do through tools, memory, files, APIs, databases, and external services.',
    signals: ['External effect', 'Sensitive data', 'Tool action'],
    differentiator: 'Most scanners see code; A-DAP-T connects code paths to agent actions.',
  },
  {
    key: 'Guardrails',
    title: 'Guardrail matrix',
    copy: 'Measures whether detected capabilities are protected by approvals, audit logs, allowlists, masking, rate limits, and isolation.',
    signals: ['Approval gates', 'Audit trails', 'Context isolation'],
    differentiator: 'Turns scattered controls into a readable matrix of what protects release-critical behavior.',
  },
  {
    key: 'Policy & Remedy',
    title: 'Policy and fix sequence',
    copy: 'Evaluates BLOCK, REVIEW, or ALLOW using score, hard blockers, required controls, and a prioritized remedy queue.',
    signals: ['Release decision', 'Hard blockers', 'Fix-first steps'],
    differentiator: 'Bridges scanner output with what a team must fix before shipping.',
  },
];

function SectionHeader({ label, title, children, center = false }: { label: string; title: string; children: string; center?: boolean }) {
  return (
    <div className={`landing-section-head ${center ? 'center' : ''}`}>
      <span>{label}</span>
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}

export default function HomePage() {
  const [activeSurface, setActiveSurface] = useState(surfaces[0].key);
  const selectedSurface = useMemo(() => surfaces.find((item) => item.key === activeSurface) ?? surfaces[0], [activeSurface]);

  return (
    <main className="landing-shell">
      <header className="landing-hero" id="overview">
        <video className="landing-video" autoPlay muted loop playsInline aria-hidden="true">
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        <div className="landing-video-overlay" />
        <div className="landing-hero-content">
          <span className="landing-hero-kicker">Pre-deployment AI application review</span>
          <h1>Review AI Apps Before They Reach Production</h1>
          <p>
            A-DAP-T scans code, dependencies, APIs, agent capabilities, memory risks, guardrails, and release policy to show what can break before deployment.
          </p>
          <div className="landing-actions">
            <Link href="/scanner" className="landing-button primary">Run Scan</Link>
            <Link href="/methodology" className="landing-button secondary">View Methodology</Link>
          </div>
          <div className="landing-proof-strip" aria-label="A-DAP-T product signals">
            <div><span>Policy Gates</span><strong>Active review</strong></div>
            <div><span>Scan Mode</span><strong>Static evidence</strong></div>
            <div><span>Release Output</span><strong>BLOCK / REVIEW / ALLOW</strong></div>
          </div>
        </div>
      </header>

      <section className="landing-section" id="loop">
        <SectionHeader label="Pipeline analysis" title="Scan — Map — Guardrail — Remedy — Release" center>
          A-DAP-T turns raw project code into structured release intelligence.
        </SectionHeader>
        <div className="loop-track" aria-label="A-DAP-T review loop">
          <div className="loop-line" aria-hidden="true" />
          {loopSteps.map(([num, title, copy], index) => (
            <article className={`loop-node ${index === loopSteps.length - 1 ? 'active' : ''}`} key={title}>
              <div>{num}</div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section alt" id="proof">
        <SectionHeader label="Impact analysis" title="Same App. Different Surface.">
          Compare the release posture before and after remediation controls are visible in the project.
        </SectionHeader>
        <div className="proof-grid">
          {proofCards.map((card) => (
            <article key={card.title} className={`proof-card ${card.tone}`}>
              <div className="proof-card-head">
                <div>
                  <span className="proof-eyebrow">{card.eyebrow}</span>
                  <h3>{card.title}</h3>
                </div>
                <div className="proof-score"><strong>{card.score}</strong><span>Security Score</span></div>
              </div>
              <div className="proof-list">
                {card.rows.map(([title, copy]) => (
                  <div key={title}>
                    <strong>{title}</strong>
                    <p>{copy}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="surfaces">
        <SectionHeader label="Security surfaces" title="What A-DAP-T Reviews">
          Analyze application surfaces across dependencies, APIs, AppSec patterns, capabilities, guardrails, and policy.
        </SectionHeader>
        <div className="surface-tabs">
          <div className="surface-tab-list" role="tablist" aria-label="Security surfaces">
            {surfaces.map((surface) => (
              <button
                type="button"
                key={surface.key}
                role="tab"
                aria-selected={surface.key === activeSurface}
                className={surface.key === activeSurface ? 'active' : ''}
                onClick={() => setActiveSurface(surface.key)}
              >
                {surface.key}
              </button>
            ))}
          </div>
          <article className="surface-panel" role="tabpanel">
            <div className="surface-panel-head">
              <span>Selected surface</span>
              <h3>{selectedSurface.title}</h3>
              <p>{selectedSurface.copy}</p>
            </div>
            <div className="surface-signals">
              {selectedSurface.signals.map((signal) => <span key={signal}>{signal}</span>)}
            </div>
            <div className="surface-preview">
              <span>why this matters</span>
              <strong>{selectedSurface.differentiator}</strong>
            </div>
          </article>
        </div>
      </section>

      <section className="landing-cta">
        <h2>Check The Release Surface Before You Ship.</h2>
        <p>Run a scan, inspect weak guardrails, review policy blockers, and follow the remedy plan before deployment.</p>
        <div className="landing-actions center">
          <Link href="/scanner" className="landing-button primary">Start Scan</Link>
          <Link href="/methodology" className="landing-button secondary">Read Methodology</Link>
        </div>
      </section>
    </main>
  );
}
