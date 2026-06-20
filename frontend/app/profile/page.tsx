'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, formatApiError } from '@/lib/api';
import { getAuthState } from '@/lib/auth';
import { AuthGate } from '@/components/auth/AuthGate';
import { saveCurrentReport } from '@/lib/report-storage';
import { TrendsChart } from '@/components/profile/TrendsChart';
import { FolderPlus, MoreVertical, Move, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import type { ScanReport } from '@/types/scan';

type ReportSummary = ScanReport & {
  id?: string;
  created_at?: string;
  timestamp?: string;
  upload_name?: string;
};

interface ReportGroup {
  id: string;
  name: string;
  reportIds: string[];
}

function formatDate(value?: string | null) {
  if (!value) return 'Recently saved';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently saved';
  return date.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
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

  // Groups State
  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>('all');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    const auth = getAuthState();
    setEmail(auth?.email || 'A-DAP-T user');

    // Load groups from localStorage
    const savedGroups = localStorage.getItem(`adpt_groups_${auth?.uid || 'anon'}`);
    if (savedGroups) {
      try { setGroups(JSON.parse(savedGroups)); } catch (e) { console.error("Failed to load groups", e); }
    }

    apiFetch<ReportSummary[]>('/reports')
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch((err) => setError(formatApiError(err, 'Could not load reports.')))
      .finally(() => setLoading(false));
  }, []);

  // Save groups whenever they change
  useEffect(() => {
    const auth = getAuthState();
    if (auth?.uid && groups.length > 0) {
      localStorage.setItem(`adpt_groups_${auth.uid}`, JSON.stringify(groups));
    }
  }, [groups]);

  // Logic: Organize reports into their groups
  const organizedData = useMemo(() => {
    const groupedMap: Record<string, ReportSummary[]> = {};
    const groupedReportIds = new Set(groups.flatMap(g => g.reportIds));

    // Reports not in any manual group
    const ungrouped = reports.filter(r => !groupedReportIds.has(getReportId(r) || ''));

    groups.forEach(group => {
      groupedMap[group.id] = reports.filter(r => group.reportIds.includes(getReportId(r) || ''));
    });

    return { ungrouped, groupedMap };
  }, [reports, groups]);

  // Logic: Filtering for the Trends Chart
  const reportsForChart = useMemo(() => {
    if (activeGroupId === 'all') return reports;
    if (activeGroupId === 'ungrouped') return organizedData.ungrouped;
    return organizedData.groupedMap[activeGroupId] || [];
  }, [activeGroupId, reports, organizedData]);

  // Group Actions
  const createGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: ReportGroup = {
      id: `group_${Date.now()}`,
      name: newGroupName,
      reportIds: []
    };
    setGroups([...groups, newGroup]);
    setNewGroupName('');
    setIsCreatingGroup(false);
    setNotice(`Group "${newGroup.name}" created.`);
  };

  const deleteGroup = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    if (window.confirm(`Delete group "${group.name}"? Reports will be moved to Ungrouped.`)) {
      setGroups(groups.filter(g => g.id !== groupId));
      if (activeGroupId === groupId) setActiveGroupId('all');
    }
  };

  const renameGroup = (groupId: string, newName: string) => {
    setGroups(groups.map(g => g.id === groupId ? { ...g, name: newName } : g));
  };

  const moveReportToGroup = (reportId: string, targetGroupId: string | null) => {
    const nextGroups = groups.map(group => {
      // Remove from current group if it's there
      const filteredIds = group.reportIds.filter(id => id !== reportId);
      // Add to target group if matches
      if (group.id === targetGroupId) {
        return { ...group, reportIds: [...filteredIds, reportId] };
      }
      return { ...group, reportIds: filteredIds };
    });
    setGroups(nextGroups);
    setNotice('Report moved.');
  };

  async function openReport(report: ReportSummary) {
    const id = getReportId(report);
    setError(''); setNotice('');
    setOpeningId(id || `${report.project_name}`);
    try {
      const full = id ? await apiFetch<ScanReport>(`/reports/${encodeURIComponent(id)}`) : report;
      saveCurrentReport(full);
      router.push('/report/current');
    } catch (err) { setError(formatApiError(err)); }
    finally { setOpeningId(null); }
  }

  async function deleteReport(report: ReportSummary) {
    const id = getReportId(report);
    if (!id || !window.confirm(`Delete from history?`)) return;
    setDeletingId(id);
    try {
      await apiFetch(`/reports/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setReports(current => current.filter(r => getReportId(r) !== id));
      // Also clean up from groups
      setGroups(groups.map(g => ({ ...g, reportIds: g.reportIds.filter(rid => rid !== id) })));
    } catch (err) { setError(formatApiError(err)); }
    finally { setDeletingId(null); }
  }

  return (
    <main className="page-shell">
      <div className="container">
        <div className="page-head split">
          <div>
            <div className="tech-label page-kicker"><span className="pulse-dot" /> PROFILE</div>
            <h1 className="page-title">Workspace management.</h1>
            <p className="page-desc">Organize your security scans into custom directory groups to track progress across different environments or projects.</p>
          </div>
          <div className="hero-actions">
             <button className="btn btn-secondary" onClick={() => setIsCreatingGroup(true)}>
              <FolderPlus size={16} style={{marginRight: 8}} /> New Group
            </button>
            <Link className="btn btn-primary" href="/scanner">Run New Scan</Link>
          </div>
        </div>

        {/* Stats Row */}
        <section className="profile-summary-grid" style={{ marginBottom: 24 }}>
          <div className="solid-card stat profile-identity-card">
            <div className="profile-avatar">DG</div>
            <div><div className="stat-label">Account</div><div className="profile-email">{email}</div></div>
          </div>
          <div className="solid-card stat shimmer"><div className="stat-value">{groups.length}</div><div className="stat-label">Custom Groups</div></div>
          <div className="solid-card stat"><div className="stat-value">{reports.length}</div><div className="stat-label">Total Reports</div></div>
          <div className="solid-card stat"><div className="stat-value">{organizedData.ungrouped.length}</div><div className="stat-label">Ungrouped</div></div>
        </section>

        {/* Creating Group Modal Overlay */}
        {isCreatingGroup && (
          <div className="modal-overlay">
            <div className="solid-card panel shimmer" style={{ width: '400px' }}>
              <div className="panel-label">ORGANIZATION</div>
              <h2 className="panel-title">Create Directory Group</h2>
              <div className="form-stack" style={{ marginTop: 18 }}>
                <input className="input" placeholder="e.g. Production Agents, Q3 Audit..." value={newGroupName} onChange={e => setNewGroupName(e.target.value)} autoFocus />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary" onClick={createGroup}>Create</button>
                  <button className="btn btn-secondary" onClick={() => setIsCreatingGroup(false)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trends Section with Group Selector */}
        {reports.length > 0 && (
          <section className="solid-card panel" style={{ marginBottom: '2rem' }}>
            <div className="panel-head">
              <div>
                <div className="tech-label"><span className="pulse-dot" /> PROGRESS TRENDS</div>
                <h2 className="panel-title">Progress Visualization</h2>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span className="tech-label">View for:</span>
                <select
                  className="btn btn-secondary btn-small"
                  style={{ background: '#0b100e', textTransform: 'none' }}
                  value={activeGroupId}
                  onChange={(e) => setActiveGroupId(e.target.value)}
                >
                  <option value="all">All Reports</option>
                  <option value="ungrouped">Ungrouped Only</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ height: '300px', marginTop: 12 }}>
              <TrendsChart reports={reportsForChart} groupBy="none" />
            </div>
          </section>
        )}

        {notice && <div className="form-success" style={{marginBottom: 18}}>{notice}</div>}
        {error && <div className="form-error" style={{marginBottom: 18}}>{error}</div>}

        {/* Grouped Reports Display */}
        {groups.map(group => (
          <section key={group.id} className="group-container" style={{ marginBottom: 32 }}>
            <div className="section-strip">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h2 className="section-title compact-title" style={{ color: 'var(--emerald)' }}>{group.name}</h2>
                <span className="pill neutral">{organizedData.groupedMap[group.id]?.length || 0} reports</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-small" onClick={() => {
                  const n = prompt("Rename group:", group.name);
                  if (n) renameGroup(group.id, n);
                }}><Edit2 size={12} /></button>
                <button className="btn btn-secondary btn-small" onClick={() => deleteGroup(group.id)}><Trash2 size={12} /></button>
              </div>
            </div>
            <div className="grid grid-2">
              {(organizedData.groupedMap[group.id] || []).map(report => (
                <ReportCard
                  key={getReportId(report)}
                  report={report}
                  groups={groups}
                  currentGroupId={group.id}
                  onMove={moveReportToGroup}
                  onOpen={openReport}
                  onDelete={deleteReport}
                  isOpening={openingId === getReportId(report)}
                  isDeleting={deletingId === getReportId(report)}
                />
              ))}
              {organizedData.groupedMap[group.id]?.length === 0 && (
                <div className="notice" style={{ gridColumn: 'span 2' }}>This group is empty. Move reports here from the Ungrouped section.</div>
              )}
            </div>
          </section>
        ))}

        {/* Ungrouped Reports */}
        <section className="group-container">
          <div className="section-strip">
            <h2 className="section-title compact-title">Ungrouped Reports</h2>
            <p className="muted">Scans that haven't been assigned to a directory yet.</p>
          </div>
          <div className="grid grid-2">
            {organizedData.ungrouped.map(report => (
              <ReportCard
                key={getReportId(report)}
                report={report}
                groups={groups}
                currentGroupId={null}
                onMove={moveReportToGroup}
                onOpen={openReport}
                onDelete={deleteReport}
                isOpening={openingId === getReportId(report)}
                isDeleting={deletingId === getReportId(report)}
              />
            ))}
            {!loading && organizedData.ungrouped.length === 0 && groups.length > 0 && (
              <div className="notice" style={{ gridColumn: 'span 2' }}>All reports are organized into groups.</div>
            )}
            {!loading && reports.length === 0 && (
              <div className="notice" style={{ gridColumn: 'span 2' }}>No reports found. Start by running a scan.</div>
            )}
          </div>
        </section>
      </div>

      <style jsx>{`
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 100; display: grid; place-items: center; }
        .section-strip { border-bottom: 1px solid var(--border-soft); padding-bottom: 12px; margin-bottom: 18px; }
        .group-container { background: rgba(255,255,255,0.02); padding: 24px; border-radius: 24px; border: 1px solid var(--border-soft); }
      `}</style>
    </main>
  );
}

function ReportCard({ report, groups, currentGroupId, onMove, onOpen, onDelete, isOpening, isDeleting }: any) {
  const id = getReportId(report);
  const title = report.project_name || report.repo_name || 'Saved report';

  return (
    <article className="solid-card panel report-history-card">
      <div className="report-card-topline">
        <span className="panel-label">{report.scan_type || 'scan'}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            className="pill neutral"
            style={{ cursor: 'pointer', appearance: 'none', paddingRight: '20px' }}
            value={currentGroupId || ''}
            onChange={(e) => onMove(id, e.target.value || null)}
          >
            <option value="">Move to Group...</option>
            {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
            {currentGroupId && <option value="">Ungroup</option>}
          </select>
          <span className={`pill ${decisionClass(report.deployment_gate?.decision)}`}>{report.deployment_gate?.decision || 'Saved'}</span>
        </div>
      </div>
      <div className="report-card-main">
        <div>
          <h3 className="panel-title">{title}</h3>
          <p className="muted">{formatDate(report.created_at || report.timestamp)}</p>
        </div>
        <div className="report-score-orb">
          <strong>{report.safety_score ?? '—'}</strong>
          <span>score</span>
        </div>
      </div>
      <div className="report-card-actions">
        <button className="btn btn-primary btn-small" onClick={() => onOpen(report)} disabled={isOpening || isDeleting}>
          {isOpening ? '...' : 'View'}
        </button>
        <button className="btn btn-danger btn-small" onClick={() => onDelete(report)} disabled={isOpening || isDeleting}>
          {isDeleting ? '...' : 'Delete'}
        </button>
      </div>
    </article>
  );
}

export default function ProfilePage() {
  return (
    <AuthGate nextPath="/profile" label="Checking access before opening saved reports...">
      <ProfileContent />
    </AuthGate>
  );
}
