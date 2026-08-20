import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import WeatherWidget from '../components/WeatherWidget.jsx';
import ZoneTrendChart from '../components/ZoneTrendChart.jsx';
import CitizenRiskCard from '../components/citizen/CitizenRiskCard.jsx';
import LocalRiskMap from '../components/citizen/LocalRiskMap.jsx';
import RiskFactorsCard from '../components/citizen/RiskFactorsCard.jsx';
import WeeklySummaryCard from '../components/citizen/WeeklySummaryCard.jsx';
import CitizenAlerts from '../components/citizen/CitizenAlerts.jsx';
import PreventionChecklist from '../components/citizen/PreventionChecklist.jsx';
import RecommendedActions from '../components/citizen/RecommendedActions.jsx';
import { useAuthStore } from '../context/AuthContext.jsx';
import { userAPI, publicAPI, weatherAPI } from '../services/api.js';

export default function Dashboard() {
  const { user } = useAuthStore();
  
  const [data, setData] = useState({
    riskInfo: null,
    alerts: [],
    nationalRisk: [],
    weather: null,
    trendData: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    let isMounted = true;
    
    Promise.all([
      userAPI.getDashboard().catch(() => ({ data: { data: { riskInfo: null, alerts: [] } } })),
      publicAPI.getNationalRisk().catch(() => ({ data: { data: [] } })),
      weatherAPI.getDistrict(user.district).catch(() => ({ data: { data: null } })),
      userAPI.getZoneTrend('monthly', user.district, user.mohZone).catch(() => ({ data: { data: { trend: [] } } }))
    ]).then(([dashRes, natRes, weatherRes, trendRes]) => {
      if (isMounted) {
        setData({
          riskInfo: dashRes?.data?.data?.riskInfo || null,
          alerts: dashRes?.data?.data?.alerts || [],
          nationalRisk: natRes?.data?.data || [],
          weather: weatherRes?.data?.data || null,
          trendData: trendRes?.data?.data?.trend || []
        });
        setLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, [user]);

  const { riskInfo, alerts, nationalRisk, weather, trendData } = data;

  return (
    <div className="dashboard-layout citizen-dashboard" style={{ background: 'var(--color-bg)' }}>
      <Navbar />

      {/* ── Page header ── */}
      <div className="dashboard-header" style={{ background: 'var(--surface-2)', padding: '32px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>Welcome back, {user?.firstName}!</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>{user?.district} District • {user?.mohZone} MOH Zone</p>
          </div>
          <Link to="/profile" className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }}>Edit Profile</Link>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="wrap" style={{ paddingTop: '32px', paddingBottom: '64px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* TOP INTELLIGENCE ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <CitizenRiskCard riskInfo={riskInfo} district={user?.district} mohZone={user?.mohZone} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <WeatherWidget district={user?.district} weatherData={weather} loading={loading} />
          </div>
        </div>

        {/* RISK AROUND YOU */}
        <LocalRiskMap nationalRiskData={nationalRisk} district={user?.district} />

        {/* YOUR AREA DENGUE RISK TREND */}
        <ZoneTrendChart district={user?.district} mohZone={user?.mohZone} />

        {/* SECONDARY INTELLIGENCE */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <RiskFactorsCard riskInfo={riskInfo} weather={weather} />
          <WeeklySummaryCard riskInfo={riskInfo} trendData={trendData} weather={weather} />
        </div>

        {/* ALERTS */}
        {!loading && alerts.length > 0 && (
          <CitizenAlerts alerts={alerts} />
        )}

        {/* PREVENTION */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <RecommendedActions riskLevel={riskInfo?.riskLevel} />
          <PreventionChecklist />
        </div>

      </div>
      <Footer />
    </div>
  );
}
