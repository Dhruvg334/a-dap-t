import Link from 'next/link';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h2 className="footer-brand">A-DAP-T</h2>
            <p className="muted" style={{ maxWidth: 380 }}>
              Deployment safety gate for AI agents. Scan risky behavior, prove attack paths, generate fix previews, and block unsafe releases.
            </p>
          </div>
          <div>
            <div className="footer-title">Product</div>
            <Link className="footer-link" href="/scanner">Scanner</Link>
            <Link className="footer-link" href="/report/current">Report workspace</Link>
            <Link className="footer-link" href="/profile">Report history</Link>
          </div>
          <div>
            <div className="footer-title">System</div>
            <Link className="footer-link" href="/methodology">Methodology</Link>
            <a className="footer-link" href="https://adapt-3s27.onrender.com/docs" target="_blank" rel="noreferrer">API docs</a>
            <a className="footer-link" href="https://a-dap-t.vercel.app/" target="_blank" rel="noreferrer">Live app</a>
          </div>
          <div>
            <div className="footer-title">Built by</div>
            <span className="footer-link">Dhruv Gupta</span>
            <span className="footer-link">Pavit Agrawal</span>
            <span className="footer-link">Akshhaya Isa</span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>Scan → Prove → Patch → Gate</span>
          <span>Rule-based verdict. AI explains only.</span>
        </div>
      </div>
    </footer>
  );
}
