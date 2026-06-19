import { BrandWord } from '@/components/ui/BrandWord';

const people = [
  {
    name: 'Dhruv Gupta',
    role: 'Product direction · backend integration · AI safety workflow',
    body: 'Led A-DAP-T’s product direction, V2 backend upgrades, report artifacts, DAP behavior, deployment gate flow, and final integration quality.'
  },
  {
    name: 'Pavit Agrawal',
    role: 'Score delta · report comparison · project engineering',
    body: 'Owns the report comparison and re-scan improvement flow so users can measure how safety changes after fixes.'
  },
  {
    name: 'Akshhaya Isa',
    role: 'Frontend development · UI implementation support',
    body: 'Supports the frontend migration and page implementation work for the upgraded A-DAP-T experience.'
  }
];

export default function AboutPage() {
  return (
    <main className="page-shell">
      <div className="container">
        <div className="page-head centered">
          <div>
            <div className="tech-label page-kicker"><span className="pulse-dot" /> ABOUT</div>
            <h1 className="page-title">Built for agents that can act.</h1>
          </div>
          <p className="page-desc"><BrandWord /> started as an AI-agent risk scanner and is now moving toward a deployment safety gate: scan, prove, patch, re-scan, and gate unsafe releases before they ship.</p>
        </div>

        <section className="grid grid-3" style={{ marginBottom: 18 }}>
          <article className="glass-card panel shimmer">
            <div className="panel-label">Mission</div>
            <h2 className="panel-title">Make agent risk visible.</h2>
            <p className="muted">AI agents now call tools, touch records, and trigger workflow actions. <BrandWord /> helps teams see risky paths before deployment.</p>
          </article>
          <article className="glass-card panel">
            <div className="panel-label">Approach</div>
            <h2 className="panel-title">Deterministic first.</h2>
            <p className="muted">The scanner owns findings, scoring, patches, and gate decisions. AI only explains the report and helps users understand what to fix.</p>
          </article>
          <article className="glass-card panel">
            <div className="panel-label">Demo slot</div>
            <h2 className="panel-title">Video panel coming next.</h2>
            <p className="muted">This page is ready for a future embedded YouTube demo panel once the final walkthrough video is ready.</p>
          </article>
        </section>

        <section className="glass-card panel" style={{ marginBottom: 18 }}>
          <div className="panel-head">
            <div>
              <div className="panel-label">Developer introductions</div>
              <h2 className="panel-title">Team behind the build.</h2>
            </div>
            <span className="pill neutral"><BrandWord /> V2</span>
          </div>
          <div className="grid grid-3">
            {people.map((person) => (
              <article className="solid-card panel" key={person.name}>
                <div className="profile-avatar" style={{ marginBottom: 14 }}>{person.name.split(' ').map((part) => part[0]).join('')}</div>
                <h3 className="panel-title">{person.name}</h3>
                <p className="faint" style={{ margin: '8px 0 12px' }}>{person.role}</p>
                <p className="muted">{person.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="glass-card panel centered" style={{ padding: '36px 22px' }}>
          <div className="tech-label"><span className="pulse-dot" /> PRODUCT LOOP</div>
          <h2 className="section-title" style={{ margin: '14px auto 16px' }}>Scan. Prove. Patch. Gate.</h2>
          <p className="page-desc" style={{ margin: '0 auto' }}>The goal is not to replace security audits. The goal is to catch common AI-agent deployment risks earlier and make the first review sharper.</p>
        </section>
      </div>
    </main>
  );
}
