import Link from 'next/link';
import { BrandWord } from '@/components/ui/BrandWord';

const features = [
  {
    label: '01_MAP',
    title: 'APIs risky paths',
    body: 'Build a project inventory across code, dependencies, APIs, AppSec sinks, memory/context risk, and agent capabilities.'
  },
  {
    label: '02_CONTROL',
    title: 'Check guardrail coverage',
    body: 'Fix cards include diffs, risk reduction, effort, and validation steps. Developers stay in control.'
  },
  {
    label: '03_REMEDY',
    title: 'Build the remedy plan',
    body: 'Prioritize fixes by policy blockers, weak controls, risky capabilities, and expected release impact.'
  }
];

function MiniRisk({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="mock-risk">
      <span>{label}</span>
      <div className="risk-bar"><div className="risk-fill" style={{ width: `${value}%`, background: tone }} /></div>
      <strong>{value}</strong>
    </div>
  );
}

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <video className="hero-video" autoPlay muted loop playsInline preload="auto" poster="/gradient.png" aria-hidden="true">
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="tech-label"><span className="pulse-dot" /> AI APP SECURITY REVIEW</div>
            <h1 className="display-title">Review AI apps<br />before they <em>ship.</em></h1>
            <p>
              <BrandWord /> checks code, dependencies, APIs, agent capabilities, memory risks, guardrails, and release policy — then builds a remedy plan before deployment.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/scanner">Start Scanning</Link>
              <Link className="btn btn-secondary" href="/methodology">View Methodology</Link>
            </div>
            <div className="hero-meta">
              <span className="meta-item">V3 security score</span>
              <span className="meta-item">Policy packs</span>
              <span className="meta-item">No project execution</span>
            </div>
          </div>

          <div className="glass-card shimmer mockup">
            <div className="mock-window">
              <div className="window-dots"><span className="dot-red" /><span className="dot-yellow" /><span className="dot-green" /></div>
              <div className="tech-label">V3 REPORT OUTPUT</div>
              <div className="mock-dashboard">
                <div className="mock-main">
                  <div>
                    <div className="mock-score">32</div>
                    <p className="mock-score-caption">V3 security score</p>
                  </div>
                  <div>
                    <strong>Vulnerable support agent</strong>
                    <p className="faint" style={{ margin: '4px 0 0' }}>Dependencies · APIs · AppSec · guardrails</p>
                  </div>
                  <span className="mock-badge block">Blocked</span>
                </div>

                <div className="mock-metrics">
                  <div className="mock-metric"><span className="panel-label">APIs</span><strong>8</strong><span className="faint">paths</span></div>
                  <div className="mock-metric"><span className="panel-label">Fix</span><strong>8</strong><span className="faint">fixes</span></div>
                  <div className="mock-metric"><span className="panel-label">Policy</span><strong>BLOCK</strong><span className="faint">CI</span></div>
                </div>

                <div className="mock-risk-list">
                  <MiniRisk label="Dependency risk" value={65} tone="linear-gradient(90deg, #10b981, #f59e0b)" />
                  <MiniRisk label="API exposure" value={45} tone="linear-gradient(90deg, #10b981, #f59e0b)" />
                  <MiniRisk label="Guardrail gaps" value={65} tone="linear-gradient(90deg, #10b981, #f59e0b)" />
                </div>
                <div className="hero-terminal">
                  <div><span>&gt; adapt scan support-agent</span><strong>completed</strong></div>
                  <div><span>&gt; map capabilities</span><strong>8 paths</strong></div>
                  <div><span>&gt; build remedy plan</span><strong>8 previews</strong></div>
                  <div><span>&gt; policy evaluate</span><strong className="terminal-danger">blocked</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container" style={{ padding: '66px 22px' }}>
        <div className="page-head centered">
          <div>
            <div className="tech-label"><span className="pulse-dot" /> PRODUCT LOOP</div>
            <h2 className="section-title" style={{ marginTop: 14 }}>Scan. APIs. Fix. Policy.</h2>
          </div>
          <p className="page-desc"><BrandWord /> v3 moves from an agent-only scanner into a security review workflow for AI-powered projects.</p>
        </div>
        <div className="grid grid-3">
          {features.map((feature) => (
            <article className="glass-card panel shimmer" key={feature.label}>
              <div className="panel-label">{feature.label}</div>
              <h3 className="panel-title">{feature.title}</h3>
              <p className="muted">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container" style={{ padding: '22px 22px 82px' }}>
        <div className="glass-card panel centered" style={{ padding: '40px 22px' }}>
          <div className="tech-label"><span className="pulse-dot" /> READY FOR V3</div>
          <h2 className="section-title" style={{ margin: '14px auto 18px', maxWidth: 820 }}>A security assessment workspace for AI applications that can act.</h2>
          <p className="page-desc" style={{ margin: '0 auto 26px' }}>Run the vulnerable demo, inspect APIs Mode, review patch previews, and copy the generated CI gate workflow.</p>
          <Link className="btn btn-primary" href="/scanner">Run V3 Demo Scan</Link>
        </div>
      </section>
    </main>
  );
}
