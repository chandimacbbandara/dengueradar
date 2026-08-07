import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import ZoneTrendChart from '../components/ZoneTrendChart.jsx';
import WeatherWidget from '../components/WeatherWidget.jsx';
import { useAuthStore } from '../context/AuthContext.jsx';
import { mohAPI } from '../services/api.js';
import toast from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function MohDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Default to the officer's own district, but allow changing it
  const [selectedDistrict, setSelectedDistrict] = useState(user?.district || 'Colombo');
  const [selectedZone, setSelectedZone] = useState(user?.mohZone || '');

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
    'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Moneragala', 
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
      link.setAttribute('download', `dengue_report_${zoneName.replace(/\\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Export downloaded!', { id: 'export' });
    } catch(e) {
      toast.error('Export failed', { id: 'export' });
    }
  };

  if (loading) {
    return <div className="dashboard-layout"><Navbar /><div className="loading-center" style={{marginTop:'100px'}}><div className="spinner"></div></div></div>;
  }

  // Prep data for charts
  const zoneChartData = data?.zones?.map(z => ({ name: z.name, score: z.riskScore })) || [];

  return (
    <div className="dashboard-layout">
      <Navbar />
      
      <div className="dashboard-header">
        <div className="container flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">MOH Dashboard</h1>
            <p className="text-muted mt-1">Officer: {user?.officerName}</p>
          </div>
          <Link to="/profile" className="btn btn-outline btn-sm">Settings</Link>
        </div>
      </div>

      <div className="dashboard-content flex flex-col gap-6">
        {/* Current weather for this selected district */}
        <WeatherWidget district={selectedDistrict} />

        {/* Stats Row */}
        <div className="grid-4">
          <div className="card p-6">
            <div className="text-sm font-bold text-muted uppercase tracking-wider mb-2">District Risk Level</div>
            <div className="text-3xl font-bold mb-2">
              <RiskBadge level={data?.districtRiskLevel || 'moderate'} className="text-base px-3 py-1" />
            </div>
          </div>
          <div className="card p-6">
            <div className="text-sm font-bold text-muted uppercase tracking-wider mb-2">Total Cases (Month)</div>
            <div className="text-3xl font-bold text-primary">{data?.totalCasesMonth || 0}</div>
          </div>
          <div className="card p-6">
            <div className="text-sm font-bold text-muted uppercase tracking-wider mb-2">Registered Citizens</div>
            <div className="text-3xl font-bold text-primary">{data?.registeredCitizens || 0}</div>
          </div>
          <div className="card p-6">
            <div className="text-sm font-bold text-muted uppercase tracking-wider mb-2">Zones Monitored</div>
            <div className="text-3xl font-bold text-primary">{data?.zones?.length || 0}</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid-2 gap-6">
          {/* Left Side: Region Filter Card */}
          <div className="card p-6" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 className="font-bold text-lg mb-2">🎯 Region & MOH Area Filter</h3>
                <p className="text-sm text-muted">Select a district and MOH area to load predictions.</p>
              </div>
              <button 
                onClick={handleReset}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '11px', padding: '6px 12px' }}
              >
                🔄 My Area
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="text-xs font-bold text-gray-500 uppercase">1. Select District</label>
                <select 
                  className="input" 
                  value={selectedDistrict} 
                  onChange={e => {
                    setSelectedDistrict(e.target.value);
                    setSelectedZone(''); // Reset zone when district changes
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}
                >
                  {DISTRICTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="text-xs font-bold text-gray-500 uppercase">2. Select MOH Area</label>
                <select
                  className="input"
                  value={selectedZone}
                  onChange={e => setSelectedZone(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}
                >
                  <option value="">-- Choose MOH Zone --</option>
                  {data?.zones?.map(z => (
                    <option key={z.name} value={z.name}>{z.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedZone && (
              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                <button 
                  onClick={() => handleExport(selectedZone)}
                  className="btn btn-primary w-full"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}
                >
                  📥 Download {selectedZone} Report
                </button>
              </div>
            )}
          </div>

          {/* Right Side: Zone trend — scoped to the selected district + zone */}
          <div>
            <ZoneTrendChart district={selectedDistrict} mohZone={selectedZone} />
          </div>
        </div>

        {/* Zones Table */}
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-6">MOH Zone Reports</h2>
          <div style={{overflowX: 'auto'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Zone Name</th>
                  <th>Risk Score</th>
                  <th>Risk Level</th>
                  <th>Recent Cases</th>
                  <th>Registered Users</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.zones?.map(zone => (
                  <tr key={zone.name}>
                    <td className="font-semibold text-gray-800">{zone.name}</td>
                    <td>{Math.round(zone.riskScore)}</td>
                    <td><RiskBadge level={zone.riskLevel} /></td>
                    <td>{zone.cases || 0}</td>
                    <td>{zone.users || 0}</td>
                    <td>
                      <button onClick={() => handleExport(zone.name)} className="btn btn-sm btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📥 Download Report
                      </button>
                    </td>
                  </tr>
                ))}
                {(!data?.zones || data.zones.length === 0) && (
                  <tr><td colSpan="6" className="text-center py-8">No zone data available.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
