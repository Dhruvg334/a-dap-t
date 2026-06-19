'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, formatApiError } from '@/lib/api';
import { getAuthState } from '@/lib/auth';
import { AuthGate } from '@/components/auth/AuthGate';
import { saveCurrentReport } from '@/lib/report-storage';
import { BrandWord } from '@/components/ui/BrandWord';
import type { ScanReport } from '@/types/scan';

type ReportSummary = ScanReport & {
  id?: string;
  created_at?: string;
  timestamp?: string;
  upload_name?: string;
};

function formatDate(value?: string | null) {
  if (!value) return 'Recently saved';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently saved';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getReportId(report: ReportSummary) {
  return report.report_id || report.id || null;
}

function decisionClass(decision?: string) {
  const value = String(decision || '').toUpperCase();
  if (value === 'BLOCK') return 'danger';
  if (value === 'REVIEW') return 'warning';
  if (value === 'ALLOW') return 'safe';
  return 'neutral';
}

function ProfileContent() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const auth = getAuthState();
    setEmail(auth?.email || 'A-DAP-T user');

    apiFetch<ReportSummary[]>('/reports')
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch((err) => setError(formatApiError(err, 'Could not load reports.')))
      .finally(() => setLoading(false));
  }, []);

  const blockedCount = useMemo(
    () => reports.filter((r) => String(r.deployment_gate?.decision || '').toUpperCase() === 'BLOCK').length,
    [reports]
  );

  const latestScore = reports[0]?.safety_score ?? '—';

  async function openReport(report: ReportSummary) {
    const reportId = getReportId(report);
    setError('');
    setNotice('');
    setOpeningId(reportId || `${report.project_name}-${report.scan_type}`);

    try {
      const fullReport = reportId
        ? await apiFetch<ScanReport>(`/reports/${encodeURIComponent(reportId)}`)
        : report;
      saveCurrentReport(fullReport);
      router.push('/report/current');
    } catch (err) {
      setError(formatApiError(err, 'Could not open this saved report.'));
    } finally {
      setOpeningId(null);
    }
  }

  async function deleteReport(report: ReportSummary) {
    const reportId = getReportId(report);
    if (!reportId) {
      setError('This saved report does not include a report id, so it cannot be deleted from history.');
      return;
    }

    const title = report.project_name || report.repo_name || 'this report';
    const confirmed = window.confirm(`Delete ${title} from saved reports?`);
    if (!confirmed) return;

    setError('');
    setNotice('');
    setDeletingId(reportId);

    try {
      await apiFetch(`/reports/${encodeURIComponent(reportId)}`, { method: 'DELETE' });
      setReports((current) => current.filter((item) => getReportId(item) !== reportId));
      setNotice('Saved report deleted.');
    } catch (err) {
      setError(formatApiError(err, 'Could not delete this report.'));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="page-shell">
      <div className="container">
        <div className="page-head centered profile-head">
          <div>
            <div className="tech-label page-kicker"><span className="pulse-dot" /> PROFILE</div>
            <h1 className="page-title">Account workspace.</h1>
            <p className="page-desc">Signed in as {email}. Reopen saved scans, review gate decisions, and keep your agent safety history in one place.</p>
          </div>
          <Link className="btn btn-primary" href="/scanner">Run New Scan</Link>
        </div>

        <section className="profile-summary-grid" style={{ marginBottom: 18 }}>
          <div className="solid-card stat profile-identity-card">
            <div className="profile-avatar">DG</div>
            <div>
              <div className="stat-label">Signed in account</div>
              <div className="profile-email">{email}</div>
            </div>
          </div>
          <div className="solid-card stat shimmer"><div className="stat-value">{reports.length}</div><div className="stat-label">Saved Reports</div></div>
          <div className="solid-card stat"><div className="stat-value">{latestScore}</div><div className="stat-label">Latest Score</div></div>
          <div className="solid-card stat"><div className="stat-value">{blockedCount}</div><div className="stat-label">Blocked</div></div>
        </section>

        {loading && <div className="form-success">Loading saved reports...</div>}
        {notice && <div className="form-success">{notice}</div>}
        {error && <div className="form-error">{error}</div>}
        {!loading && !reports.length && (
          <div className="solid-card panel empty-history-card">
            <div className="tech-label"><span className="pulse-dot" /> NO REPORTS YET</div>
            <h2 className="panel-title">Start with a demo scan.</h2>
            <p className="muted">Run a scan with “save report” enabled. Saved reports will appear here with view and delete actions.</p>
            <Link className="btn btn-primary" href="/scanner">Open Scanner</Link>
          </div>
        )}

        {!!reports.length && (
          <section className="report-history-section">
            <div className="section-strip">
              <div>
                <div className="tech-label"><span className="pulse-dot" /> SAVED SCANS</div>
                <h2 className="section-title compact-title">Report history.</h2>
              </div>
              <p className="muted">Open a full Firestore report or remove old scans from history.</p>
            </div>
            <div className="grid grid-2 report-history-grid">
              {reports.map((report, index) => {
                const reportId = getReportId(report);
                const title = report.project_name || report.repo_name || report.upload_name || 'Saved report';
                const decision = report.deployment_gate?.decision || report.status || 'Saved';
                const isOpening = openingId === (reportId || `${report.project_name}-${report.scan_type}`);
                const isDeleting = deletingId === reportId;

                return (
                  <article className="solid-card panel report-history-card" key={reportId || `${report.project_name}-${index}`}>
                    <div className="report-card-topline">
                      <span className="panel-label">{report.scan_type || 'scan'}</span>
                      <span className={`pill ${decisionClass(report.deployment_gate?.decision)}`}>{decision}</span>
                    </div>
                    <div className="report-card-main">
                      <div>
                        <h3 className="panel-title">{title}</h3>
                        <p className="muted">{report.repo_url || 'Saved A-DAP-T scan report'}</p>
                      </div>
                      <div className="report-score-orb">
                        <strong>{report.safety_score ?? '—'}</strong>
                        <span>score</span>
                      </div>
                    </div>
                    <div className="report-card-meta">
                      <span>{formatDate(report.created_at || report.timestamp)}</span>
                      <span>{report.summary?.critical ?? 0} critical</span>
                      <span>{report.summary?.high ?? 0} high</span>
                    </div>
                    <div className="report-card-actions">
                      <button className="btn btn-primary btn-small" type="button" onClick={() => openReport(report)} disabled={isOpening || isDeleting}>
                        {isOpening ? 'Opening...' : 'View Report'}
                      </button>
                      <button className="btn btn-danger btn-small" type="button" onClick={() => deleteReport(report)} disabled={isOpening || isDeleting || !reportId}>
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <AuthGate nextPath="/profile" label="Checking access before opening saved reports...">
      <ProfileContent />
    </AuthGate>
  );
}
