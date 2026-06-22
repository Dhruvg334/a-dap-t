'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ScanReport } from '@/types/scan';
import { apiFetch, formatApiError } from '@/lib/api';
import { AuthGate } from '@/components/auth/AuthGate';
import { BrandWord } from '@/components/ui/BrandWord';
import { saveCurrentReport } from '@/lib/report-storage';

type ScanMode = 'vulnerable' | 'secured' | 'github' | 'zip';
type PolicyId = 'general_ai_app' | 'agent_with_tools' | 'ai_coding_agent' | 'customer_support_agent' | 'data_sensitive_app' | 'public_saas_api';

function Icon({ type }: { type: ScanMode }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (type === 'vulnerable') return <svg {...common}><path d="M12 3 2.8 20h18.4L12 3Z" /><path d="M12 9v5" /><path d="M12 17.2h.01" /></svg>;
  if (type === 'secured') return <svg {...common}><path d="M12 3.4 19.5 6v5.6c0 4.8-2.9 8.2-7.5 10-4.6-1.8-7.5-5.2-7.5-10V6L12 3.4Z" /><path d="m8.8 12.3 2.1 2.1 4.4-4.7" /></svg>;
  if (type === 'github') return <svg {...common}><path d="M9 19c-4 1.2-4-2-5.6-2.4" /><path d="M15 22v-3.6a3.2 3.2 0 0 0-.9-2.5c3-.3 6.1-1.5 6.1-6.6a5.1 5.1 0 0 0-1.4-3.6 4.8 4.8 0 0 0-.1-3.5s-1.1-.3-3.6 1.4a12.4 12.4 0 0 0-6.6 0C6 1.9 4.9 2.2 4.9 2.2a4.8 4.8 0 0 0-.1 3.5 5.1 5.1 0 0 0-1.4 3.6c0 5.1 3.1 6.3 6.1 6.6a3.2 3.2 0 0 0-.9 2.5V22" /></svg>;
  return <svg {...common}><path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></svg>;
}

const scanOptions: Array<{ id: ScanMode; label: string; title: string; body: string; meta: string }> = [
  { id: 'vulnerable', label: 'V3 stress test', title: 'Vulnerable AI app', body: 'A realistic insecure support-agent project with dependency, API, AppSec, memory, tool, and guardrail gaps.', meta: 'Best demo' },
  { id: 'secured', label: 'Hardened baseline', title: 'Secured AI app', body: 'A safer version with pinned dependencies, auth, rate limits, approval gates, audit logs, and safe file/URL handling.', meta: 'Compare baseline' },
  { id: 'github', label: 'Public repository', title: 'GitHub repo scan', body: 'Paste a public GitHub repository URL. A-DAP-T downloads the repo ZIP and reads source files as text only.', meta: 'No execution' },
  { id: 'zip', label: 'Upload project', title: 'ZIP upload', body: 'Upload a local project ZIP with safe extraction limits for private demos and local experiments.', meta: '20 MB / 300 files' },
];

const policyOptions: Array<{ id: PolicyId; title: string; body: string; tag: string }> = [
  { id: 'general_ai_app', title: 'General AI App', body: 'Balanced policy for AI apps with APIs, dependencies, and basic guardrail expectations.', tag: 'Default' },
  { id: 'agent_with_tools', title: 'Agent with Tools', body: 'Stricter on tool allowlists, approval gates, audit logging, and external-effect actions.', tag: 'Agent' },
  { id: 'ai_coding_agent', title: 'AI Coding Agent', body: 'Harder checks for shell/code execution, repo changes, dependency drift, and sandboxing.', tag: 'Coding' },
  { id: 'customer_support_agent', title: 'Customer Support', body: 'Focuses on PII, email/refund/customer update paths, approvals, masking, and logs.', tag: 'Support' },
  { id: 'data_sensitive_app', title: 'Data-Sensitive App', body: 'Higher standard for PII masking, memory isolation, auditability, and dependency hygiene.', tag: 'PII' },
  { id: 'public_saas_api', title: 'Public SaaS API', body: 'Emphasizes endpoint auth, rate limiting, CORS, uploads, and request validation.', tag: 'API' },
];

export default function ScannerPage() {
  const router = useRouter();
  const [mode, setMode] = useState<ScanMode>('vulnerable');
  const [policyId, setPolicyId] = useState<PolicyId>('agent_with_tools');
  const [repoUrl, setRepoUrl] = useState('https://github.com/Dhruvg334/closira-smb-support-agent');
  const [branch, setBranch] = useState('main');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [saveReport, setSaveReport] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progressText, setProgressText] = useState('');

  async function runScan(event?: FormEvent) {
    event?.preventDefault();
    setError('');
    setLoading(true);
    setProgressText('Preparing project and policy context...');

    try {
      let report: ScanReport;
      const encodedPolicy = encodeURIComponent(policyId);
      if (mode === 'vulnerable') {
        setProgressText('Running vulnerable v3 demo scan...');
        report = await apiFetch<ScanReport>(`/scan/demo/vulnerable?save_report=${saveReport}&policy_id=${encodedPolicy}`);
      } else if (mode === 'secured') {
        setProgressText('Running secured v3 demo scan...');
        report = await apiFetch<ScanReport>(`/scan/demo/secured?save_report=${saveReport}&policy_id=${encodedPolicy}`);
      } else if (mode === 'github') {
        setProgressText('Downloading repository and building security surface map...');
        report = await apiFetch<ScanReport>('/scan/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo_url: repoUrl, branch, save_report: saveReport, policy_id: policyId }),
        });
      } else {
        if (!zipFile) throw new Error('Select a ZIP file first.');
        const formData = new FormData();
        formData.append('file', zipFile);
        formData.append('save_report', String(saveReport));
        formData.append('policy_id', policyId);
        setProgressText('Uploading ZIP and running v3 security assessment...');
        report = await apiFetch<ScanReport>(`/scan/upload?save_report=${saveReport}&policy_id=${encodedPolicy}`, { method: 'POST', body: formData });
      }
      setProgressText('Opening v3 report workspace...');
      saveCurrentReport(report);
      if (typeof pendo !== 'undefined') {
        pendo.track('scan_completed', {
          scan_mode: mode,
          policy_id: policyId,
          project_name: report.project_name || report.repo_name || '',
          safety_score: Number(report.safety_score ?? 0),
          v3_security_score: Number(report.v3_security_score ?? 0),
          policy_decision: report.policy_evaluation?.decision || '',
          findings_count: report.findings?.length || 0,
          appsec_risks_count: report.appsec_risks?.risks?.length || 0,
          api_risks_count: report.api_surface?.risks?.length || 0,
          dependency_risks_count: report.dependency_risks?.risks?.length || 0,
          save_report_enabled: saveReport,
        });
      }
      router.push('/report/current');
    } catch (err) {
      setError(formatApiError(err, 'Scan failed. Check the scan target and try again.'));
    } finally {
      setLoading(false);
    }
  }

  const selectedPolicy = policyOptions.find((policy) => policy.id === policyId);

  return (
    <AuthGate nextPath="/scanner" label="Checking access before opening the scan launcher...">
      <main className="page-shell scanner-v3-page">
        <div className="container">
          <div className="page-head centered">
            <div>
              <div className="tech-label page-kicker"><span className="pulse-dot" /> V3 SCAN LAUNCHER</div>
              <h1 className="page-title">Choose the project and release policy.</h1>
            </div>
            <p className="page-desc"><BrandWord /> checks source code, dependencies, API routes, AppSec sinks, memory/context risks, capabilities, guardrails, and policy before deployment.</p>
            <button className="btn btn-primary" onClick={() => runScan()} disabled={loading}>{loading ? 'Scanning...' : 'Run V3 Scan'}</button>
          </div>

          {error && <div className="form-error" style={{ marginBottom: 18 }}>{error}</div>}
          {loading && <div className="form-success" style={{ marginBottom: 18 }}>{progressText || 'Scanning...'}</div>}

          <section className="scan-grid scan-grid-v3">
            {scanOptions.map((option) => (
              <button key={option.id} className={`glass-card scan-card ${mode === option.id ? 'active shimmer' : ''}`} type="button" onClick={() => setMode(option.id)}>
                <div>
                  <div className="scan-icon"><Icon type={option.id} /></div>
                  <h3>{option.title}</h3>
                  <p>{option.body}</p>
                </div>
                <div className="scan-footer"><span className="pill neutral">{option.label}</span><span className="faint">{option.meta}</span></div>
              </button>
            ))}
          </section>

          <section className="glass-card panel policy-picker-panel">
            <div className="panel-head">
              <div><div className="panel-label">Policy pack</div><h2 className="panel-title">What standard should this project be judged against?</h2></div>
              <span className="pill neutral">{selectedPolicy?.tag}</span>
            </div>
            <div className="policy-card-grid">
              {policyOptions.map((policy) => (
                <button key={policy.id} type="button" className={`policy-card ${policyId === policy.id ? 'active' : ''}`} onClick={() => setPolicyId(policy.id)}>
                  <span className="pill neutral">{policy.tag}</span>
                  <strong>{policy.title}</strong>
                  <p>{policy.body}</p>
                </button>
              ))}
            </div>
          </section>

          <form className="glass-card panel scan-config-v3" onSubmit={runScan}>
            <div className="panel-head">
              <div><div className="panel-label">Scan configuration</div><h2 className="panel-title">{scanOptions.find((option) => option.id === mode)?.title}</h2></div>
              <label className="pill neutral" style={{ cursor: 'pointer' }}><input type="checkbox" checked={saveReport} onChange={(e) => setSaveReport(e.target.checked)} style={{ marginRight: 8 }} /> Save report</label>
            </div>

            {mode === 'github' && <div className="grid grid-2"><label className="form-row"><span className="form-label">Repository URL</span><input className="input" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/user/repo" /></label><label className="form-row"><span className="form-label">Branch</span><input className="input" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" /></label></div>}
            {mode === 'zip' && <label className="form-row"><span className="form-label">Project ZIP</span><input className="input" type="file" accept=".zip" onChange={(e) => setZipFile(e.target.files?.[0] || null)} /><span className="faint">ZIP limits are enforced by the backend. Uploaded code is never executed.</span></label>}

            <div className="scan-config-summary">
              <div><span>Security layers</span><strong>Dependencies · APIs · AppSec · Context · Capabilities · Guardrails</strong></div>
              <div><span>Selected policy</span><strong>{selectedPolicy?.title}</strong></div>
              <div><span>Execution model</span><strong>Static text scan. No project code execution.</strong></div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Running scan...' : 'Run Selected Scan'}</button>
              <span className="pill neutral">Scan → Map → Guardrails → Remedy → Policy</span>
            </div>
          </form>
        </div>
      </main>
    </AuthGate>
  );
}
