import { BrandWord } from '@/components/ui/BrandWord';

const surfaces = [
  ['Dependencies', 'package.json, package-lock.json, requirements.txt, lockfile gaps, unpinned ranges, direct-source dependencies.'],
  ['API Surface', 'FastAPI, Express, and Next.js routes with auth, rate-limit, CORS, upload, mutation, and LLM-cost signals.'],
  ['AppSec Sinks', 'Path traversal, SSRF, command execution, SQL injection, XSS, weak JWT config, unsafe deserialization, archive extraction.'],
  ['Context Risk', 'Persistent memory, vector/RAG ingestion, retrieved context influencing tool use, missing source trust controls.'],
  ['Capabilities', 'What the app or agent can actually do: write actions, external calls, memory, file operations, databases, and execution sinks.'],
  ['Guardrails', 'Authentication, authorization, rate limits, approval gates, audit logs, PII masking, tool allowlists, sandboxing, safe uploads.'],
];

const flow = [
  ['01', 'Inventory', 'Build project metadata, file inventory, framework detection, and package manager context.'],
  ['02', 'Security surfaces', 'Run deterministic scanners across dependencies, APIs, AppSec sinks, and AI context/memory risk.'],
  ['03', 'Capability model', 'Map what the project can do and where trust boundaries are crossed.'],
  ['04', 'Guardrail coverage', 'Calculate relevant controls, protected instances, risk instances, and recommended actions.'],
  ['05', 'Policy + remedy', 'Evaluate selected policy pack and build a prioritized remedy plan.'],
  ['06', 'AI explanation', 'DAP and Gemini explain report evidence. They do not decide raw findings or policy verdicts.'],
];

export default function MethodologyPage() {
  return (
    <main className="page-shell methodology-v3-page">
      <div className="container">
        <div className="page-head centered">
          <div>
            <div className="tech-label page-kicker"><span className="pulse-dot" /> V3 METHODOLOGY</div>
            <h1 className="page-title">How A-DAP-T reviews AI app security.</h1>
          </div>
          <p className="page-desc"><BrandWord /> uses deterministic static analysis first, then AI only explains the evidence. The v3 model separates legacy agent scoring from a broader security score covering dependencies, APIs, capabilities, guardrails, and release policy.</p>
        </div>

        <section className="glass-card panel" style={{ marginBottom: 18 }}>
          <div className="panel-head"><div><div className="panel-label">Pipeline</div><h2 className="panel-title">Text-only analysis, no project execution.</h2></div><span className="pill safe">Deterministic first</span></div>
          <div className="v3-method-flow">
            {flow.map(([num, title, body]) => <div className="glass-card v3-method-step" key={num}><span>{num}</span><strong>{title}</strong><p>{body}</p></div>)}
          </div>
        </section>

        <section className="glass-card panel" style={{ marginBottom: 18 }}>
          <div className="panel-head"><div><div className="panel-label">Security surfaces</div><h2 className="panel-title">What v3 inspects.</h2></div><span className="pill neutral">Static evidence</span></div>
          <div className="method-table">
            <div className="method-row method-head"><div className="method-cell">Surface</div><div className="method-cell">Checks</div></div>
            {surfaces.map(([surface, checks]) => <div className="method-row" key={surface}><div className="method-cell"><strong>{surface}</strong></div><div className="method-cell">{checks}</div></div>)}
          </div>
        </section>

        <section className="grid grid-3" style={{ marginBottom: 18 }}>
          {[
            ['Legacy safety score', 'The original v2 score remains visible for compatibility with old reports and agent-specific categories.'],
            ['V3 security score', 'The new score includes dependency, API, AppSec, context, capability, trust-boundary, and guardrail signals.'],
            ['Policy evaluation', 'Policy packs decide BLOCK, REVIEW, or ALLOW using v3 score, required controls, and hard blockers.'],
          ].map(([title, body]) => <article className="glass-card panel shimmer" key={title}><div className="panel-label">SCORING</div><h2 className="panel-title">{title}</h2><p className="muted">{body}</p></article>)}
        </section>

        <section className="grid grid-2">
          <article className="glass-card panel">
            <div className="panel-label">AI usage</div>
            <h2 className="panel-title">AI explains. It does not decide.</h2>
            <p className="muted">Gemini and DAP are used for report explanation, prioritization support, and guided review. Scanner evidence, severity signals, v3 score, policy blockers, and remedy ordering remain deterministic.</p>
          </article>
          <article className="glass-card panel">
            <div className="panel-label">Limitations</div>
            <h2 className="panel-title">Static review is not runtime proof.</h2>
            <p className="muted">A-DAP-T does not execute uploaded projects and does not replace a professional security audit. It identifies visible static evidence, missing controls, and release-readiness risks before deployment.</p>
          </article>
        </section>
      </div>
    </main>
  );
}
