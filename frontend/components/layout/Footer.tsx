import Link from 'next/link';
import { BrandWord } from '@/components/ui/BrandWord';

export function Footer() {
  return (
    <footer className="adapt-footer">
      <div className="adapt-footer-grid">
        <div>
          <h2><BrandWord /></h2>
          <p>AI application security review before deployment.</p>
        </div>
        <nav aria-label="Footer product links">
          <Link href="/scanner">Scanner</Link>
          <Link href="/report/current">Report</Link>
          <Link href="/compare">Compare</Link>
          <Link href="/methodology">Methodology</Link>
          <Link href="/about">About</Link>
        </nav>
        <div>
          <strong>Scan → Map → Guardrail → Remedy → Release</strong>
          <p>Static text scan. No project code execution. AI explains report evidence only.</p>
        </div>
      </div>
    </footer>
  );
}
