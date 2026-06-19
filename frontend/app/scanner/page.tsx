'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ScanReport } from '@/types/scan';
import { apiFetch } from '@/lib/api';
import { getAuthState } from '@/lib/auth';
import { saveCurrentReport } from '@/lib/report-storage';

type ScanMode = 'vulnerable' | 'secured' | 'github' | 'zip';

const scanOptions: Array<{ id: ScanMode; label: string; title: string; body: string; icon: string; meta: string }> = [
  { id: 'vulnerable', label: 'Intentionally vulnerable', title: 'Vulnerable demo agent', body: 'Run the unsafe support agent and see A-DAP-T prove risky tool paths, generate fixes, and block deployment.', icon: '⚠', meta: 'Best demo starting point' },
  { id: 'secured', label: 'Hardened demo', title: 'Secured demo agent', body: 'Run the improved version and compare how guardrails change the deployment verdict.', icon: '✓', meta: 'Safer baseline' },
  { id: 'github', label: 'Public repository', title: 'GitHub repo scan', body: 'Paste a public GitHub repository URL. Code is downloaded as ZIP and read as text only.', icon: '⌁', meta: 'No code execution' },
  { id: 'zip', label: 'Upload project', title: 'ZIP upload', body: 'Upload a project ZIP with safe extraction limits for local/private demos.', icon: '⇧', meta: '20 MB / 300 file limit' },
];

export default function ScannerPage() {
  const router = useRouter();
  const [mode, setMode] = useState<ScanMode>('vulnerable');
  const [repoUrl, setRepoUrl] = useState('https://github.com/Dhruvg334/closira-smb-support-agent');
  const [branch, setBranch] = useState('main');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [saveReport, setSaveReport] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progressText, setProgressText] = useState('');

  useEffect(() => {
    if (!getAuthState()) {
      router.replace(`/signin?next=${encodeURIComponent('/scanner')}`);
    }
  }, [router]);

  async function runScan(event?: FormEvent) {
    event?.preventDefault();
    setError('');
    setLoading(true);
    setProgressText('Preparing scan request...');

    try {
      let report: ScanReport;

      if (mode === 'vulnerable') {
        setProgressText('Running vulnerable demo scan...');
        report = await apiFetch<ScanReport>(`/scan/demo/vulnerable?save_report=${saveReport}`);
      } else if (mode === 'secured') {
        setProgressText('Running secured demo scan...');
        report = await apiFetch<ScanReport>(`/scan/demo/secured?save_report=${saveReport}`);
      } else if (mode === 'github') {
        setProgressText('Downloading and scanning GitHub repository...');
        report = await apiFetch<ScanReport>('/scan/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo_url: repoUrl, branch, save_report: saveReport }),
        });
      } else {
        if (!zipFile) throw new Error('Select a ZIP file first.');
        const formData = new FormData();
        formData.append('file', zipFile);
        formData.append('save_report', String(saveReport));
        setProgressText('Uploading and scanning ZIP project...');
        report = await apiFetch<ScanReport>('/scan/upload', { method: 'POST', body: formData });
      }

      setProgressText('Building V2 report workspace...');
      saveCurrentReport(report);
      router.push('/report/current');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="container">
        <div className="page-head">
          <div>
            <div className="tech-label page-kicker"><span className="pulse-dot" /> SCAN LAUNCHER</div>
            <h1 className="page-title">Choose your<br />scan target.</h1>
            <p className="page-desc">Run built-in demo agents, scan a public GitHub repository, or upload a project ZIP. A-DAP-T reads source files as text and does not execute project code.</p>
          </div>
          <button className="btn btn-primary" onClick={() => runScan()} disabled={loading}>{loading ? 'Scanning...' : 'Run scan'}</button>
        </div>

        {error && <div className="form-error" style={{ marginBottom: 18 }}>{error}</div>}
        {loading && <div className="form-success" style={{ marginBottom: 18 }}>{progressText || 'Scanning...'}</div>}

        <section className="grid grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 18 }}>
          {scanOptions.map((option) => (
            <button key={option.id} className={`glass-card scan-card ${mode === option.id ? 'active shimmer' : ''}`} type="button" onClick={() => setMode(option.id)}>
              <div>
                <div className="scan-icon">{option.icon}</div>
                <h3>{option.title}</h3>
                <p>{option.body}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 22 }}>
                <span className="pill neutral">{option.label}</span>
                <span className="faint">{option.meta}</span>
              </div>
            </button>
          ))}
        </section>

        <form className="glass-card panel" style={{ marginTop: 18 }} onSubmit={runScan}>
          <div className="panel-head">
            <div>
              <div className="panel-label">Scan configuration</div>
              <h2 className="panel-title">{scanOptions.find((option) => option.id === mode)?.title}</h2>
            </div>
            <label className="pill neutral" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={saveReport} onChange={(e) => setSaveReport(e.target.checked)} style={{ marginRight: 8 }} /> Save report
            </label>
          </div>

          {mode === 'github' && (
            <div className="grid grid-2">
              <label className="form-row">
                <span className="form-label">Repository URL</span>
                <input className="input" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/user/repo" />
              </label>
              <label className="form-row">
                <span className="form-label">Branch</span>
                <input className="input" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" />
              </label>
            </div>
          )}

          {mode === 'zip' && (
            <label className="form-row">
              <span className="form-label">Project ZIP</span>
              <input className="input" type="file" accept=".zip" onChange={(e) => setZipFile(e.target.files?.[0] || null)} />
              <span className="faint">ZIP limits are enforced by the backend. Uploaded code is never executed.</span>
            </label>
          )}

          {(mode === 'vulnerable' || mode === 'secured') && (
            <p className="muted">This built-in sample is the fastest way to verify the full V2 loop: score, findings, Prove Mode, patch previews, deployment gate, and DAP.</p>
          )}

          <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Running scan...' : 'Run selected scan'}</button>
            <span className="pill neutral">Scan → Prove → Patch → Gate</span>
          </div>
        </form>
      </div>
    </main>
  );
}
