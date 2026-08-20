import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import WeatherWidget from '../components/WeatherWidget.jsx';
import ZoneTrendChart from '../components/ZoneTrendChart.jsx';
import { useAuthStore } from '../context/AuthContext.jsx';
import Footer from '../components/Footer.jsx';

export default function Dashboard() {
  const { user } = useAuthStore();

  return (
    <div className="dashboard-layout citizen-dashboard">
      <Navbar />

      {/* ── Page header ── */}
      <div className="dashboard-header" style={{ background: 'var(--surface-2)', padding: '32px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>Welcome back, {user?.firstName}!</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-2)' }}> {user?.mohZone}, {user?.district} District</p>
          </div>
          <Link to="/profile" className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }}>Edit Profile</Link>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="wrap" style={{ paddingTop: '32px', paddingBottom: '64px' }}>

        {/* Current weather for the user's district — hidden silently until API key activates */}
        <WeatherWidget district={user?.district} />

        {/* Zone-scoped dengue trend graph with Daily / Weekly / Monthly toggle */}
        <div className="card" style={{ padding: '24px', marginTop: '24px' }}>
          <ZoneTrendChart />
        </div>

      </div>
      <Footer />
    </div>
  );
}
