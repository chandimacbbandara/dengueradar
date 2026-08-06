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

  useEffect(() => {
    mohAPI.getDashboard()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async (zoneName) => {
    try {
      toast.success(`Exporting report for ${zoneName}...`);
      await mohAPI.exportZoneReport(zoneName);
      // In reality, this would trigger a file download blob
    } catch(e) {
      toast.error('Export failed');
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
            <h1 className="text-2xl font-bold">MOH Dashboard — {user?.district}</h1>
            <p className="text-muted mt-1">Officer: {user?.officerName}</p>
          </div>
          <Link to="/profile" className="btn btn-outline btn-sm">Settings</Link>
        </div>
      </div>

      <div className="dashboard-content flex flex-col gap-6">
        {/* Current weather for this officer's district */}
        <WeatherWidget district={user?.district} />

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
          <div className="card p-6">
            <h3 className="font-bold mb-6">Zone Risk Comparison</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer>
                <BarChart data={zoneChartData} margin={{top:0,right:0,left:-20,bottom:0}}>
                  <XAxis dataKey="name" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#0EA5A5" radius={[4,4,0,0]} name="Risk Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Zone trend — scoped to this officer's own district + zone */}
          <ZoneTrendChart />
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
                      <button onClick={() => handleExport(zone.name)} className="btn btn-sm btn-ghost">Export Report</button>
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
