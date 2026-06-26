import Link from 'next/link';
import { BrandWord } from '@/components/ui/BrandWord';

export function Footer() {
  return (
    <footer className="adapt-footer refined-footer">
      <div className="adapt-footer-grid">
        <div className="footer-brand-block">
          <h2><BrandWord /></h2>
          <p>AI application security review before deployment. Static source review, release policy, guardrail coverage, and fix-first guidance.</p>
        </div>
        <nav aria-label="Footer product links">
          <strong>Workspace</strong>
          <Link href="/scanner">Scanner</Link>
          <Link href="/report/current">Report</Link>
          <Link href="/compare">Compare</Link>
          <Link href="/profile">Profile</Link>
        </nav>
        <nav aria-label="Footer resource links">
          <strong>Resources</strong>
          <Link href="/methodology">Methodology</Link>
          <Link href="/about">About</Link>
          <Link href="/scanner">Run Scan</Link>
        </nav>
        <div className="footer-release-loop">
          <strong>Scan → Map → Guardrail → Remedy → Release</strong>
          <p>No project code execution. AI explains report evidence only. Release decisions remain policy-led and reviewable.</p>
        </div>
      </div>
    </footer>
  );
}
