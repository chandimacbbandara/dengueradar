import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api.js';
import { useAuthStore } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar.jsx';
import Icon from '../components/Icon.jsx';

/* ─── CSV Export Utility ────────────────────────────────────────── */
function exportToCSV(filename, rows) {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows.map(row => {
      return keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(separator);
    }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/* ─── Glassmorphic Stat Card ────────────────────────────────────── */
function StatCard({ icon, label, value, loading, gradient }) {
  return (
    <div className="card" style={{ 
      padding: '24px', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '12px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '100px', height: '100px',
        background: gradient, opacity: 0.1, filter: 'blur(40px)', borderRadius: '50%',
        transform: 'translate(30%, -30%)'
      }}></div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ 
          width: '40px', height: '40px', borderRadius: '12px', 
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)'
        }}>
          <Icon name={icon} size={20} />
        </div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </div>
      </div>
      <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text)', marginTop: '8px' }}>
        {loading ? <span style={{ opacity: 0.5 }}>—</span> : (value ?? 0).toLocaleString()}
      </div>
    </div>
  );
}

/* ─── Premium Status Badge ──────────────────────────────────────── */
function StatusBadge({ approved, active }) {
  if (!approved && active === false) {
    return (
      <div style={{ 
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: 'var(--risk-high-bg)', color: 'var(--risk-high)', 
        fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '999px',
        border: '1px solid rgba(239, 68, 68, 0.2)'
      }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></div>
        Rejected
      </div>
    );
  }
  if (!approved) {
    return (
      <div style={{ 
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: 'var(--risk-mod-bg)', color: 'var(--risk-mod)', 
        fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '999px',
        border: '1px solid rgba(245, 158, 11, 0.2)'
      }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', animation: 'pulse 2s infinite' }}></div>
        Pending
      </div>
    );
  }
  return (
    <div style={{ 
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', 
      fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '999px',
      border: '1px solid rgba(16, 185, 129, 0.2)'
    }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></div>
      Approved
    </div>
  );
}

/* ─── Modern Officer Row ────────────────────────────────────────── */
function OfficerRow({ officer, onApprove, onReject, onDelete, actionLoading }) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason]         = useState('');
  const busy = actionLoading === officer._id;

  return (
    <>
      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } }}>
        <td style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '36px', height: '36px', borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--teal), var(--blue))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: '14px'
            }}>
              {officer.officerName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '14px' }}>{officer.officerName}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{officer.email}</div>
            </div>
          </div>
        </td>
        <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-2)' }}>
          {officer.district}
        </td>
        <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-2)' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px', display: 'inline-block' }}>
            {officer.mohZone}
          </div>
        </td>
        <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-3)' }}>
          {officer.employeeId || '—'}
        </td>
        <td style={{ padding: '16px 20px' }}>
          <StatusBadge approved={officer.isApproved} active={officer.isActive} />
        </td>
        <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-3)' }}>
          {new Date(officer.createdAt).toLocaleDateString()}
        </td>
        <td style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!officer.isApproved && officer.isActive !== false && (
              <>
                <button
                  onClick={() => onApprove(officer._id)}
                  disabled={busy}
                  style={{
                    padding: '8px', borderRadius: '8px', border: 'none',
                    background: 'rgba(16, 185, 129, 0.1)', color: '#10B981',
                    cursor: 'pointer', opacity: busy ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  title="Approve"
                >
                  <Icon name="check" size={16} />
                </button>
                <button
                  onClick={() => setShowReject(v => !v)}
                  disabled={busy}
                  style={{
                    padding: '8px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: 'rgba(239, 68, 68, 0.05)', color: 'var(--risk-high)',
                    cursor: 'pointer', opacity: busy ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  title="Reject"
                >
                  <Icon name="x" size={16} />
                </button>
              </>
            )}
            {officer.isApproved && (
              <button
                onClick={() => setShowReject(v => !v)}
                disabled={busy}
                style={{
                  padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)',
                  background: 'rgba(245, 158, 11, 0.05)', color: 'var(--risk-mod)', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', opacity: busy ? 0.6 : 1,
                }}
              >
                Revoke
              </button>
            )}
            <button
              onClick={() => onDelete(officer._id, officer.officerName)}
              disabled={busy}
              style={{
                padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent',
                color: 'var(--text-3)', cursor: 'pointer', opacity: busy ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'color 0.2s'
              }}
              title="Delete"
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--risk-high)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-3)'}
            >
              <Icon name="trash-2" size={16} />
            </button>
          </div>
        </td>
      </tr>

      {/* Inline reject reason input */}
      {showReject && (
        <tr style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
          <td colSpan={7} style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--surface-1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
              <Icon name="alert-circle" size={20} color="var(--risk-high)" />
              <input
                type="text"
                placeholder="Rejection reason (optional)"
                value={reason}
                onChange={e => setReason(e.target.value)}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', 
                  outline: 'none', fontSize: '14px', color: 'var(--text)'
                }}
                autoFocus
              />
              <button
                onClick={() => { onReject(officer._id, reason); setShowReject(false); }}
                style={{ padding:'10px 20px', borderRadius:'8px', border:'none', background:'var(--risk-high)', color:'#fff', fontWeight:700, fontSize:'13px', cursor:'pointer' }}
              >Confirm Reject</button>
              <button
                onClick={() => setShowReject(false)}
                style={{ padding:'10px 20px', borderRadius:'8px', border:'1px solid var(--border)', background:'transparent', color: 'var(--text)', fontWeight: 600, fontSize:'13px', cursor:'pointer' }}
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

  const [stats,    setStats]    = useState(null);
  const [officers, setOfficers] = useState([]);
  const [tab,      setTab]      = useState('pending');    // pending | approved | citizens
  const [citizens, setCitizens] = useState([]);
  
  const [loading,  setLoading]  = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  
  // Search and Pagination states
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
    setSearchQuery('');
    setCurrentPage(1);
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

  // Filter Data
  const filteredData = useMemo(() => {
    let data = tab === 'citizens' ? citizens : officers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(item => {
        if (tab === 'citizens') {
          return item.firstName?.toLowerCase().includes(q) || 
                 item.lastName?.toLowerCase().includes(q) || 
                 item.email?.toLowerCase().includes(q) || 
                 item.district?.toLowerCase().includes(q);
        } else {
          return item.officerName?.toLowerCase().includes(q) || 
                 item.email?.toLowerCase().includes(q) || 
                 item.district?.toLowerCase().includes(q) ||
                 item.employeeId?.toLowerCase().includes(q);
        }
      });
    }
    return data;
  }, [tab, officers, citizens, searchQuery]);

  // Pagination Data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);
  
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleExport = () => {
    if (tab === 'citizens') {
      const exportData = filteredData.map(c => ({
        Name: `${c.firstName} ${c.lastName}`,
        Email: c.email,
        District: c.district,
        'MOH Zone': c.mohZone,
        WhatsApp: c.whatsappNumber || '',
        Joined: new Date(c.createdAt).toLocaleDateString()
      }));
      exportToCSV('citizens_export.csv', exportData);
    } else {
      const exportData = filteredData.map(o => ({
        OfficerName: o.officerName,
        Email: o.email,
        District: o.district,
        'MOH Zone': o.mohZone,
        EmployeeID: o.employeeId || '',
        Status: o.isApproved ? 'Approved' : (o.isActive === false ? 'Rejected' : 'Pending'),
        AppliedOn: new Date(o.createdAt).toLocaleDateString()
      }));
      exportToCSV('officers_export.csv', exportData);
    }
  };

  return (
    <div className="dashboard-layout">
      <Navbar />

      <div className="dashboard-header" style={{ background: 'var(--surface-2)', padding: '40px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(14, 165, 165, 0.1)', color: 'var(--teal)', borderRadius: '999px', fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>
              <Icon name="shield-check" size={16} /> Admin Portal
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.5px' }}>Platform Dashboard</h1>
            <p style={{ fontSize: '15px', color: 'var(--text-2)' }}>Manage MOH officers, platform users, and monitor system statistics.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
             <div style={{ background: 'var(--surface-1)', padding: '12px 24px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>System Time</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
             </div>
          </div>
        </div>
      </div>

      <div className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingTop: '32px', paddingBottom: '64px' }}>

        {/* ── Stats row ── */}
        <div className="grid-4">
          <StatCard icon="clock" label="Pending Approvals" value={stats?.pendingOfficers} loading={loading} gradient="var(--risk-mod)" />
          <StatCard icon="shield-check" label="Approved Officers" value={stats?.approvedOfficers} loading={loading} gradient="var(--teal)" />
          <StatCard icon="users" label="Registered Citizens" value={stats?.totalUsers} loading={loading} gradient="var(--blue)" />
          <StatCard icon="activity" label="Total Cases (DB)"  value={stats?.totalCases} loading={loading} gradient="var(--risk-high)" />
        </div>

        {/* ── Controls Row ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Tab bar */}
          <div style={{
            display: 'flex', gap: '4px',
            background: 'var(--surface-2)', borderRadius: '12px', padding: '6px', width: 'fit-content',
            border: '1px solid rgba(255,255,255,0.04)'
          }}>
            {[
              { key: 'pending',  label: 'Pending', badge: stats?.pendingOfficers, icon: 'clock' },
              { key: 'approved', label: 'Approved Officers', icon: 'shield-check' },
              { key: 'citizens', label: 'Citizens', icon: 'users' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: '14px', transition: 'all 0.2s',
                  background: tab === t.key ? 'var(--brand)' : 'transparent',
                  color: tab === t.key ? '#fff' : 'var(--text-2)',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <Icon name={t.icon} size={16} />
                {t.label}
                {t.badge > 0 && (
                  <span style={{ 
                    background: tab === t.key ? 'rgba(255,255,255,0.2)' : 'var(--risk-high)', 
                    color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 
                  }}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Search Bar */}
            <div style={{ position: 'relative', width: '280px' }}>
              <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }}>
                <Icon name="search" size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Search by name, email, district..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                style={{
                  width: '100%', padding: '12px 16px 12px 42px', borderRadius: '12px',
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '14px', outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--brand)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            
            {/* Export Button */}
            <button 
              onClick={handleExport}
              disabled={filteredData.length === 0}
              style={{
                padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--border)',
                background: 'var(--surface-2)', color: 'var(--text)', fontWeight: 600, fontSize: '14px',
                cursor: filteredData.length > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px',
                opacity: filteredData.length > 0 ? 1 : 0.5, transition: 'all 0.2s'
              }}
              onMouseEnter={e => { if(filteredData.length > 0) e.currentTarget.style.background = 'var(--surface-3)'}}
              onMouseLeave={e => { if(filteredData.length > 0) e.currentTarget.style.background = 'var(--surface-2)'}}
            >
              <Icon name="download" size={18} /> Export CSV
            </button>
          </div>

        </div>

        {/* ── Data Table ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
              {tab === 'pending' ? 'Pending Applications' : tab === 'approved' ? 'Approved Officers' : 'Registered Citizens'}
            </h2>
            <div style={{ fontSize: '14px', color: 'var(--text-3)' }}>
              Showing {filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} records
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '80px 0', display: 'flex', justifyContent: 'center' }}>
               <div className="spinner" style={{ width: '40px', height: '40px', borderTopColor: 'var(--brand)' }}></div>
            </div>
          ) : filteredData.length === 0 ? (
            <div style={{ padding: '80px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', marginBottom: '16px' }}>
                <Icon name="search-x" size={32} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>No records found</h3>
              <p style={{ color: 'var(--text-2)' }}>
                {searchQuery ? 'Try adjusting your search query.' : (tab === 'pending' ? 'No pending applications right now.' : 'No records available.')}
              </p>
              {tab === 'citizens' && !searchQuery && (
                <button onClick={loadCitizens} className="btn btn-primary" style={{ marginTop: '24px' }}>Load Citizens</button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {(tab === 'citizens' ? 
                      ['Citizen Info', 'Location', 'WhatsApp', 'Joined'] : 
                      ['Officer Info', 'District', 'MOH Zone', 'Employee ID', 'Status', 'Applied', 'Actions']
                    ).map((h, i) => (
                      <th key={h} style={{ 
                        padding: '16px 20px', fontSize: '12px', textTransform: 'uppercase', 
                        letterSpacing: '0.5px', color: 'var(--text-3)', fontWeight: 700 
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tab === 'citizens' ? (
                    paginatedData.map(c => (
                      <tr key={c._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } }}>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ 
                              width: '36px', height: '36px', borderRadius: '50%', 
                              background: 'var(--surface-2)', border: '1px solid var(--border)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'var(--text-2)', fontWeight: 700, fontSize: '14px'
                            }}>
                              {c.firstName?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '14px' }}>{c.firstName} {c.lastName}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{c.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-2)' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{c.district}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{c.mohZone}</div>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-2)' }}>
                          {c.whatsappNumber ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Icon name="phone" size={14} color="#10B981" /> {c.whatsappNumber}
                            </div>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-3)' }}>
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    paginatedData.map(o => (
                      <OfficerRow
                        key={o._id}
                        officer={o}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onDelete={handleDelete}
                        actionLoading={actionLoading}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)',
                  color: currentPage === 1 ? 'var(--text-3)' : 'var(--text)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <Icon name="chevron-left" size={18} />
              </button>
              
              <div style={{ display: 'flex', gap: '6px' }}>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx + 1)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px', border: 'none',
                      background: currentPage === idx + 1 ? 'var(--brand)' : 'transparent',
                      color: currentPage === idx + 1 ? '#fff' : 'var(--text-2)',
                      fontWeight: 600, fontSize: '14px', cursor: 'pointer'
                    }}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)',
                  color: currentPage === totalPages ? 'var(--text-3)' : 'var(--text)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <Icon name="chevron-right" size={18} />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
