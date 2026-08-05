import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import { useAuthStore } from '../context/AuthContext.jsx';
import { userAPI } from '../services/api.js';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userAPI.getDashboard()
      .then(res => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="dashboard-layout"><Navbar /><div className="loading-center" style={{marginTop:'100px'}}><div className="spinner"></div></div></div>;
  }

  const risk = data?.riskInfo;
  const riskMsg = risk?.riskLevel === 'high' ? 'Your area is at HIGH dengue risk. Take immediate precautions!' :
                  risk?.riskLevel === 'moderate' ? 'Your area is at moderate dengue risk this week. Stay alert.' :
                  'Your area is currently at low risk. Keep breeding sites clear.';

  return (
    <div className="dashboard-layout">
      <Navbar />
      
      <div className="dashboard-header">
        <div className="container flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user?.firstName}!</h1>
            <p className="text-muted mt-1">📍 {user?.mohZone}, {user?.district} District</p>
          </div>
          <Link to="/profile" className="btn btn-outline btn-sm">Edit Profile</Link>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-grid">
          {/* Left Col - Status */}
          <div className="flex flex-col gap-6">
            <div className="card p-6 text-center">
              <h2 className="text-sm font-bold text-muted uppercase tracking-wider mb-6">Current Risk Level</h2>
              
              {risk ? (
                <>
                  <div className={`risk-circle ${risk.riskLevel}`}>
                    <div className="risk-circle-score">{Math.round(risk.riskScore)}</div>
                    <div className="risk-circle-label">Score</div>
                  </div>
                  <RiskBadge level={risk.riskLevel} className="mb-4 text-sm px-4 py-1" />
                  <p className="text-sm font-medium mt-2">{riskMsg}</p>
                  <div className="text-xs text-muted mt-4">Predicted for: {new Date(risk.predictedFor).toLocaleDateString()}</div>
                </>
              ) : (
                <div className="py-8 text-muted">No risk data available for your area yet.</div>
              )}
            </div>

            <div className="card p-6">
              <h3 className="font-bold mb-4">Quick Prevention Tips</h3>
              <ul className="flex flex-col gap-4 text-sm">
                <li className="flex gap-3"><span className="text-xl">🗑️</span> Empty, cover, or dispose of items that hold water.</li>
                <li className="flex gap-3"><span className="text-xl">👕</span> Wear long-sleeved shirts and long pants outdoors.</li>
                <li className="flex gap-3"><span className="text-xl">🦟</span> Use mosquito repellent and mosquito nets.</li>
              </ul>
            </div>
          </div>

          {/* Right Col - Alerts */}
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-6">Recent Alerts</h2>
            
            {data?.alerts?.length > 0 ? (
              <div style={{overflowX: 'auto'}}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Channel</th>
                      <th>Risk Level</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.alerts.map(alert => (
                      <tr key={alert._id}>
                        <td>{new Date(alert.sentAt).toLocaleString()}</td>
                        <td>{alert.channel === 'whatsapp' ? '📱 WhatsApp' : '🌐 Web'}</td>
                        <td><RiskBadge level={alert.riskLevel} /></td>
                        <td>
                          <span style={{
                            fontSize:'12px', fontWeight:700,
                            padding:'2px 10px', borderRadius:'999px',
                            background: alert.status === 'sent' ? 'var(--color-risk-low-bg)' : 'var(--color-risk-high-bg)',
                            color: alert.status === 'sent' ? 'var(--color-risk-low)' : 'var(--color-risk-high)'
                          }}>
                            {alert.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12" style={{background:'var(--color-bg-subtle)', borderRadius:'var(--radius-lg)'}}>
                <p className="text-muted">No recent alerts sent.</p>
                <p className="text-sm text-muted mt-2">You will receive an alert if the risk level in {user?.mohZone} increases.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
