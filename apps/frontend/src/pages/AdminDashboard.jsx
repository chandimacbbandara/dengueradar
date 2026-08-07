import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, authAPI } from '../services/api.js';
import { useAuthStore } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

/* ─── Stat card ─────────────────────────────────────────────────── */
function StatCard({ icon, label, value, color = '#0EA5A5', loading }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '16px', padding: '24px',
      boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
      display: 'flex', alignItems: 'center', gap: '16px',
    }}>
      <div style={{
        width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
        background: `${color}18`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '24px',
      }}>{icon}</div>
      <div>
        <p style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{label}</p>
        <p style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
          {loading ? '—' : (value ?? 0).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

/* ─── Risk badge ────────────────────────────────────────────────── */
function StatusBadge({ approved, active }) {
  if (!approved && active === false) return <span style={{ background:'#FEE2E2', color:'#EF4444', fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'999px' }}>Rejected</span>;
  if (!approved) return <span style={{ background:'#FEF3C7', color:'#D97706', fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'999px' }}>Pending</span>;
  return <span style={{ background:'#D1FAE5', color:'#10B981', fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'999px' }}>Approved</span>;
}

/* ─── Officer row ───────────────────────────────────────────────── */
function OfficerRow({ officer, onApprove, onReject, onDelete, actionLoading }) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason]         = useState('');
  const busy = actionLoading === officer._id;

  return (
    <>
      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
        <td style={{ padding: '14px 16px' }}>
          <div style={{ fontWeight: 700, color: '#0F172A' }}>{officer.officerName}</div>
          <div style={{ fontSize: '12px', color: '#94A3B8' }}>{officer.email}</div>
        </td>
        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>
          {officer.district}
        </td>
        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>
          {officer.mohZone}
        </td>
        <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748B' }}>
          {officer.employeeId || '—'}
        </td>
        <td style={{ padding: '14px 16px' }}>
          <StatusBadge approved={officer.isApproved} active={officer.isActive} />
        </td>
        <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94A3B8' }}>
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
                {busy ? '…' : '✅ Approve'}
              </button>
            )}
            {officer.isApproved && (
              <button
                id={`revoke-${officer._id}`}
                onClick={() => setShowReject(v => !v)}
                disabled={busy}
                style={{
                  padding: '6px 14px', borderRadius: '8px', border: 'none',
                  background: '#F59E0B', color: '#fff', fontSize: '12px',
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
                  border: '1px solid #EF4444', background: 'transparent',
                  color: '#EF4444', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
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
                border: '1px solid #e2e8f0', background: 'transparent',
                color: '#94A3B8', fontSize: '12px', cursor: 'pointer',
              }}
            >
              🗑
            </button>
          </div>
        </td>
      </tr>

      {/* Inline reject reason input */}
      {showReject && (
        <tr style={{ background: '#fff8f8' }}>
          <td colSpan={7} style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Rejection reason (optional)"
                value={reason}
                onChange={e => setReason(e.target.value)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: '8px',
                  border: '1px solid #fca5a5', outline: 'none', fontSize: '13px',
                }}
              />
              <button
                onClick={() => { onReject(officer._id, reason); setShowReject(false); }}
                style={{ padding:'8px 16px', borderRadius:'8px', border:'none', background:'#EF4444', color:'#fff', fontWeight:700, fontSize:'13px', cursor:'pointer' }}
              >Confirm Reject</button>
              <button
                onClick={() => setShowReject(false)}
                style={{ padding:'8px 16px', borderRadius:'8px', border:'1px solid #e2e8f0', background:'#fff', fontSize:'13px', cursor:'pointer' }}
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
  const { user, logout: storeLogout } = useAuthStore();
  const navigate = useNavigate();

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

  const handleLogout = async () => {
    await authAPI.logout().catch(() => {});
    storeLogout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

      {/* ── Top nav ── */}
      <nav style={{
        background: 'linear-gradient(135deg, #0d1f3c 0%, #0f2d4a 100%)',
        padding: '0 32px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '22px' }}>🦟</span>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '18px' }}>
            Dengue<span style={{ color: '#0EA5A5' }}>Radar</span>
          </span>
          <span style={{
            marginLeft: '8px', background: '#EF4444', color: '#fff',
            fontSize: '10px', fontWeight: 800, padding: '2px 10px',
            borderRadius: '999px', letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#94A3B8', fontSize: '13px' }}>{user?.email}</span>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent', color: '#cbd5e1',
              fontSize: '13px', cursor: 'pointer', fontWeight: 600,
            }}
          >
            Log out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Page title */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
            Admin Dashboard
          </h1>
          <p style={{ color: '#64748B', fontSize: '14px' }}>Manage MOH officer approvals and platform users</p>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <StatCard icon="⏳" label="Pending Approvals" value={stats?.pendingOfficers}  color="#F59E0B" loading={loading} />
          <StatCard icon="✅" label="Approved Officers" value={stats?.approvedOfficers} color="#10B981" loading={loading} />
          <StatCard icon="👥" label="Registered Citizens" value={stats?.totalUsers}    color="#0EA5A5" loading={loading} />
          <StatCard icon="📊" label="Total Cases (DB)"  value={stats?.totalCases}      color="#6366F1" loading={loading} />
        </div>

        {/* ── Tab bar ── */}
        <div style={{
          display: 'flex', gap: '4px', marginBottom: '20px',
          background: '#f1f5f9', borderRadius: '12px', padding: '4px', width: 'fit-content',
        }}>
          {[
            { key: 'pending',  label: `⏳ Pending${stats?.pendingOfficers > 0 ? ` (${stats.pendingOfficers})` : ''}` },
            { key: 'approved', label: '✅ Approved Officers' },
            { key: 'citizens', label: '👥 Citizens' },
          ].map(t => (
            <button
              key={t.key}
              id={`tab-${t.key}`}
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 20px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '13px', transition: 'all 0.2s',
                background: tab === t.key ? '#fff' : 'transparent',
                color: tab === t.key ? '#0F172A' : '#64748B',
                boxShadow: tab === t.key ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Officers table ── */}
        {tab !== 'citizens' && (
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                {tab === 'pending' ? 'Pending MOH Officer Applications' : 'Approved MOH Officers'}
              </h2>
            </div>

            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>Loading...</div>
            ) : officers.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>
                  {tab === 'pending' ? '🎉' : '📋'}
                </div>
                <p style={{ color: '#64748B', fontWeight: 600 }}>
                  {tab === 'pending' ? 'No pending applications right now.' : 'No approved officers yet.'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Officer', 'District', 'MOH Zone', 'Employee ID', 'Status', 'Applied', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {h}
                        </th>
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
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Registered Citizens</h2>
              <button
                onClick={loadCitizens}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: 600, color: '#475569' }}
              >
                ↻ Refresh
              </button>
            </div>

            {citizens.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                <button
                  onClick={loadCitizens}
                  style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: '#0EA5A5', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Load Citizens
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Name', 'Email', 'District', 'MOH Zone', 'WhatsApp', 'Joined'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {citizens.map(c => (
                      <tr key={c._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0F172A' }}>
                          {c.firstName} {c.lastName}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>{c.email}</td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>{c.district}</td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>{c.mohZone}</td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#94A3B8' }}>{c.whatsappNumber || '—'}</td>
                        <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94A3B8' }}>
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
