import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import ZoneTrendChart from '../components/ZoneTrendChart.jsx';
import WeatherWidget from '../components/WeatherWidget.jsx';
import { useAuthStore } from '../context/AuthContext.jsx';
import { mohAPI, publicAPI } from '../services/api.js';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import SharedMapCard from '../components/SharedMapCard.jsx';
import Icon from '../components/Icon.jsx';

export default function MohDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  
  const [selectedDistrict, setSelectedDistrict] = useState(user?.district || 'Colombo');
  const [selectedZone, setSelectedZone] = useState(user?.mohZone || '');
  const [nationalRiskData, setNationalRiskData] = useState([]);

  useEffect(() => {
    publicAPI.getNationalRisk()
      .then(res => setNationalRiskData(res.data.data || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    mohAPI.getDashboard(selectedDistrict)
      .then(res => {
        const dashboardData = res.data?.data;
        setData(dashboardData);
        if (dashboardData?.zones?.length > 0) {
          const hasZone = dashboardData.zones.some(z => z.name === selectedZone);
          if (!hasZone) {
            setSelectedZone(dashboardData.zones[0].name);
          }
        } else {
          setSelectedZone('');
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedDistrict]);

  const handleReset = () => {
    setSelectedDistrict(user?.district || 'Colombo');
    setSelectedZone(user?.mohZone || '');
  };

  const DISTRICTS = [
    'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 
    'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 
    'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala', 
    'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura', 
    'Trincomalee', 'Vavuniya'
  ];

  const handleExport = async (zoneName) => {
    try {
      toast.loading(`Exporting report for ${zoneName}...`, { id: 'export' });
      const response = await mohAPI.exportZoneReport(zoneName);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dengue_report_${zoneName.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Export downloaded!', { id: 'export' });
    } catch(e) {
      toast.error('Export failed', { id: 'export' });
    }
  };

  const handleSendAlert = async (zoneName) => {
    try {
      toast.loading(`Sending alerts to citizens in ${zoneName}...`, { id: 'notify' });
      const res = await mohAPI.notifyZone(zoneName);
      toast.success(res.data.message || 'Alert sent!', { id: 'notify' });
    } catch(e) {
      toast.error('Failed to send alert', { id: 'notify' });
    }
  };

  if (loading) {
    return <div className="dashboard-layout"><Navbar /><div className="loading-center" style={{marginTop:'100px'}}><div className="spinner"></div></div></div>;
  }

  const selectedZoneData = selectedZone ? data?.zones?.find(z => z.name === selectedZone) : null;
  const displayRiskLevel = selectedZoneData ? selectedZoneData.riskLevel : data?.districtRiskLevel;
  const displayCases = selectedZoneData ? selectedZoneData.cases : data?.totalCasesMonth;
  const displayUsers = selectedZoneData ? selectedZoneData.users : data?.registeredCitizens;
  const displayZonesCount = selectedZoneData ? 1 : data?.zones?.length;
  const areaLabel = selectedZoneData ? 'Zone' : 'District';

  return (
    <>
      <Navbar />
      <div className="dashboard-layout" style={{ minHeight: 'calc(100vh - 68px)', display: 'flex', flexDirection: 'column' }}>
        
        {/* Sleek Hero Header */}
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '24px 0' }}>
          <div className="wrap-wide" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <span className="dot dot-high" style={{ animation: 'pulse 2s infinite', background: 'var(--brand)', boxShadow: '0 0 12px var(--brand)' }}></span>
                <span style={{ fontSize: '11px', color: 'var(--brand)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Live System Active</span>
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)' }}>MOH Command Center</h1>
              <p style={{ color: 'var(--text-2)', fontSize: '14px', marginTop: '4px' }}>Officer ID: <span style={{color: 'var(--text)', fontWeight: 600}}>{user?.officerName}</span></p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link to="/profile" className="btn" style={{ padding: '8px 16px' }}><Icon name="settings" size={16} /> Settings</Link>
            </div>
          </div>
        </div>

        {/* Main Grid: Sidebar + Content */}
        <div className="wrap-wide" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', padding: '32px 28px', alignItems: 'start' }}>
          
          {/* LEFT SIDEBAR: Control Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '92px' }}>
            
            {/* Filter Panel */}
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Region Control</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>Target a specific area</p>
                </div>
                <button onClick={handleReset} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', color: 'var(--text-2)', cursor: 'pointer' }}>Reset</button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>District</label>
                  <select 
                    className="form-input" 
                    value={selectedDistrict} 
                    onChange={e => {
                      setSelectedDistrict(e.target.value);
                      setSelectedZone('');
                    }}
                  >
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MOH Area</label>
                  <select
                    className="form-input"
                    value={selectedZone}
                    onChange={e => setSelectedZone(e.target.value)}
                  >
                    <option value="">-- All Areas --</option>
                    {data?.zones?.map(z => <option key={z.name} value={z.name}>{z.name}</option>)}
                  </select>
                </div>
              </div>

              {selectedZone && (
                <div style={{ marginTop: '8px', paddingTop: '20px', borderTop: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button 
                    onClick={() => handleExport(selectedZone)}
                    className="btn"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Icon name="download" size={16} /> Export Report
                  </button>
                  <button 
                    onClick={() => handleSendAlert(selectedZone)}
                    className="btn primary"
                    style={{ width: '100%', justifyContent: 'center', background: 'var(--risk-crit)', borderColor: 'var(--risk-crit)' }}
                  >
                    <Icon name="bell" size={16} /> Broadcast Alert
                  </button>
                </div>
              )}
            </div>

            {/* Weather Component */}
            <div className="card">
              <WeatherWidget district={selectedDistrict} />
            </div>

          </div>

          {/* RIGHT SIDE: Main Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
            
            {/* Top Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}><Icon name="alert-triangle" size={14}/> {areaLabel} Risk</div>
                <div><RiskBadge level={displayRiskLevel || 'moderate'} className="text-base px-3 py-1" /></div>
              </div>
              <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}><Icon name="activity" size={14}/> Active Cases</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{displayCases || 0}</div>
              </div>
              <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}><Icon name="map-pin" size={14}/> Zones Active</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{displayZonesCount || 0}</div>
              </div>
              <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}><Icon name="users" size={14}/> Citizens</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{displayUsers || 0}</div>
              </div>
            </div>

            {/* Map and Chart */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
              <SharedMapCard riskData={nationalRiskData} title={`${selectedDistrict} Map`} selectedDistrict={selectedDistrict}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>{selectedDistrict} Overview</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.5' }}>
                    Currently monitoring {data?.zones?.length || 0} MOH zones in the {selectedDistrict} district.
                  </p>
                </div>
              </SharedMapCard>
              <div className="card" style={{ padding: '20px' }}>
                <ZoneTrendChart district={selectedDistrict} mohZone={selectedZone} />
              </div>
            </div>

            {/* Zones Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Zone Reports Overview</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)' }}>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Zone Name</th>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Predicted</th>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Risk Level</th>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Recent</th>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Citizens</th>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.zones?.map(zone => (
                      <tr key={zone.name} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s ease' }} onMouseEnter={e => e.currentTarget.style.background='var(--surface-2)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{zone.name}</td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 700, color: 'var(--brand)' }}>{Math.round(zone.predictedCases || 0)}</td>
                        <td style={{ padding: '16px 20px' }}><RiskBadge level={zone.riskLevel} /></td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-2)' }}>{zone.cases || 0}</td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-2)' }}>{zone.users || 0}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <button onClick={() => handleExport(zone.name)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }} onMouseEnter={e => e.currentTarget.style.color='var(--text)'} onMouseLeave={e => e.currentTarget.style.color='var(--text-3)'}>
                            <Icon name="download" size={14} /> Download
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!data?.zones || data.zones.length === 0) && (
                      <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)' }}>No zone data available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
