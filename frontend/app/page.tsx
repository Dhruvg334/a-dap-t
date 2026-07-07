'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

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
          <h1>Review AI Apps Before Production</h1>
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

      <motion.section 
        className="landing-section alt" 
        id="preview"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <SectionHeader label="Comprehensive Report" title="Deep AI Security Profiling" center>
          See exactly how A-DAP-T breaks down a project's risk profile, capabilities, and necessary guardrails before deployment.
        </SectionHeader>
        
        <div style={{ maxWidth: '1100px', margin: '40px auto 0', border: '1px solid var(--adapt-border)', borderRadius: '16px', background: 'var(--adapt-surface)', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--adapt-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'rgba(255,255,255,0.02)' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--adapt-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Project Analysis</span>
              <h3 style={{ margin: '4px 0 0', fontSize: '20px', fontFamily: 'Chivo, sans-serif' }}>DHRUVG334/CLOSIRA-SMB-SUPPORT-AGENT</h3>
            </div>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10px', color: 'var(--adapt-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Security Score</span>
                <strong style={{ display: 'block', fontSize: '36px', color: 'var(--adapt-accent)', lineHeight: 1 }}>84<small style={{ fontSize: '16px', color: 'var(--adapt-faint)' }}>/100</small></strong>
              </div>
              <div style={{ padding: '12px 24px', background: 'var(--adapt-accent)', border: '1px solid var(--adapt-accent)', borderRadius: '8px', color: '#000000', fontWeight: 'bold', letterSpacing: '0.1em' }}>ALLOW</div>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1px', background: 'var(--adapt-border)' }}>
            <div style={{ padding: '24px', background: 'var(--adapt-surface)' }}>
              <h4 style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--adapt-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Key Capabilities</h4>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: 'var(--adapt-accent)' }}>✓</span> Customer Profile Write</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: 'var(--adapt-accent)' }}>✓</span> Database Query</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: 'var(--adapt-warning)' }}>⚠</span> External API Request</li>
              </ul>
            </div>
            <div style={{ padding: '24px', background: 'var(--adapt-surface)' }}>
              <h4 style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--adapt-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Active Guardrails</h4>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: 'var(--adapt-accent)' }}>✓</span> Human Approval Gate</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: 'var(--adapt-accent)' }}>✓</span> PII Masking</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: 'var(--adapt-danger)' }}>✕</span> Rate Limiting</li>
              </ul>
            </div>
            <div style={{ padding: '24px', background: 'var(--adapt-surface)' }}>
              <h4 style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--adapt-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Remediation Queue</h4>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'var(--adapt-muted)' }}>
                <li style={{ paddingBottom: '8px', borderBottom: '1px solid var(--adapt-border)' }}>Implement rate limiting on tool: 'send_email'</li>
                <li style={{ paddingBottom: '8px', borderBottom: '1px solid var(--adapt-border)' }}>Add explicit boundary context separation</li>
                <li>Audit logging for external API calls</li>
              </ul>
            </div>
          </div>
          <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', textAlign: 'center', borderTop: '1px solid var(--adapt-border)' }}>
            <Link href="/report/current" style={{ color: 'var(--adapt-accent)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none' }}>View Full Example Report →</Link>
          </div>
        </div>
      </motion.section>

      <motion.section 
        className="landing-section" 
        id="loop"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <SectionHeader label="Pipeline analysis" title="Scan — Map — Guardrail — Remedy — Release" center>
          A-DAP-T turns raw project code into structured release intelligence.
        </SectionHeader>
        <div className="loop-track" aria-label="A-DAP-T review loop">
          <div className="loop-line" aria-hidden="true" />
          {loopSteps.map(([num, title, copy], index) => (
            <motion.article 
              className={`loop-node ${index === loopSteps.length - 1 ? 'active' : ''}`} 
              key={title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
            >
              <div>{num}</div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </motion.article>
          ))}
        </div>
      </motion.section>



      <motion.section 
        className="landing-section" 
        id="surfaces"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
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
          <motion.article 
            className="surface-panel" 
            role="tabpanel"
            key={activeSurface}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
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
          </motion.article>
        </div>
      </motion.section>

      <motion.section 
        className="landing-cta"
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2>Check The Release Surface Before You Ship.</h2>
        <p>Run a scan, inspect weak guardrails, review policy blockers, and follow the remedy plan before deployment.</p>
        <div className="landing-actions center">
          <Link href="/scanner" className="landing-button primary">Start Scan</Link>
          <Link href="/methodology" className="landing-button secondary">Read Methodology</Link>
        </div>
      </motion.section>
    </main>
  );
}
