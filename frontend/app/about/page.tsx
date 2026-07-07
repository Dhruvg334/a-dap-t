import { AdaptButton, PageHeader, SectionTitle } from '@/components/ui/AdaptUI';

export default function AboutPage() {
  return (
    <main className="adapt-page about-workspace about-refined">
      <div className="adapt-container">
        <PageHeader label="About A-DAP-T" title="Built for AI apps that can act">
          Modern AI apps combine prompts, tools, APIs, databases, memory, and workflows. 
          A-DAP-T exists to review that release surface before deployment.
        </PageHeader>

        <section className="adapt-panel about-section evolution-section">
          <SectionTitle label="Version History" title="Product evolution & Team" />
          <div className="evolution-grid" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <article style={{ borderBottom: '1px solid var(--adapt-border)', paddingBottom: '24px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '20px' }}>Version 1.0</h3>
              <ul style={{ margin: '0 0 8px', paddingLeft: '20px', color: 'var(--adapt-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li><strong>Dhruv</strong> — Backend Attack Lab, Agents, Integration and Deployment</li>
                <li><strong>Pavit</strong> — Backend Scanner and Scoring</li>
                <li><strong>Akshhaya</strong> — Frontend UI & UX</li>
              </ul>
              <p style={{ margin: 0, marginTop: '12px' }}>Started as a focused scanner for risky AI-agent behavior.</p>
            </article>
            <article style={{ borderBottom: '1px solid var(--adapt-border)', paddingBottom: '24px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '20px' }}>Version 2.0</h3>
              <ul style={{ margin: '0 0 8px', paddingLeft: '20px', color: 'var(--adapt-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li><strong>Dhruv</strong> — Frontend UI & UX, Agents, Patch and Attack Agents, Integration and Deployment</li>
                <li><strong>Pavit</strong> — Backend Compare Feature and DAP Assistant</li>
              </ul>
              <p style={{ margin: 0, marginTop: '12px' }}>Added saved reports, comparison, deployment gates, and report-aware DAP review.</p>
            </article>
            <article>
              <h3 style={{ margin: '0 0 12px', fontSize: '20px' }}>Version 3.0 (Current)</h3>
              <ul style={{ margin: '0 0 8px', paddingLeft: '20px', color: 'var(--adapt-muted)' }}>
                <li><strong>Dhruv</strong> — Entire Product Stack upgrades over V2 including Frontend, Backend and AI Layer</li>
              </ul>
              <p style={{ margin: 0, marginTop: '12px' }}>Expanded into code, dependencies, APIs, AppSec risks, capabilities, guardrails, and remedy planning.</p>
            </article>
          </div>
        </section>

        <section className="about-journey-panel refined">
          <div>
            <SectionTitle label="Try it" title="What you can review" />
            <p style={{ margin: '8px 0 16px', color: 'var(--adapt-muted)' }}>Run a demo to see how A-DAP-T secures AI applications.</p>
          </div>
          <AdaptButton tone="primary" href="/scanner">Start Scan</AdaptButton>
        </section>
      </div>
    </main>
  );
}
