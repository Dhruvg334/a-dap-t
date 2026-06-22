'use client';

import { BrandWord } from '@/components/ui/BrandWord';
import { PlayCircle, ShieldCheck } from 'lucide-react';

const people = [
  ['Dhruv Gupta', 'Product direction · backend architecture · frontend integration · security workflow', 'Leading the v3 shift from an AI-agent scanner to a broader AI application security assessment platform.'],
  ['Pavit Agrawal', 'Backend modules · comparison logic · scanner support', 'Supports scanner modules, release-diff direction, and backend feature work with clear contracts.'],
  ['Akshhaya Isa', 'Frontend implementation · UI polish support', 'Supports frontend page implementation, responsive UI, and section-level product polish.'],
];

const principles = [
  ['Evidence over claims', 'A-DAP-T reports static evidence, file paths, line numbers, control gaps, and recommended actions instead of claiming runtime certainty.'],
  ['AI is controlled', 'AI helps explain reports and guide review, while deterministic scanners own findings, scores, and policy decisions.'],
  ['Release workflow', 'The goal is not only to find issues; it is to help teams decide what to fix before shipping.'],
];

export default function AboutPage() {
  const videoId = '1r-QIjQmbbo';

  return (
    <main className="page-shell about-v3-page">
      <div className="container">
        <div className="page-head centered">
          <div>
            <div className="tech-label page-kicker"><span className="pulse-dot" /> ABOUT</div>
            <h1 className="page-title">Security review for AI apps that can act.</h1>
          </div>
          <p className="page-desc"><BrandWord /> started as an AI-agent deployment scanner. v3 expands it into a security assessment platform for AI-powered projects: code, APIs, dependencies, capabilities, memory/context risk, guardrails, policy, and remedy planning.</p>
        </div>

        <section className="glass-card panel shimmer" style={{ marginBottom: 28 }}>
          <div className="panel-head" style={{ marginBottom: 24 }}>
            <div><div className="panel-label">Platform guide</div><h2 className="panel-title">A-DAP-T walkthrough</h2></div>
            <div className="pill safe" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><PlayCircle size={12} /> VIDEO GUIDE</div>
          </div>
          <div className="video-frame-wrap">
            <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`} title="A-DAP-T Website Demo" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          </div>
          <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center' }}><div className="notice"><ShieldCheck size={16} /> <span>Current demo explains the v2 workflow; v3 expands the backend and report model.</span></div></div>
        </section>

        <section className="grid grid-3" style={{ marginBottom: 28 }}>
          {principles.map(([title, body]) => <article className="glass-card panel" key={title}><div className="panel-label">Principle</div><h2 className="panel-title">{title}</h2><p className="muted">{body}</p></article>)}
        </section>

        <section className="glass-card panel" style={{ marginBottom: 28 }}>
          <div className="panel-head"><div><div className="panel-label">What v3 changes</div><h2 className="panel-title">From scanner dashboard to release review system.</h2></div><span className="pill neutral">V3 direction</span></div>
          <div className="v3-about-grid">
            {['Dependency scanner', 'API surface scanner', 'AppSec sink scanner', 'Memory/context risk scanner', 'Capability map', 'Trust boundary map', 'Guardrail matrix', 'Policy packs', 'Remedy plan'].map((item) => <span className="pill neutral" key={item}>{item}</span>)}
          </div>
        </section>

        <section className="glass-card panel">
          <div className="panel-head"><div><div className="panel-label">Team</div><h2 className="panel-title">Built as a real product iteration.</h2></div></div>
          <div className="grid grid-3">
            {people.map(([name, role, body]) => <article className="glass-card panel team-card" key={name}><h3 className="panel-title">{name}</h3><p className="faint">{role}</p><p className="muted">{body}</p></article>)}
          </div>
        </section>
      </div>
    </main>
  );
}
