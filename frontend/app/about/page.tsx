import { AdaptButton, PageHeader, SectionTitle } from '@/components/ui/AdaptUI';

const features = [
  ['Security score', 'A compact release posture signal supported by richer report artifacts.'],
  ['Policy evaluation', 'Explains whether a scan is blocked, needs review, or can move forward.'],
  ['Guardrail matrix', 'Measures auth, approval, audit, masking, rate limits, allowlists, and safety controls.'],
  ['Capability map', 'Shows what the app or agent can actually do across tools, files, APIs, memory, and services.'],
  ['Remedy plan', 'Turns findings into a fix-first sequence with validation steps.'],
  ['DAP reviewer', 'Explains report context and helps developers understand what to fix first.'],
];

const people = [
  ['Dhruv Gupta', 'Product direction · backend architecture · frontend integration · testing · deployment', 'Led the shift from an AI-agent scanner to a broader AI application security review platform.'],
  ['Pavit Agrawal', 'Backend modules · scanner support · comparison logic', 'Supported scanner modules, report comparison direction, and backend feature work.'],
  ['Akshhaya Isa', 'Frontend implementation · UI support · responsive polish', 'Supported frontend page implementation, component styling, and visual polish.'],
];

const evolution = [
  ['1.0', 'Agent safety scanner', 'Started as a focused scanner for risky AI-agent behavior, proof paths, and basic report artifacts.'],
  ['2.0', 'Release evidence workspace', 'Added saved reports, comparison, proof mode, patch previews, deployment gates, and report-aware DAP review.'],
  ['3.0', 'AI application security review', 'Expanded into code, dependencies, APIs, AppSec risks, capabilities, trust boundaries, guardrails, policy packs, and remedy planning.'],
];

export default function AboutPage() {
  return (
    <main className="adapt-page about-workspace about-refined">
      <div className="adapt-container">
        <PageHeader label="About A-DAP-T" title="Built for AI apps that can act">
          AI applications now call tools, read memory, expose APIs, touch data, and make decisions. A-DAP-T exists to review that release surface before deployment.
        </PageHeader>

        <section className="about-manifesto-grid refined">
          <h2>AI apps are no longer just prompts.</h2>
          <div><p>Modern AI apps combine prompts, tools, APIs, databases, memory, and approval workflows. Traditional scanners can miss how these pieces interact. A-DAP-T maps the release surface and turns scattered signals into a security review.</p><ul><li>Apps can act through tools and APIs</li><li>Memory and context can influence behavior</li><li>Release decisions need evidence, not vibes</li></ul></div>
        </section>

        <section className="adapt-panel about-section evolution-section">
          <SectionTitle label="Product evolution" title="From agent scanner to release review platform" />
          <div className="evolution-grid">
            {evolution.map(([version, title, body]) => <article key={version}><span>{version}</span><h3>{title}</h3><p>{body}</p></article>)}
          </div>
        </section>

        <section className="adapt-panel about-section">
          <SectionTitle label="Differentiation" title="From findings to release decision" />
          <div className="about-feature-grid refined">{features.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div>
        </section>

        <section className="about-principles-grid refined">
          {[
            ['Evidence over claims', 'A-DAP-T reports file paths, signals, weak controls, and recommended actions instead of pretending static scans are runtime proof.'],
            ['AI explains, policy decides', 'AI can explain report evidence, but deterministic artifacts and policy checks drive the release decision.'],
            ['Fix sequence matters', 'The product does not stop at findings. It helps teams decide what to fix first before deployment.'],
          ].map(([title, body]) => <article className="adapt-panel" key={title}><SectionTitle label="Principle" title={title} /><p>{body}</p></article>)}
        </section>

        <section className="adapt-panel about-section">
          <SectionTitle label="Team" title="Built by the DAP team" />
          <div className="team-grid refined">{people.map(([name, role, body]) => <article key={name}><span>{name.split(' ').map((p) => p[0]).join('')}</span><h3>{name}</h3><em>{role}</em><p>{body}</p></article>)}</div>
        </section>

        <section className="about-journey-panel refined">
          <div><SectionTitle label="Try it" title="What you can review" /><ol><li>Run vulnerable demo</li><li>Review blocked release</li><li>Run secured demo</li><li>Compare reports</li><li>Inspect remedy plan</li></ol></div>
          <AdaptButton tone="primary" href="/scanner">Start Scan</AdaptButton>
        </section>
      </div>
    </main>
  );
}
