'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, formatApiError } from '@/lib/api';
import { getAuthState } from '@/lib/auth';
import { saveCurrentReport } from '@/lib/report-storage';
import type { ScanReport } from '@/types/scan';

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [reports, setReports] = useState<ScanReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const auth = getAuthState();
    if (!auth) {
      router.replace(`/signin?next=${encodeURIComponent('/profile')}`);
      return;
    }
    setEmail(auth.email || 'A-DAP-T user');

    apiFetch<ScanReport[]>('/reports')
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch((err) => setError(formatApiError(err, 'Could not load reports.')))
      .finally(() => setLoading(false));
  }, [router]);

  function openReport(report: ScanReport) {
    saveCurrentReport(report);
    router.push('/report/current');
  }

  return (
    <main className="page-shell">
      <div className="container">
        <div className="page-head">
          <div>
            <div className="tech-label page-kicker"><span className="pulse-dot" /> PROFILE</div>
            <h1 className="page-title">Account<br />workspace.</h1>
            <p className="page-desc">Signed in as {email}. Reopen saved scans, continue reviewing gate decisions, and keep your agent safety history in one place.</p>
          </div>
          <Link className="btn btn-primary" href="/scanner">Run new scan</Link>
        </div>

        <section className="stat-grid" style={{ marginBottom: 18 }}>
          <div className="glass-card stat shimmer"><div className="stat-value">{reports.length}</div><div className="stat-label">Saved Reports</div></div>
          <div className="glass-card stat"><div className="stat-value">{reports[0]?.safety_score ?? '—'}</div><div className="stat-label">Latest Score</div></div>
          <div className="glass-card stat"><div className="stat-value">{reports.filter((r) => String(r.deployment_gate?.decision || '').toUpperCase() === 'BLOCK').length}</div><div className="stat-label">Blocked</div></div>
          <div className="glass-card stat"><div className="profile-avatar">DG</div><div className="stat-label">Account</div></div>
        </section>

        {loading && <div className="form-success">Loading saved reports...</div>}
        {error && <div className="form-error">{error}</div>}
        {!loading && !reports.length && <div className="glass-card panel"><p className="muted">No saved reports yet. Run a scan with “save report” enabled.</p></div>}

        <section className="grid grid-2 report-history-grid">
          {reports.map((report, index) => (
            <button className="glass-card panel report-history-card" key={report.report_id || `${report.project_name}-${index}`} onClick={() => openReport(report)} style={{ textAlign: 'left' }}>
              <div className="panel-head">
                <div>
                  <div className="panel-label">{report.scan_type || 'scan'}</div>
                  <h2 className="panel-title">{report.project_name || report.repo_name || 'Saved report'}</h2>
                </div>
                <span className="pill neutral">{report.safety_score ?? '—'}</span>
              </div>
              <p className="muted">Gate: {report.deployment_gate?.decision || '—'} · Findings: {report.findings?.length || 0}</p>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}
