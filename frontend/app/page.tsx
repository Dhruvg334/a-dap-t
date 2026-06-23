import Link from 'next/link';

const loopSteps = [
  {
    label: 'Scan',
    body: 'Parse project files, dependency manifests, API routes, AppSec sinks, and agent logic.'
  },
  {
    label: 'Map',
    body: 'Build a capability and trust-boundary view of what the AI application can actually do.'
  },
  {
    label: 'Evaluate',
    body: 'Measure guardrail coverage against policy packs built for different AI app types.'
  },
  {
    label: 'Remedy',
    body: 'Prioritize fixes by release impact instead of throwing a flat list of findings at developers.'
  },
  {
    label: 'Release',
    body: 'Gate deployment only when the evidence, score, policy result, and validation steps line up.'
  }
];

const surfaces = [
  ['Dependency Risk', 'Find unpinned packages, lockfile gaps, direct-source dependencies, and supply-chain drift.'],
  ['API Surface', 'Review endpoints, auth visibility, rate-limit coverage, CORS posture, and upload paths.'],
  ['AppSec Sinks', 'Trace risky file, shell, network, database, serialization, and HTML output patterns.'],
  ['Agent Capabilities', 'Map tools, write actions, external effects, execution privileges, and sensitive data access.'],
  ['Trust Boundaries', 'Separate user input, retrieved context, model output, tools, approvals, and services.'],
  ['Guardrail Matrix', 'Calculate coverage for auth, approval, audit, allowlists, masking, and execution safety.'],
  ['Context Poisoning', 'Flag memory, RAG, and retrieved-context flows that can influence tool choice.'],
  ['Policy Packs', 'Evaluate apps against release policies for agents, coding tools, support bots, and SaaS APIs.'],
  ['Remedy Plan', 'Convert findings into an ordered fix sequence with expected gate impact and validation steps.']
];

const policies = [
  'General AI App',
  'Agent with Tools',
  'AI Coding Agent',
  'Customer Support Agent',
  'Data-Sensitive App',
  'Public SaaS API'
];

const remedies = [
  {
    title: 'Add human approval for external tool actions.',
    severity: 'Critical',
    impact: 'BLOCK → REVIEW',
    validation: 'Approval trace'
  },
  {
    title: 'Add rate limits to costly AI endpoints.',
    severity: 'High',
    impact: 'Abuse reduced',
    validation: 'Limit test'
  },
  {
    title: 'Isolate retrieved memory before tool execution.',
    severity: 'High',
    impact: 'Poisoning contained',
    validation: 'Boundary test'
  },
  {
    title: 'Pin risky dependencies and add lockfiles.',
    severity: 'Medium',
    impact: 'Supply-chain stable',
    validation: 'Lockfile diff'
  }
];

function HeroSignal() {
  return (
    <div className="editorial-signal" aria-hidden="true">
      <div className="signal-ring">
        <span>PRE DEPLOYMENT REVIEW • STATIC EVIDENCE • POLICY GATE • </span>
      </div>
      <div className="signal-core">
        <span className="signal-core-kicker">V3</span>
        <strong>ADAPT</strong>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="editorial-home">
      <section className="editorial-hero" aria-labelledby="home-hero-title">
        <div className="editorial-container hero-layout">
          <div className="hero-copy-block">
            <p className="editorial-kicker"><span /> Pre-deployment AI application review</p>
            <h1 id="home-hero-title" className="editorial-title">
              Review AI Apps Before They Reach Production
            </h1>
            <p className="editorial-lede">
              A-DAP-T scans code, dependencies, APIs, agent capabilities, memory risks, guardrails, and release policy to show what can break before deployment.
            </p>
            <div className="editorial-actions" aria-label="Landing page actions">
              <Link className="editorial-btn primary" href="/scanner">Run Demo Scan</Link>
              <Link className="editorial-btn secondary" href="/methodology">Read Methodology</Link>
            </div>
          </div>
          <HeroSignal />
        </div>
        <div className="editorial-container hero-bottom-strip" aria-label="A-DAP-T release review signals">
          <span>V3 Security Score</span>
          <strong>Policy-aware</strong>
          <span>Guardrail Matrix</span>
          <strong>Evidence-led</strong>
          <span>Remedy Plan</span>
          <strong>No code execution</strong>
        </div>
      </section>

      <section className="loop-section" aria-labelledby="loop-title">
        <div className="editorial-container">
          <div className="loop-grid">
            <h2 id="loop-title" className="section-heading compact">Scan — Map — Guardrail — Remedy — Release</h2>
            <div className="loop-card-grid">
              {loopSteps.map((step, index) => (
                <article className="loop-card" key={step.label}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <h3>{step.label}</h3>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="editorial-section" aria-labelledby="problem-title">
        <div className="editorial-container problem-grid">
          <h2 id="problem-title" className="section-heading large">Traditional scanners see files. A-DAP-T reads the release surface.</h2>
          <div className="problem-copy">
            <p>
              AI apps combine prompts, tools, APIs, memory, data flows, dependencies, and human approval logic. A-DAP-T turns those scattered signals into a release-readiness review.
            </p>
            <div className="problem-list" aria-label="Signals reviewed by A-DAP-T">
              <span>Code</span>
              <span>Tools</span>
              <span>Memory</span>
              <span>Policy</span>
              <span>Evidence</span>
            </div>
          </div>
        </div>
      </section>

      <section className="surfaces-section" aria-labelledby="surfaces-title">
        <div className="editorial-container surfaces-layout">
          <div>
            <p className="editorial-kicker"><span /> Coverage</p>
            <h2 id="surfaces-title" className="section-heading">Security surfaces covered</h2>
          </div>
          <div className="surface-grid">
            {surfaces.map(([title, body]) => (
              <article className="surface-card" key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="demo-section" aria-labelledby="demo-title">
        <div className="editorial-container">
          <div className="section-intro">
            <p className="editorial-kicker"><span /> Demo comparison</p>
            <h2 id="demo-title" className="section-heading">Same app idea. Different release surface.</h2>
          </div>
          <div className="demo-comparison-grid">
            <article className="demo-card vulnerable">
              <div className="demo-card-head">
                <span>Vulnerable demo</span>
                <strong>BLOCK</strong>
              </div>
              <h3>Vulnerable Support Agent</h3>
              <dl className="demo-stats">
                <div><dt>V3 score</dt><dd>15</dd></div>
                <div><dt>Status</dt><dd>Critical Risk</dd></div>
                <div><dt>Main risks</dt><dd>Unapproved tools, weak API controls, memory poisoning, unsafe file handling</dd></div>
              </dl>
            </article>
            <article className="demo-card secured">
              <div className="demo-card-head">
                <span>Secured demo</span>
                <strong>REVIEW</strong>
              </div>
              <h3>Secured Support Agent</h3>
              <dl className="demo-stats">
                <div><dt>V3 score</dt><dd>84</dd></div>
                <div><dt>Status</dt><dd>Low Risk</dd></div>
                <div><dt>Controls</dt><dd>Auth, rate limits, approval gates, audit logs, source metadata, allowlists</dd></div>
              </dl>
            </article>
          </div>
        </div>
      </section>

      <section className="policy-section" aria-labelledby="policy-title">
        <div className="editorial-container policy-layout">
          <h2 id="policy-title" className="section-heading large">One release policy does not fit every AI app.</h2>
          <div className="policy-list">
            {policies.map((policy, index) => (
              <div className="policy-row" key={policy}>
                <span>{policy}</span>
                <em>Pack {String(index + 1).padStart(2, '0')}</em>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="remedy-section" aria-labelledby="remedy-title">
        <div className="editorial-container remedy-layout">
          <div>
            <p className="editorial-kicker"><span /> Remedy plan</p>
            <h2 id="remedy-title" className="section-heading">From findings to fix sequence.</h2>
          </div>
          <ol className="remedy-list">
            {remedies.map((remedy, index) => (
              <li className="remedy-item" key={remedy.title}>
                <span className="remedy-number">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{remedy.title}</h3>
                  <div className="remedy-meta">
                    <span>Severity: {remedy.severity}</span>
                    <span>Gate impact: {remedy.impact}</span>
                    <span>Validation: {remedy.validation}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="final-editorial-cta" aria-labelledby="final-cta-title">
        <div className="editorial-container final-cta-grid">
          <h2 id="final-cta-title" className="section-heading large">Run the vulnerable demo. Then run the secured demo.</h2>
          <div className="final-cta-actions">
            <Link className="editorial-btn primary" href="/scanner">Start Scan</Link>
            <Link className="editorial-btn secondary" href="/methodology">Read Methodology</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
