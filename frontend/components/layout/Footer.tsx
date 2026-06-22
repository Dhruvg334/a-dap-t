import Link from 'next/link';
import { BrandWord } from '@/components/ui/BrandWord';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h2 className="footer-brand"><BrandWord /></h2>
            <p className="muted" style={{ maxWidth: 420 }}>
              AI application security assessment platform for code, APIs, dependencies, agent capabilities, memory risks, guardrails, policy, and remedy planning.
            </p>
          </div>
          <div>
            <div className="footer-title">Product</div>
            <Link className="footer-link" href="/scanner">Scanner</Link>
            <Link className="footer-link" href="/report/current">Report workspace</Link>
            <Link className="footer-link" href="/compare">Compare</Link>
            <Link className="footer-link" href="/methodology">Methodology</Link>
            <Link className="footer-link" href="/about">About</Link>
          </div>
          <div>
            <div className="footer-title">System</div>
            <a className="footer-link" href="https://adapt-3s27.onrender.com/docs" target="_blank" rel="noreferrer">API docs</a>
            <a className="footer-link" href="https://github.com/Dhruvg334/a-dap-t" target="_blank" rel="noreferrer">GitHub repo</a>
            <Link className="footer-link" href="/profile">Saved reports</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>Scan → Map → Guardrails → Remedy → Policy</span>
          <span>Deterministic verdict. AI explains only.</span>
        </div>
      </div>
    </footer>
  );
}
