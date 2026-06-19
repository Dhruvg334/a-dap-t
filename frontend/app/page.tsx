import Link from 'next/link';

const features = [
  {
    label: '01_PROVE',
    title: 'Static attack paths',
    body: 'A-DAP-T does not stop at “risky tool found.” It shows how the path could be abused, what preconditions exist, and which guardrail blocks it.'
  },
  {
    label: '02_PATCH',
    title: 'Developer-ready fixes',
    body: 'Generated patch previews include diffs, risk reduction, review notes, and validation steps. Nothing is auto-applied without developer control.'
  },
  {
    label: '03_GATE',
    title: 'Deployment safety gate',
    body: 'Reports produce BLOCK, REVIEW, or ALLOW decisions with GitHub Actions workflow and policy JSON output for CI/CD enforcement.'
  }
];

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <video className="hero-video" autoPlay muted loop playsInline poster="/gradient.png">
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="tech-label"><span className="pulse-dot" /> 01_AGENT SAFETY GATE</div>
            <h1 className="display-title">Scan your AI agent<br />before it <em>ships.</em></h1>
            <p>
              A-DAP-T checks agent code, tools, secrets, approval gates, and audit trails — then proves risky paths, generates patch previews, and blocks unsafe deployments before release.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/scanner">Start scanning →</Link>
              <Link className="btn btn-secondary" href="/methodology">View methodology</Link>
            </div>
            <div className="hero-meta">
              <span className="meta-item">Rule-based verdict</span>
              <span className="meta-item">Gemini explains only</span>
              <span className="meta-item">No code execution</span>
            </div>
          </div>

          <div className="glass-card shimmer mockup">
            <div className="mock-window">
              <div className="window-dots"><span /><span /><span /></div>
              <div className="tech-label">LIVE SCAN OUTPUT</div>
              <div className="mock-row">
                <div>
                  <div className="mock-score">32</div>
                  <p className="muted">Vulnerable support agent</p>
                </div>
                <span className="mock-badge block">Blocked</span>
              </div>
              <div className="mock-row">
                <div>
                  <strong>Prove Mode</strong>
                  <p className="faint">8 static attack paths generated</p>
                </div>
                <span className="mock-badge safe">Ready</span>
              </div>
              <div className="mock-row">
                <div>
                  <strong>Generated fixes</strong>
                  <p className="faint">8 patch previews with validation steps</p>
                </div>
                <span className="mock-badge safe">Patch</span>
              </div>
              <pre className="code-block" style={{ marginTop: 14 }}>{`> adapt gate --min-score 75\nstatus: BLOCK\nreason: critical findings present`}</pre>
            </div>
          </div>
        </div>
      </section>

      <section className="container" style={{ padding: '70px 22px' }}>
        <div className="page-head">
          <div>
            <div className="tech-label"><span className="pulse-dot" /> PRODUCT LOOP</div>
            <h2 className="section-title">Scan. Prove. Patch. Re-scan. Gate.</h2>
          </div>
          <p className="page-desc">This version moves A-DAP-T from a risk report into a deployment safety workflow for AI agents.</p>
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

      <section className="container" style={{ padding: '32px 22px 82px' }}>
        <div className="glass-card panel" style={{ textAlign: 'center', padding: '44px 22px' }}>
          <div className="tech-label"><span className="pulse-dot" /> READY FOR V2</div>
          <h2 className="section-title" style={{ margin: '14px auto 18px', maxWidth: 860 }}>A deployment gate built for agents that can act.</h2>
          <p className="page-desc" style={{ margin: '0 auto 28px' }}>Run the vulnerable demo, inspect Prove Mode, review patch previews, and copy the generated CI gate workflow.</p>
          <Link className="btn btn-primary" href="/scanner">Run the demo scan</Link>
        </div>
      </section>
    </main>
  );
}
