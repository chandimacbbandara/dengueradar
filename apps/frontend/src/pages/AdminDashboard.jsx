import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminAPI, authAPI } from '../services/api.js';
import { useAuthStore } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar.jsx';
import Icon from '../components/Icon.jsx';

/* ─── Stat card ─────────────────────────────────────────────────── */
function StatCard({ icon, label, value, loading }) {
  return (
    <div className="card p-6" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="text-sm font-bold text-muted uppercase tracking-wider flex items-center gap-2">
        <Icon name={icon} size={16} /> {label}
      </div>
      <div className="text-3xl font-bold text-primary">
        {loading ? '—' : (value ?? 0).toLocaleString()}
      </div>
    </div>
  );
}

/* ─── Risk badge ────────────────────────────────────────────────── */
function StatusBadge({ approved, active }) {
  if (!approved && active === false) return <span style={{ background:'var(--risk-high-bg)', color:'var(--risk-high)', fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'999px' }}>Rejected</span>;
  if (!approved) return <span style={{ background:'var(--risk-low-bg)', color:'var(--risk-low)', fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'999px' }}>Pending</span>;
  return <span style={{ background:'#D1FAE5', color:'#10B981', fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'999px' }}>Approved</span>;
}

/* ─── Officer row ───────────────────────────────────────────────── */
function OfficerRow({ officer, onApprove, onReject, onDelete, actionLoading }) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason]         = useState('');
  const busy = actionLoading === officer._id;

  return (
    <>
      <tr style={{ borderBottom: '1px solid var(--border)' }}>
        <td style={{ padding: '14px 16px' }}>
          <div style={{ fontWeight: 700, color: 'var(--text)' }}>{officer.officerName}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{officer.email}</div>
        </td>
        <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-2)' }}>
          {officer.district}
        </td>
        <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-2)' }}>
          {officer.mohZone}
        </td>
        <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-3)' }}>
          {officer.employeeId || '—'}
        </td>
        <td style={{ padding: '14px 16px' }}>
          <StatusBadge approved={officer.isApproved} active={officer.isActive} />
        </td>
        <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-3)' }}>
          {new Date(officer.createdAt).toLocaleDateString()}
        </td>
        <td style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {!officer.isApproved && (
              <button
                id={`approve-${officer._id}`}
                onClick={() => onApprove(officer._id)}
                disabled={busy}
                style={{
                  padding: '6px 14px', borderRadius: '8px', border: 'none',
                  background: '#10B981', color: '#fff', fontSize: '12px',
                  fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1,
                }}
              >
                {busy ? '…' : ' Approve'}
              </button>
            )}
            {officer.isApproved && (
              <button
                id={`revoke-${officer._id}`}
                onClick={() => setShowReject(v => !v)}
                disabled={busy}
                style={{
                  padding: '6px 14px', borderRadius: '8px', border: 'none',
                  background: 'var(--risk-low)', color: '#fff', fontSize: '12px',
                  fontWeight: 700, cursor: 'pointer',
                }}
              >
                Revoke
              </button>
            )}
            {!officer.isApproved && (
              <button
                id={`reject-${officer._id}`}
                onClick={() => setShowReject(v => !v)}
                disabled={busy}
                style={{
                  padding: '6px 14px', borderRadius: '8px',
                  border: '1px solid var(--risk-high)', background: 'transparent',
                  color: 'var(--risk-high)', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                ✗ Reject
              </button>
            )}
            <button
              id={`delete-${officer._id}`}
              onClick={() => onDelete(officer._id, officer.officerName)}
              disabled={busy}
              style={{
                padding: '6px 10px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-3)', fontSize: '12px', cursor: 'pointer',
              }}
            >
              🗑
            </button>
          </div>
        </td>
      </tr>

      {/* Inline reject reason input */}
      {showReject && (
        <tr style={{ background: 'var(--risk-high-bg)' }}>
          <td colSpan={7} style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Rejection reason (optional)"
                value={reason}
                onChange={e => setReason(e.target.value)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: '8px',
                  border: '1px solid var(--risk-high)', outline: 'none', fontSize: '13px',
                }}
              />
              <button
                onClick={() => { onReject(officer._id, reason); setShowReject(false); }}
                style={{ padding:'8px 16px', borderRadius:'8px', border:'none', background:'var(--risk-high)', color:'#fff', fontWeight:700, fontSize:'13px', cursor:'pointer' }}
              >Confirm Reject</button>
              <button
                onClick={() => setShowReject(false)}
                style={{ padding:'8px 16px', borderRadius:'8px', border:'1px solid var(--border)', background:'#fff', fontSize:'13px', cursor:'pointer' }}
              >Cancel</button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ─── Main admin dashboard ──────────────────────────────────────── */
export default function AdminDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [stats,    setStats]    = useState(null);
  const [officers, setOfficers] = useState([]);
  const [tab,      setTab]      = useState('pending');    // pending | approved | citizens
  const [citizens, setCitizens] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const loadStats = useCallback(() =>
    adminAPI.getDashboard().then(r => setStats(r.data.data)).catch(() => {}),
  []);

  const loadOfficers = useCallback((status) =>
    adminAPI.getOfficers(status).then(r => setOfficers(r.data.data)).catch(() => {}),
  []);

  const loadCitizens = useCallback(() =>
    adminAPI.getCitizens().then(r => setCitizens(r.data.data)).catch(() => {}),
  []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadStats(), loadOfficers(tab === 'citizens' ? 'all' : tab)])
      .finally(() => setLoading(false));
  }, [tab]); // eslint-disable-line

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await adminAPI.approveOfficer(id);
      toast.success('Officer approved!');
      loadOfficers(tab);
      loadStats();
    } catch { toast.error('Failed to approve'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async (id, reason) => {
    setActionLoading(id);
    try {
      await adminAPI.rejectOfficer(id, reason);
      toast.success('Application rejected');
      loadOfficers(tab);
      loadStats();
    } catch { toast.error('Failed to reject'); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return;
    setActionLoading(id);
    try {
      await adminAPI.deleteOfficer(id);
      toast.success('Officer removed');
      loadOfficers(tab);
      loadStats();
    } catch { toast.error('Failed to delete'); }
    finally { setActionLoading(null); }
  };

  return (
    <div className="dashboard-layout">
      <Navbar />

      <div className="dashboard-header">
        <div className="container flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted mt-1">Manage MOH officer approvals and platform users</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content flex flex-col gap-6">

        {/* ── Stats row ── */}
        <div className="grid-4">
          <StatCard icon="activity" label="Pending Approvals" value={stats?.pendingOfficers} loading={loading} />
          <StatCard icon="shield" label="Approved Officers" value={stats?.approvedOfficers} loading={loading} />
          <StatCard icon="vector" label="Registered Citizens" value={stats?.totalUsers} loading={loading} />
          <StatCard icon="alert" label="Total Cases (DB)"  value={stats?.totalCases} loading={loading} />
        </div>

        {/* ── Tab bar ── */}
        <div style={{
          display: 'flex', gap: '4px',
          background: 'var(--surface-2)', borderRadius: '12px', padding: '4px', width: 'fit-content',
        }}>
          {[
            { key: 'pending',  label: ` Pending${stats?.pendingOfficers > 0 ? ` (${stats.pendingOfficers})` : ''}` },
            { key: 'approved', label: ' Approved Officers' },
            { key: 'citizens', label: ' Citizens' },
          ].map(t => (
            <button
              key={t.key}
              id={`tab-${t.key}`}
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 20px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '13px', transition: 'all 0.2s',
                background: tab === t.key ? 'white' : 'transparent',
                color: tab === t.key ? 'var(--text)' : 'var(--text-2)',
                boxShadow: tab === t.key ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Officers table ── */}
        {tab !== 'citizens' && (
          <div className="card">
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                {tab === 'pending' ? 'Pending MOH Officer Applications' : 'Approved MOH Officers'}
              </h2>
            </div>

            {loading ? (
              <div className="loading-center"><div className="spinner"></div></div>
            ) : officers.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-2)', fontWeight: 600 }}>
                  {tab === 'pending' ? 'No pending applications right now.' : 'No approved officers yet.'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {['Officer', 'District', 'MOH Zone', 'Employee ID', 'Status', 'Applied', 'Actions'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {officers.map(o => (
                      <OfficerRow
                        key={o._id}
                        officer={o}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onDelete={handleDelete}
                        actionLoading={actionLoading}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Citizens table ── */}
        {tab === 'citizens' && (
          <div className="card">
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Registered Citizens</h2>
              <button
                onClick={loadCitizens}
                className="btn btn-sm btn-ghost"
              >
                ↻ Refresh
              </button>
            </div>

            {citizens.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-3)' }}>
                <button
                  onClick={loadCitizens}
                  className="btn btn-primary"
                >
                  Load Citizens
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {['Name', 'Email', 'District', 'MOH Zone', 'WhatsApp', 'Joined'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {citizens.map(c => (
                      <tr key={c._id}>
                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                          {c.firstName} {c.lastName}
                        </td>
                        <td>{c.email}</td>
                        <td>{c.district}</td>
                        <td>{c.mohZone}</td>
                        <td>{c.whatsappNumber || '—'}</td>
                        <td style={{ fontSize: '12px' }}>
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
