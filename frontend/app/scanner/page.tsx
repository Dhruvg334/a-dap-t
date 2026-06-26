'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Archive, Github, ShieldCheck, ShieldX } from 'lucide-react';
import type { ScanReport } from '@/types/scan';
import { apiFetch, formatApiError } from '@/lib/api';
import { AuthGate } from '@/components/auth/AuthGate';
import { saveCurrentReport } from '@/lib/report-storage';
import { AdaptBadge, AdaptButton, InlineProgress, PageHeader, SectionTitle, StatTile } from '@/components/ui/AdaptUI';

type ScanMode = 'vulnerable' | 'secured' | 'github' | 'zip';
type PolicyId = 'general_ai_app' | 'agent_with_tools' | 'ai_coding_agent' | 'customer_support_agent' | 'data_sensitive_app' | 'public_saas_api';

const progressSteps = ['Prepare source', 'Inventory files', 'Map surfaces', 'Evaluate guardrails', 'Create report'];

const scanOptions: Array<{ id: ScanMode; title: string; label: string; body: string; meta: string; icon: any; tone: 'danger' | 'safe' | 'neutral' }> = [
  { id: 'vulnerable', title: 'Vulnerable Demo', label: 'Stress test', body: 'Run the intentionally vulnerable support-agent project to see weak APIs, missing approvals, memory risk, and guardrail failures.', meta: 'Fastest proof', icon: ShieldX, tone: 'danger' },
  { id: 'secured', title: 'Secured Demo', label: 'Baseline', body: 'Run the safer support-agent and compare how controls change the release decision and remedy plan.', meta: 'Control sample', icon: ShieldCheck, tone: 'safe' },
  { id: 'github', title: 'Public GitHub Repo', label: 'Repository', body: 'Paste a public GitHub URL. A-DAP-T downloads the repository ZIP and scans files as text only.', meta: 'No execution', icon: Github, tone: 'neutral' },
  { id: 'zip', title: 'ZIP Upload', label: 'Local project', body: 'Upload a project ZIP with safe extraction limits for local or private review workflows.', meta: '20 MB / 300 files', icon: Archive, tone: 'neutral' },
];

const policyOptions: Array<{ id: PolicyId; title: string; body: string; tag: string }> = [
  { id: 'general_ai_app', title: 'General AI App', body: 'Use for normal AI features with APIs, dependencies, and basic security controls.', tag: 'Default' },
  { id: 'agent_with_tools', title: 'Agent with Tools', body: 'Use when the app can call tools, update data, trigger workflows, or affect external systems.', tag: 'Agent' },
  { id: 'ai_coding_agent', title: 'AI Coding Agent', body: 'Use when the app reads or changes code, runs commands, manages repos, or touches dependencies.', tag: 'Coding' },
  { id: 'customer_support_agent', title: 'Customer Support Agent', body: 'Use for support flows with PII, refunds, account updates, or customer-facing actions.', tag: 'Support' },
  { id: 'data_sensitive_app', title: 'Data-Sensitive App', body: 'Use when memory, files, prompts, or APIs may contain PII, secrets, financial, or regulated data.', tag: 'PII' },
  { id: 'public_saas_api', title: 'Public SaaS API', body: 'Use for public endpoints where auth, rate limits, CORS, uploads, and validation matter most.', tag: 'API' },
];

function ScannerContent() {
  const router = useRouter();
  const [mode, setMode] = useState<ScanMode>('vulnerable');
  const [policyId, setPolicyId] = useState<PolicyId>('agent_with_tools');
  const [repoUrl, setRepoUrl] = useState('https://github.com/Dhruvg334/closira-smb-support-agent');
  const [branch, setBranch] = useState('main');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [saveReport, setSaveReport] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [error, setError] = useState('');
  const selectedSource = scanOptions.find((option) => option.id === mode)!;
  const selectedPolicy = policyOptions.find((policy) => policy.id === policyId)!;

  const sourcePreview = useMemo(() => {
    if (mode === 'vulnerable') return { score: '15', decision: 'BLOCK', note: 'Expect API, memory, guardrail, and AppSec risks.' };
    if (mode === 'secured') return { score: '84', decision: 'REVIEW', note: 'Expect visible auth, limits, approvals, logs, and allowlists.' };
    if (mode === 'github') return { score: '—', decision: 'Policy based', note: 'Public repo is downloaded as ZIP and scanned as text.' };
    return { score: '—', decision: 'Policy based', note: 'ZIP content is extracted safely and scanned as text.' };
  }, [mode]);

  async function runScan(event?: FormEvent) {
    event?.preventDefault();
    setError('');
    setLoading(true);
    setProgressIndex(0);

    const tick = setInterval(() => setProgressIndex((current) => Math.min(current + 1, progressSteps.length - 1)), 650);
    try {
      let report: ScanReport;
      const encodedPolicy = encodeURIComponent(policyId);
      if (mode === 'vulnerable') {
        report = await apiFetch<ScanReport>(`/scan/demo/vulnerable?save_report=${saveReport}&policy_id=${encodedPolicy}`);
      } else if (mode === 'secured') {
        report = await apiFetch<ScanReport>(`/scan/demo/secured?save_report=${saveReport}&policy_id=${encodedPolicy}`);
      } else if (mode === 'github') {
        if (!/^https:\/\/github\.com\/[^/]+\/[^/]+/i.test(repoUrl.trim())) throw new Error('Enter a valid public GitHub repository URL.');
        report = await apiFetch<ScanReport>('/scan/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo_url: repoUrl.trim(), branch: branch.trim() || undefined, save_report: saveReport, policy_id: policyId }),
        });
      } else {
        if (!zipFile) throw new Error('Select a ZIP file first.');
        const formData = new FormData();
        formData.append('file', zipFile);
        formData.append('save_report', String(saveReport));
        formData.append('policy_id', policyId);
        report = await apiFetch<ScanReport>(`/scan/upload?save_report=${saveReport}&policy_id=${encodedPolicy}`, { method: 'POST', body: formData });
      }
      setProgressIndex(progressSteps.length - 1);
      saveCurrentReport(report);
      if (typeof pendo !== 'undefined') {
        pendo.track('scan_completed', {
          scan_mode: mode,
          policy_id: policyId,
          project_name: report.project_name || report.repo_name || '',
          safety_score: Number(report.safety_score ?? 0),
          v3_security_score: Number(report.v3_security_score ?? 0),
          policy_decision: report.policy_evaluation?.decision || '',
          save_report_enabled: saveReport,
        });
      }
      router.push('/report/current');
    } catch (err) {
      setError(formatApiError(err, 'Scan failed. Check the scan target and try again.'));
    } finally {
      clearInterval(tick);
      setLoading(false);
    }
  }

  return (
    <main className="adapt-page scanner-workspace">
      <div className="adapt-container">
        <PageHeader label="Scan launcher" title="Start a security review" actions={<AdaptButton tone="primary" onClick={() => runScan()} disabled={loading}>{loading ? 'Running…' : 'Run Scan'}</AdaptButton>}>
          Choose a project source, select a release policy, and run a static review across dependencies, APIs, capabilities, guardrails, and remedy planning.
        </PageHeader>

        {error ? <div className="adapt-alert danger"><AlertTriangle size={18} />{error}</div> : null}
        {loading ? <div className="adapt-panel scan-progress-panel"><InlineProgress steps={progressSteps} activeIndex={progressIndex} /><p>Running static review. Project code is not executed.</p></div> : null}

        <div className="scanner-grid">
          <section className="scanner-main">
            <SectionTitle label="Source" title="Choose scan source">Demo scans are the fastest way to understand the report flow. GitHub and ZIP scans use the same review pipeline.</SectionTitle>
            <div className="source-card-grid">
              {scanOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button key={option.id} type="button" className={`adapt-card source-choice ${mode === option.id ? 'selected' : ''} ${option.tone}`} onClick={() => setMode(option.id)}>
                    <div className="source-choice-top"><Icon size={20} /><AdaptBadge tone={option.tone === 'danger' ? 'danger' : option.tone === 'safe' ? 'safe' : 'neutral'}>{option.label}</AdaptBadge></div>
                    <h3>{option.title}</h3>
                    <p>{option.body}</p>
                    <small>{option.meta}</small>
                  </button>
                );
              })}
            </div>

            <section className="adapt-panel dynamic-input-panel">
              <div className="input-panel-head">
                <div>
                  <div className="adapt-kicker"><span />Input</div>
                  <h2>{selectedSource.title}</h2>
                  <p>{selectedSource.body}</p>
                </div>
                <AdaptBadge tone={sourcePreview.decision === 'BLOCK' ? 'danger' : sourcePreview.decision === 'REVIEW' ? 'warning' : 'neutral'}>{sourcePreview.decision}</AdaptBadge>
              </div>
              {mode === 'github' ? (
                <div className="form-two-col">
                  <label className="adapt-field"><span>Repository URL</span><input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/user/repo" /></label>
                  <label className="adapt-field"><span>Branch</span><input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" /></label>
                </div>
              ) : null}
              {mode === 'zip' ? (
                <label className={`upload-dropzone ${zipFile ? 'has-file' : ''}`}>
                  <Archive size={22} />
                  <span>{zipFile ? zipFile.name : 'Drop a project ZIP or browse'}</span>
                  <input type="file" accept=".zip" onChange={(e) => setZipFile(e.target.files?.[0] || null)} />
                  <small>Only source text is scanned. Project code is not executed.</small>
                </label>
              ) : null}
              {mode === 'vulnerable' || mode === 'secured' ? (
                <div className="demo-preview-strip">
                  <StatTile label="Expected score" value={sourcePreview.score} tone={mode === 'vulnerable' ? 'danger' : 'safe'} />
                  <StatTile label="Policy signal" value={sourcePreview.decision} tone={sourcePreview.decision === 'BLOCK' ? 'danger' : 'warning'} />
                  <div className="adapt-note">{sourcePreview.note}</div>
                </div>
              ) : null}
            </section>
          </section>

          <aside className="scanner-side adapt-panel">
            <SectionTitle label="Policy" title="Select release policy" />
            <div className="policy-selector-list">
              {policyOptions.map((policy) => (
                <button key={policy.id} type="button" className={`policy-choice ${policyId === policy.id ? 'selected' : ''}`} onClick={() => setPolicyId(policy.id)}>
                  <span>{policy.tag}</span>
                  <strong>{policy.title}</strong>
                  <small>{policy.body}</small>
                </button>
              ))}
            </div>
            <div className="scan-summary-box">
              <div><span>Source</span><strong>{selectedSource.title}</strong></div>
              <div><span>Policy</span><strong>{selectedPolicy.title}</strong></div>
              <div><span>Execution</span><strong>Static text scan</strong></div>
              <label className="save-toggle"><input type="checkbox" checked={saveReport} onChange={(e) => setSaveReport(e.target.checked)} /><span>Save report to profile</span></label>
            </div>
            <AdaptButton tone="primary" onClick={() => runScan()} disabled={loading}>{loading ? 'Running review…' : 'Run Scan'}</AdaptButton>
            <AdaptButton tone="secondary" href="/methodology">View Methodology</AdaptButton>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function ScannerPage() {
  return <AuthGate nextPath="/scanner" label="Checking access before opening the scan launcher..."><ScannerContent /></AuthGate>;
}
