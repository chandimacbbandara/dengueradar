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
      <div className="dashboard-header" style={{ background: 'var(--color-bg-subtle)' }}>
        <div className="container flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Welcome back, {user?.firstName}!</h1>
            <p className="text-muted mt-1" style={{ color: 'var(--color-text-secondary)' }}> {user?.mohZone}, {user?.district} District</p>
          </div>
          <Link to="/profile" className="btn btn-outline btn-sm">Edit Profile</Link>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="dashboard-content" style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>

        {/* Current weather for the user's district — hidden silently until API key activates */}
        <WeatherWidget district={user?.district} />

        {/* Zone-scoped dengue trend graph with Daily / Weekly / Monthly toggle */}
        <div className="card p-6 mt-6">
          <ZoneTrendChart />
        </div>

      </div>
      <Footer />
    </div>
  );
}
