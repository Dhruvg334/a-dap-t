'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { AuthGate } from '@/components/auth/AuthGate';
import { apiFetch, formatApiError } from '@/lib/api';
import { getAuthState } from '@/lib/auth';
import { saveCurrentReport } from '@/lib/report-storage';
import type { ScanReport } from '@/types/scan';
import { AdaptBadge, AdaptButton, EmptyState, PageHeader, SectionTitle, StatTile } from '@/components/ui/AdaptUI';
import { displayNumber, gateClass, scoreTone } from '@/lib/score';

type ReportSummary = ScanReport & { id?: string; report_id?: string; created_at?: string; timestamp?: string; policy_decision?: string; v3_security_score?: number | null };
type Filter = 'all' | 'block' | 'review' | 'allow' | 'demo' | 'github' | 'zip';
type SortMode = 'newest' | 'lowest' | 'highest';

function reportId(report: ReportSummary) { return report.report_id || report.id || `${report.project_name}-${report.created_at || report.timestamp}`; }
function scoreOf(report: ReportSummary) { return displayNumber(report.v3_security_score ?? report.safety_score, 0); }
function decisionOf(report: ReportSummary) { return report.policy_decision || report.policy_evaluation?.decision || report.deployment_gate?.decision || report.status || 'SAVED'; }
function dateOf(value?: string | null) { const date = new Date(value || ''); return Number.isNaN(date.getTime()) ? 'Recently saved' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function timeOf(report: ReportSummary) { const date = new Date(report.created_at || report.timestamp || '').getTime(); return Number.isNaN(date) ? 0 : date; }
function sourceType(report: ReportSummary) { const scan = String(report.scan_type || '').toLowerCase(); if (scan.includes('demo')) return 'demo'; if (scan.includes('github')) return 'github'; if (scan.includes('upload') || scan.includes('zip')) return 'zip'; return 'scan'; }

function ProfileContent() {
  const [email, setEmail] = useState('A-DAP-T user');
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<SortMode>('newest');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCompare, setSelectedCompare] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ReportSummary | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const auth = getAuthState();
    setEmail(auth?.email || 'A-DAP-T user');
    apiFetch<ReportSummary[]>('/reports')
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch((err) => setError(formatApiError(err, 'Could not load saved reports.')))
      .finally(() => setLoading(false));
  }, []);

  const filteredReports = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports
      .filter((report) => {
        const decision = String(decisionOf(report)).toLowerCase();
        if (filter !== 'all') {
          if (['block', 'review', 'allow'].includes(filter) && !decision.includes(filter)) return false;
          if (['demo', 'github', 'zip'].includes(filter) && sourceType(report) !== filter) return false;
        }
        if (!q) return true;
        return JSON.stringify({ name: report.project_name, repo: report.repo_url, source: report.scan_type, decision }).toLowerCase().includes(q);
      })
      .sort((a, b) => sort === 'newest' ? timeOf(b) - timeOf(a) : sort === 'lowest' ? scoreOf(a) - scoreOf(b) : scoreOf(b) - scoreOf(a));
  }, [reports, query, filter, sort]);

  const summary = useMemo(() => ({
    saved: reports.length,
    blocked: reports.filter((r) => String(decisionOf(r)).toUpperCase() === 'BLOCK').length,
    review: reports.filter((r) => String(decisionOf(r)).toUpperCase() === 'REVIEW').length,
    average: reports.length ? Math.round(reports.reduce((sum, report) => sum + scoreOf(report), 0) / reports.length) : 0,
  }), [reports]);

  async function openReport(report: ReportSummary) {
    const id = reportId(report);
    setOpeningId(id);
    setError('');
    try {
      const full = id ? await apiFetch<ScanReport>(`/reports/${encodeURIComponent(id)}`) : report;
      saveCurrentReport(full);
      window.location.href = '/report/current';
    } catch (err) {
      setError(formatApiError(err, 'Could not open this report.'));
    } finally {
      setOpeningId(null);
    }
  }

  async function deleteReport() {
    if (!deleteTarget) return;
    const id = reportId(deleteTarget);
    setError('');
    try {
      await apiFetch(`/reports/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setReports((current) => current.filter((item) => reportId(item) !== id));
      setNotice('Report deleted from saved history.');
      setDeleteTarget(null);
    } catch (err) {
      setError(formatApiError(err, 'Could not delete this report.'));
    }
  }

  function toggleCompare(id: string) {
    setSelectedCompare((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= 2 ? [current[1], id] : [...current, id]);
  }

  function goCompare() {
    window.location.href = '/compare';
  }

  return (
    <main className="adapt-page profile-workspace">
      <div className="adapt-container">
        <PageHeader label="Profile" title="Saved security reviews" actions={<><AdaptButton tone="secondary" onClick={() => setCompareMode((v) => !v)}>{compareMode ? 'Cancel Compare' : 'Compare Reports'}</AdaptButton><AdaptButton tone="primary" href="/scanner">New Scan</AdaptButton></>}>
          Open previous reports, compare release changes, and continue reviewing scan history.
        </PageHeader>
        {notice ? <div className="adapt-alert safe">{notice}</div> : null}
        {error ? <div className="adapt-alert danger">{error}</div> : null}

        <section className="profile-summary-panel">
          <div className="profile-identity"><span>{email.slice(0, 2).toUpperCase()}</span><div><strong>{email}</strong><small>Firebase account · report workspace</small></div></div>
          <StatTile label="Saved reports" value={summary.saved} />
          <StatTile label="Blocked" value={summary.blocked} tone={summary.blocked ? 'danger' : 'safe'} />
          <StatTile label="Needs review" value={summary.review} tone="warning" />
          <StatTile label="Average score" value={summary.average || '—'} tone={scoreTone(summary.average) as any} />
        </section>

        <section className="report-controls-bar profile-search-card" style={{ background: 'var(--adapt-surface)', border: '1px solid var(--adapt-border)', borderRadius: 'var(--adapt-radius)' }}>
          <label className="adapt-search" style={{ background: 'var(--adapt-surface)', color: 'var(--adapt-text)' }}><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search reports…" style={{ background: 'transparent', color: 'var(--adapt-text)' }} /></label>
          <div className="filter-chip-row">{(['all', 'block', 'review', 'allow', 'demo', 'github', 'zip'] as Filter[]).map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item.toUpperCase()}</button>)}</div>
        </section>

        <section className="profile-list-toolbar">
          <div>
            <span>Saved reports</span>
            <strong>{filteredReports.length} shown</strong>
          </div>
          <label>Sort
            <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)}><option value="newest">Newest first</option><option value="lowest">Lowest score first</option><option value="highest">Highest score first</option></select>
          </label>
        </section>

        {loading ? <div className="adapt-panel">Loading saved reports…</div> : null}
        {!loading && !reports.length ? <EmptyState title="No saved reports yet">Run a scan and save the report to compare releases later.<AdaptButton tone="primary" href="/scanner">Start Scan</AdaptButton></EmptyState> : null}

        <section className="saved-report-grid">
          {filteredReports.map((report) => {
            const id = reportId(report);
            const selected = selectedCompare.includes(id);
            const tone = gateClass(decisionOf(report)) as any;
            return (
              <article key={id} className={`saved-report-card ${tone} ${selected ? 'selected' : ''}`}>
                <div className="saved-report-top"><AdaptBadge tone="neutral">{sourceType(report)}</AdaptBadge><AdaptBadge tone={tone}>{decisionOf(report)}</AdaptBadge></div>
                <div className="saved-report-main"><div><h2>{report.project_name || report.upload_name || 'A-DAP-T Scan'}</h2><p>{report.repo_url || 'Saved report from scan history.'}</p></div><div className="saved-score"><strong>{scoreOf(report)}</strong><span>score</span></div></div>
                <div className="saved-report-meta"><span>{dateOf(report.created_at || report.timestamp)}</span><span>{report.policy_id || report.policy_evaluation?.selected_policy?.label || 'policy'}</span><span>{report.summary?.critical || 0} critical · {report.summary?.high || 0} high</span></div>
                <div className="saved-report-actions">{compareMode ? <label className="compare-check"><input type="checkbox" checked={selected} onChange={() => toggleCompare(id)} />Select</label> : null}<button onClick={() => openReport(report)} disabled={openingId === id}>{openingId === id ? 'Opening…' : 'View Report'}</button><button onClick={() => setDeleteTarget(report)}><Trash2 size={14} />Delete</button></div>
              </article>
            );
          })}
        </section>

        {compareMode ? <div className="compare-selection-bar"><strong>{selectedCompare.length} reports selected</strong><span>Select two reports to compare release movement.</span><AdaptButton tone="primary" onClick={goCompare} disabled={selectedCompare.length !== 2}>Compare Selected</AdaptButton></div> : null}

        {deleteTarget ? <div className="adapt-modal-backdrop"><section className="adapt-modal"><div className="adapt-kicker"><span />Delete report</div><h2>Delete saved report?</h2><p>This removes the saved report from your profile. It does not affect your project repository.</p><div className="modal-actions"><AdaptButton tone="secondary" onClick={() => setDeleteTarget(null)}>Cancel</AdaptButton><AdaptButton tone="danger" onClick={deleteReport}>Delete Report</AdaptButton></div></section></div> : null}
      </div>
    </main>
  );
}

export default function ProfilePage() { return <AuthGate nextPath="/profile" label="Checking saved report access..."><ProfileContent /></AuthGate>; }
