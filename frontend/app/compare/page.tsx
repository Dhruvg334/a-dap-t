'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, GitCompareArrows, RefreshCcw } from 'lucide-react';
import { AuthGate } from '@/components/auth/AuthGate';
import { apiFetch, downloadText, formatApiError } from '@/lib/api';
import { saveCurrentReport } from '@/lib/report-storage';
import type { ScanReport } from '@/types/scan';
import { AdaptBadge, AdaptButton, EmptyState, PageHeader, SectionTitle, StatTile } from '@/components/ui/AdaptUI';
import { categoryName, displayNumber, gateClass, scoreTone } from '@/lib/score';

type Summary = ScanReport & { id?: string; report_id?: string; created_at?: string; timestamp?: string; policy_decision?: string; v3_security_score?: number | null };

type SurfaceDelta = { label: string; before: number | string; after: number | string; change: string; status: 'Improved' | 'Regressed' | 'Still risky' | 'No change' };

function idOf(report: Summary) { return report.report_id || report.id || `${report.project_name}-${report.created_at || report.timestamp}`; }
function dateOf(report: Summary) { const date = new Date(report.created_at || report.timestamp || ''); return Number.isNaN(date.getTime()) ? 'Saved report' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function scoreOf(report?: ScanReport | null) { return displayNumber(report?.v3_security_score ?? report?.safety_score, 0); }
function decisionOf(report?: ScanReport | null) { return report?.policy_evaluation?.decision || report?.deployment_gate?.decision || 'REVIEW'; }
function riskCount(report: ScanReport | null | undefined, key: string) {
  if (!report) return 0;
  const map: Record<string, number> = {
    Dependencies: report.dependency_risks?.risks?.length || 0,
    'API Surface': report.api_surface?.risks?.length || 0,
    AppSec: report.appsec_risks?.risks?.length || 0,
    'Context Risk': report.context_poisoning_risks?.risks?.length || 0,
    Capabilities: report.capability_map?.summary?.high_risk_count || report.capability_map?.capabilities?.filter((c) => ['critical', 'high'].includes(String(c.risk_level).toLowerCase())).length || 0,
    Guardrails: displayNumber(report.guardrail_matrix?.summary?.risky_controls, 0),
    Remedy: report.remedy_plan?.steps?.length || 0,
  };
  return map[key] || 0;
}

function CompareContent() {
  const [reports, setReports] = useState<Summary[]>([]);
  const [beforeId, setBeforeId] = useState('');
  const [afterId, setAfterId] = useState('');
  const [beforeReport, setBeforeReport] = useState<ScanReport | null>(null);
  const [afterReport, setAfterReport] = useState<ScanReport | null>(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadingPair, setLoadingPair] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<Summary[]>('/reports')
      .then((data) => {
        const safe = Array.isArray(data) ? data : [];
        setReports(safe);
        if (safe[0]) setBeforeId(idOf(safe[1] || safe[0]));
        if (safe[1]) setAfterId(idOf(safe[0]));
      })
      .catch((err) => setError(formatApiError(err, 'Could not load reports.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    async function loadPair() {
      if (!beforeId || !afterId || beforeId === afterId) return;
      setLoadingPair(true);
      setError('');
      try {
        const [before, after] = await Promise.all([apiFetch<ScanReport>(`/reports/${encodeURIComponent(beforeId)}`), apiFetch<ScanReport>(`/reports/${encodeURIComponent(afterId)}`)]);
        setBeforeReport(before); setAfterReport(after);
      } catch (err) {
        setError(formatApiError(err, 'Could not load selected reports.'));
      } finally {
        setLoadingPair(false);
      }
    }
    loadPair();
  }, [beforeId, afterId]);

  const deltas = useMemo<SurfaceDelta[]>(() => {
    if (!beforeReport || !afterReport) return [];
    const surfaces = ['Dependencies', 'API Surface', 'AppSec', 'Context Risk', 'Capabilities', 'Guardrails', 'Remedy'];
    return surfaces.map((label) => {
      const before = riskCount(beforeReport, label);
      const after = riskCount(afterReport, label);
      const diff = after - before;
      const status = diff < 0 ? 'Improved' : diff > 0 ? 'Regressed' : after > 0 ? 'Still risky' : 'No change';
      return { label, before, after, change: diff === 0 ? '0' : `${diff > 0 ? '+' : ''}${diff}`, status };
    });
  }, [beforeReport, afterReport]);

  const visibleDeltas = deltas.filter((row) => filter === 'all' || row.status.toLowerCase().replace(' ', '-') === filter);
  const scoreDelta = scoreOf(afterReport) - scoreOf(beforeReport);

  function openTarget() {
    if (!afterReport) return;
    saveCurrentReport(afterReport);
    window.location.href = '/report/current';
  }

  return (
    <main className="adapt-page compare-workspace">
      <div className="adapt-container">
        <PageHeader label="Release diff" title="Compare two security reviews" actions={<><AdaptButton tone="secondary" href="/scanner">Open Scanner</AdaptButton><AdaptButton tone="primary" onClick={openTarget} disabled={!afterReport}>Open Target Report</AdaptButton></>}>
          Select a baseline and target report to see whether the release surface improved across score, policy, guardrails, capabilities, and remedy progress.
        </PageHeader>

        {error ? <div className="adapt-alert danger">{error}</div> : null}
        {loading ? <div className="adapt-panel">Loading saved reports…</div> : null}
        {!loading && reports.length < 2 ? <EmptyState title="Run at least two scans first">Compare needs a baseline report and a target report. Run the vulnerable and secured demos for the cleanest walkthrough.<AdaptButton tone="primary" href="/scanner">Run scans</AdaptButton></EmptyState> : null}

        {reports.length >= 2 ? <section className="compare-selector-panel">
          <ReportSelect label="Baseline report" value={beforeId} onChange={setBeforeId} reports={reports} disabledId={afterId} />
          <div className="compare-arrow"><ArrowRight size={20} /></div>
          <ReportSelect label="Target report" value={afterId} onChange={setAfterId} reports={reports} disabledId={beforeId} />
        </section> : null}

        {loadingPair ? <div className="adapt-panel">Loading full reports for comparison…</div> : null}
        {beforeReport && afterReport ? <>
          <section className="compare-executive-card">
            <div>
              <div className="adapt-kicker"><span />Release posture</div>
              <h2>{scoreDelta > 0 ? 'Security posture improved' : scoreDelta < 0 ? 'Security posture regressed' : 'No material score change'}</h2>
              <p>The target report {scoreDelta >= 0 ? 'reduces or maintains' : 'increases'} release risk across the selected scan pair. Review remaining guardrails before deployment.</p>
            </div>
            <div className="compare-score-pair"><span>{scoreOf(beforeReport)}</span><ArrowRight size={18} /><strong>{scoreOf(afterReport)}</strong><em>{scoreDelta >= 0 ? '+' : ''}{scoreDelta}</em></div>
            <div className="compare-decision-pair"><AdaptBadge tone={gateClass(decisionOf(beforeReport)) as any}>{decisionOf(beforeReport)}</AdaptBadge><ArrowRight size={14} /><AdaptBadge tone={gateClass(decisionOf(afterReport)) as any}>{decisionOf(afterReport)}</AdaptBadge></div>
          </section>

          <section className="surface-delta-section">
            <SectionTitle label="Surface changes" title="What changed across the release surface" action={<div className="filter-chip-row">{['all', 'improved', 'regressed', 'still-risky'].map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{categoryName(item)}</button>)}</div>} />
            <div className="release-diff-table"><div className="release-diff-row head"><span>Surface</span><span>Baseline</span><span>Target</span><span>Change</span><span>Status</span></div>{visibleDeltas.map((row) => <div className="release-diff-row" key={row.label}><strong>{row.label}</strong><span>{row.before}</span><span>{row.after}</span><span>{row.change}</span><AdaptBadge tone={row.status === 'Improved' ? 'safe' : row.status === 'Regressed' ? 'danger' : row.status === 'Still risky' ? 'warning' : 'neutral'}>{row.status}</AdaptBadge></div>)}</div>
          </section>

          <section className="compare-bottom-grid">
            <div className="adapt-panel">
              <SectionTitle label="Remedy progress" title="Fix progress" />
              <ThreeColumnProgress before={beforeReport} after={afterReport} />
            </div>
            <div className="adapt-panel">
              <SectionTitle label="Remaining release risk" title="What still needs review" />
              <p>The target report decision is <strong>{decisionOf(afterReport)}</strong>. Focus on remaining partial guardrails, dependency hygiene, and any capabilities that still have external effects without full evidence.</p>
              <div className="compare-actions"><AdaptButton tone="primary" onClick={openTarget}>Open Target Report</AdaptButton><AdaptButton tone="secondary" onClick={() => downloadText('adapt-release-diff.json', JSON.stringify({ beforeReport, afterReport, deltas }, null, 2), 'application/json')}>Export Diff</AdaptButton></div>
            </div>
          </section>
        </> : null}
      </div>
    </main>
  );
}

function ReportSelect({ label, value, onChange, reports, disabledId }: { label: string; value: string; onChange: (value: string) => void; reports: Summary[]; disabledId?: string }) {
  const selected = reports.find((report) => idOf(report) === value);
  return <label className="report-select-card"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select report…</option>{reports.map((report) => { const id = idOf(report); return <option key={id} value={id} disabled={id === disabledId}>{report.project_name || report.upload_name || 'Saved report'} · {dateOf(report)}</option>; })}</select>{selected ? <div className="selected-report-preview"><strong>{selected.project_name || selected.upload_name || 'Saved report'}</strong><em>{scoreOf(selected)} score · {decisionOf(selected)}</em></div> : null}</label>;
}

function ThreeColumnProgress({ before, after }: { before: ScanReport; after: ScanReport }) {
  const beforeTitles = Array.from(new Set((before.remedy_plan?.steps || []).map((s) => s.title).filter(Boolean) as string[]));
  const afterTitles = Array.from(new Set((after.remedy_plan?.steps || []).map((s) => s.title).filter(Boolean) as string[]));
  const afterSet = new Set(afterTitles);
  const fixed = beforeTitles.filter((title) => !afterSet.has(title)).slice(0, 4);
  const open = afterTitles.slice(0, 4);
  return <div className="remedy-progress-columns"><div><h3>Fixed</h3>{fixed.length ? fixed.map((item) => <p key={item}><CheckDot />{item}</p>) : <p>None confirmed from titles.</p>}</div><div><h3>Still open</h3>{open.length ? open.map((item) => <p key={item}><CheckDot />{item}</p>) : <p>No open remedy rows.</p>}</div><div><h3>Newly detected</h3><p>Review evidence table for newly added findings.</p></div></div>;
}
function CheckDot() { return <span className="tiny-dot" />; }

export default function ComparePage() { return <AuthGate nextPath="/compare" label="Checking access before comparing reports..."><CompareContent /></AuthGate>; }
