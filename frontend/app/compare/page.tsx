'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch, formatApiError } from '@/lib/api';
import { AuthGate } from '@/components/auth/AuthGate';
import { ChevronRight, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import type { ScanReport, Finding } from '@/types/scan';

const CAT_LABELS: Record<string, string> = {
  prompt_injection: 'Prompt Injection Risk',
  secret_exposure: 'Secret Exposure Risk',
  tool_permission: 'Tool Permission Risk',
  human_approval: 'Human Approval Risk',
  data_exposure: 'Data Exposure Risk',
  auditability: 'Auditability Risk'
};

function CompareContent() {
  const [allReports, setAllReports] = useState<ScanReport[]>([]);
  const [beforeId, setBeforeId] = useState<string>('');
  const [afterId, setAfterId] = useState<string>('');
  const [beforeReport, setBeforeReport] = useState<ScanReport | null>(null);
  const [afterReport, setAfterReport] = useState<ScanReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<ScanReport[]>('/reports')
      .then(data => setAllReports(Array.isArray(data) ? data : []))
      .catch(err => setError(formatApiError(err)));
  }, []);

  useEffect(() => {
    if (beforeId && afterId) {
      loadComparison();
    } else {
      setBeforeReport(null);
      setAfterReport(null);
    }
  }, [beforeId, afterId]);

  async function loadComparison() {
    setLoading(true);
    setError('');
    try {
      const [before, after] = await Promise.all([
        apiFetch<ScanReport>(`/reports/${encodeURIComponent(beforeId)}`),
        apiFetch<ScanReport>(`/reports/${encodeURIComponent(afterId)}`)
      ]);
      setBeforeReport(before);
      setAfterReport(after);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  const comparisonData = useMemo(() => {
    if (!beforeReport || !afterReport) return null;

    const bScore = beforeReport.safety_score || 0;
    const aScore = afterReport.safety_score || 0;
    const scoreDelta = aScore - bScore;

    const bFindings = beforeReport.findings || [];
    const aFindings = afterReport.findings || [];

    const bMap = new Map(bFindings.map(f => [f.id || f.title, f]));
    const aMap = new Map(aFindings.map(f => [f.id || f.title, f]));

    const fixed = bFindings.filter(f => !aMap.has(f.id || f.title));
    const added = aFindings.filter(f => !bMap.has(f.id || f.title));

    const criticalFixed = fixed.filter(f => String(f.severity).toLowerCase() === 'critical').length;
    const highFixed = fixed.filter(f => String(f.severity).toLowerCase() === 'high').length;

    // Category Deltas
    const categoryDeltas = Object.keys(CAT_LABELS).map(key => {
      const b = beforeReport.category_scores?.[key] ?? 0;
      const a = afterReport.category_scores?.[key] ?? 0;
      const improvement = b - a; // Risk decrease is improvement
      return { key, label: CAT_LABELS[key], before: b, after: a, improvement };
    });

    const largestImprovement = [...categoryDeltas].sort((a, b) => b.improvement - a.improvement)[0];

    // Summary
    let summary = '';
    if (scoreDelta > 0) {
      summary = `The rescan shows a significant security improvement of ${scoreDelta} points. `;
      if (criticalFixed > 0 || highFixed > 0) {
        summary += `Key risk reduction was achieved by resolving ${criticalFixed} critical and ${highFixed} high findings. `;
      }
      if (fixed.length > 0) {
        summary += `Overall, ${fixed.length} previously identified issues were resolved. `;
      }
      if (added.length > 0) {
        summary += `However, ${added.length} new potential risks were introduced that should be reviewed.`;
      }
    } else if (scoreDelta < 0) {
      summary = `The overall safety score has decreased by ${Math.abs(scoreDelta)} points. `;
      summary += `New findings have been introduced that increase the total risk profile of the agent.`;
    } else {
      summary = `The safety score remained unchanged. `;
      if (fixed.length > 0 || added.length > 0) {
        summary += `While some findings were resolved, others were introduced, maintaining a similar risk level.`;
      }
    }

    return {
      scoreDelta,
      fixed,
      added,
      criticalFixed,
      highFixed,
      categoryDeltas,
      largestImprovement,
      summary
    };
  }, [beforeReport, afterReport]);

  return (
    <main className="page-shell">
      <div className="container">
        <div className="page-head">
          <div className="tech-label page-kicker"><span className="pulse-dot" /> RE-SCAN / SCORE DELTA</div>
          <h1 className="page-title">Compare Reports</h1>
          <p className="page-desc">Select two reports to visualize security improvements and track risk reduction over time.</p>
        </div>

        <div className="solid-card panel" style={{ marginBottom: '2rem' }}>
          <div className="grid grid-2">
            <div className="form-row">
              <label className="form-label">Before Report (Baseline)</label>
              <select
                className="input"
                value={beforeId}
                onChange={(e) => setBeforeId(e.target.value)}
              >
                <option value="">Select a report...</option>
                {allReports.map(r => (
                  <option key={r.id || r.report_id} value={r.id || r.report_id || ''}>
                    {r.project_name || 'A-DAP-T Scan'} ({new Date(r.created_at || r.timestamp || '').toLocaleDateString()}) - Score: {r.safety_score ?? '—'}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label className="form-label">After Report (Target)</label>
              <select
                className="input"
                value={afterId}
                onChange={(e) => setAfterId(e.target.value)}
              >
                <option value="">Select a report...</option>
                {allReports.map(r => (
                  <option key={r.id || r.report_id} value={r.id || r.report_id || ''}>
                    {r.project_name || 'A-DAP-T Scan'} ({new Date(r.created_at || r.timestamp || '').toLocaleDateString()}) - Score: {r.safety_score ?? '—'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading && <div className="form-success">Loading comparison data...</div>}
        {error && <div className="form-error">{error}</div>}

        {comparisonData && (
          <div className="animate-in">
            {comparisonData.largestImprovement.improvement > 0 && (
              <div className="solid-card panel shimmer" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderColor: 'var(--emerald)' }}>
                <TrendingUp className="text-emerald" size={24} />
                <div>
                  <div className="tech-label" style={{ color: 'var(--emerald)' }}>Largest Improvement</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                    {comparisonData.largestImprovement.label}: +{comparisonData.largestImprovement.improvement} Improvement
                  </div>
                </div>
              </div>
            )}

            <div className="tech-label" style={{ marginBottom: '1rem' }}>Overall Improvement</div>
            <div className="stat-grid" style={{ marginBottom: '2rem' }}>
              <div className="solid-card stat">
                <div className="stat-label">Before Score</div>
                <div className="stat-value">{beforeReport?.safety_score}</div>
              </div>
              <div className="solid-card stat">
                <div className="stat-label">After Score</div>
                <div className="stat-value">{afterReport?.safety_score}</div>
              </div>
              <div className="solid-card stat">
                <div className="stat-label">Improvement</div>
                <div className={`stat-value ${comparisonData.scoreDelta >= 0 ? 'text-emerald' : 'text-red'}`}>
                  {comparisonData.scoreDelta >= 0 ? '+' : ''}{comparisonData.scoreDelta}
                </div>
              </div>
            </div>

            <div className="tech-label" style={{ marginBottom: '1rem' }}>Risk Reduction</div>
            <div className="stat-grid" style={{ marginBottom: '2rem' }}>
              <div className="solid-card stat">
                <div className="stat-label">Critical Fixed</div>
                <div className="stat-value text-emerald">{comparisonData.criticalFixed}</div>
              </div>
              <div className="solid-card stat">
                <div className="stat-label">High Fixed</div>
                <div className="stat-value text-emerald">{comparisonData.highFixed}</div>
              </div>
              <div className="solid-card stat">
                <div className="stat-label">Total Fixed</div>
                <div className="stat-value text-emerald">{comparisonData.fixed.length}</div>
              </div>
            </div>

            <div className="tech-label" style={{ marginBottom: '1rem' }}>Category Improvements</div>
            <div className="solid-card panel" style={{ marginBottom: '2rem', padding: 0, overflow: 'hidden' }}>
              <div className="method-table">
                <div className="method-row method-head">
                  <div className="method-cell">Category</div>
                  <div className="method-cell">Before</div>
                  <div className="method-cell">After</div>
                  <div className="method-cell">Delta</div>
                </div>
                {comparisonData.categoryDeltas.map(cat => (
                  <div className="method-row" key={cat.key}>
                    <div className="method-cell">{cat.label}</div>
                    <div className="method-cell">{cat.before}</div>
                    <div className="method-cell">{cat.after}</div>
                    <div className={`method-cell ${cat.improvement >= 0 ? 'text-emerald' : 'text-red'}`}>
                      {cat.improvement >= 0 ? '+' : ''}{cat.improvement}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-2" style={{ marginBottom: '2rem' }}>
              <div>
                <div className="tech-label" style={{ marginBottom: '1rem' }}>Fixed Findings <span className="text-emerald">({comparisonData.fixed.length})</span></div>
                <div className="grid" style={{ gap: '0.75rem' }}>
                  {comparisonData.fixed.length > 0 ? comparisonData.fixed.map((f, i) => (
                    <div key={i} className="solid-card panel" style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{f.title}</div>
                      <div className="tech-label">{f.severity?.toUpperCase()} · {f.category}</div>
                    </div>
                  )) : (
                    <div className="muted" style={{ padding: '1rem' }}>No findings in this category.</div>
                  )}
                </div>
              </div>
              <div>
                <div className="tech-label" style={{ marginBottom: '1rem' }}>New Findings <span className="text-red">({comparisonData.added.length})</span></div>
                <div className="grid" style={{ gap: '0.75rem' }}>
                  {comparisonData.added.length > 0 ? comparisonData.added.map((f, i) => (
                    <div key={i} className="solid-card panel" style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{f.title}</div>
                      <div className="tech-label">{f.severity?.toUpperCase()} · {f.category}</div>
                    </div>
                  )) : (
                    <div className="muted" style={{ padding: '1rem' }}>No findings in this category.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="tech-label" style={{ marginBottom: '1rem' }}>Summary</div>
            <div className="solid-card panel">
              <p className="page-desc" style={{ maxWidth: '100%', margin: 0 }}>{comparisonData.summary}</p>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .text-emerald { color: var(--emerald); }
        .text-red { color: var(--red); }
        .animate-in { animation: fadeIn 0.5s var(--ease); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </main>
  );
}

export default function ComparePage() {
  return (
    <AuthGate nextPath="/compare" label="Checking access before comparing reports...">
      <CompareContent />
    </AuthGate>
  );
}
