import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import LiveStatsStrip from '../components/LiveStatsStrip.jsx';
import SharedMapCard from '../components/SharedMapCard.jsx';
import TrendChart from '../components/TrendChart.jsx';
import LiveTicker from '../components/LiveTicker.jsx';
import Icon from '../components/Icon.jsx';
import { publicAPI } from '../services/api.js';

function TopRiskCards({ topZones }) {
  if (!topZones || topZones.length === 0) return null;

  return (
    <section className="section" style={{ paddingTop: '20px', paddingBottom: '40px' }}>
      <div className="container">
        <h3 style={{ color: 'var(--color-text-primary)', fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>
          Top High-Risk Zones Right Now
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {topZones.map((zone, idx) => (
            <div key={idx} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{zone.mohZone}</span>
                <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--color-risk-high-bg)', color: 'var(--color-risk-high)', fontSize: '12px', fontWeight: 700 }}>
                  HIGH RISK
                </span>
              </div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>{zone.district} District</div>
              
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border-light)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>AI Risk Score</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{Math.round(zone.riskScore)}<span style={{fontSize:'14px', color:'var(--color-text-muted)'}}>/100</span></div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Forecast</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-primary)' }}>Escalating</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [riskData, setRiskData] = useState([]);
  const [trendData, setTrendData] = useState(null);
  const [topZones, setTopZones] = useState([]);
  const { t } = useTranslation();

  useEffect(() => {
    publicAPI.getTopZones()
      .then(res => setTopZones(res.data.data || []))
      .catch(console.error);

    publicAPI.getNationalRisk()
      .then(res => setRiskData(res.data.data || []))
      .catch(console.error);

    publicAPI.getNationalTrends()
      .then(res => setTrendData(res.data.data))
      .catch(console.error);
  }, []);

  return (
    <div style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>
      <Navbar />
      <LiveTicker riskData={riskData} />
      
      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="hero-inner" style={{ marginBottom: '40px' }}>
          <div className="hero-content">
            <div className="hero-tag animate-fadeInUp">
              <span className="dot dot-high animate-pulse" style={{ marginRight: '8px' }}></span> Live AI Monitoring Active
            </div>
            <h1 className="hero-title animate-fadeInUp" style={{animationDelay: '0.1s'}} dangerouslySetInnerHTML={{ __html: t('hero.title') }}></h1>
            <p className="hero-subtitle animate-fadeInUp" style={{animationDelay: '0.2s'}}>
              {t('hero.subtitle')}
            </p>
            <div className="hero-actions animate-fadeInUp" style={{animationDelay: '0.3s'}}>
              <a href="#map" className="btn btn-primary btn-lg">{t('hero.cta')} &rarr;</a>
              <Link to="/signup/general" className="btn btn-outline btn-lg">{t('hero.ctaSecondary')}</Link>
            </div>
          </div>
          <div className="hero-graphic animate-fadeIn">
            <div style={{ width: '100%', maxWidth: '460px' }}>
              <SharedMapCard riskData={riskData} title={t('map.title')} />
            </div>
          </div>
        </div>

        {/* Stats Strip Integrated directly into Hero bottom */}
        <div className="animate-fadeInUp" style={{animationDelay: '0.4s'}}>
          <LiveStatsStrip />
        </div>
      </section>

      {/* Dynamic Top High-Risk Zones */}
      <TopRiskCards topZones={topZones} />

      {/* Map Section */}
      <section id="map" className="map-section section">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="section-label">Live Monitoring</h2>
            <h3 className="section-title">Live District Risk Map</h3>
            <p className="section-subtitle" style={{margin:'0 auto'}}>
              Our AI models analyze weather data, historical cases, and population density to predict dengue outbreaks across Sri Lanka.
            </p>
          </div>
          <SharedMapCard riskData={riskData} title={t('map.title')} />
        </div>
      </section>

      {/* Trend Section */}
      <section id="trends" className="trend-section section">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="section-label">Forecast</h2>
            <h3 className="section-title">National Dengue Trend</h3>
            <p className="section-subtitle" style={{margin:'0 auto'}}>
              View historical case counts alongside our AI-predicted risk trends for the upcoming weeks.
            </p>
          </div>
          <div className="card p-6">
            <TrendChart data={trendData} />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="how-section section">
        <div className="container">
          <div className="text-center">
            <h2 className="section-label">Process</h2>
            <h3 className="section-title">How DengueRadar Works</h3>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-icon" style={{ color: 'var(--color-primary)' }}><Icon name="cloud-rain" size={32} /></div>
              <h4 className="step-title">Data Ingestion</h4>
              <p className="step-desc">We pull real-time weather and clinical data for all 25 districts.</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon" style={{ color: 'var(--color-primary)' }}><Icon name="cpu" size={32} /></div>
              <h4 className="step-title">AI Analysis</h4>
              <p className="step-desc">Our XGBoost models process the data to detect hidden risk patterns.</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon" style={{ color: 'var(--color-risk-moderate)' }}><Icon name="alert-triangle" size={32} /></div>
              <h4 className="step-title">Early Warning</h4>
              <p className="step-desc">If risk escalates, instant push alerts are triggered for MOH officers.</p>
            </div>
            <div className="step-card">
              <div className="step-number">4</div>
              <div className="step-icon" style={{ color: 'var(--color-risk-low)' }}><Icon name="shield" size={32} /></div>
              <h4 className="step-title">Prevention</h4>
              <p className="step-desc">Communities mobilize to destroy breeding sites before cases spike.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="who-section section">
        <div className="container">
          <div className="who-cards">
            <div className="who-card who-card-public card">
              <div className="who-card-icon"><Icon name="users" size={48} /></div>
              <h3>For Citizens</h3>
              <p>Check your local risk daily and eliminate mosquito breeding sites if your zone enters the Watch or Alert phases.</p>
              <Link to="/signup/general" className="btn btn-primary">Sign Up Free</Link>
            </div>
            <div className="who-card who-card-moh card" style={{ background: 'var(--color-primary)', color: 'white' }}>
              <div className="who-card-icon"><Icon name="stethoscope" size={48} /></div>
              <h3>For Health Officers</h3>
              <p style={{ color: 'rgba(255,255,255,0.85)' }}>Deploy limited resources with surgical precision. Let the AI tell you exactly which wards need fogging next week.</p>
              <Link to="/signup/moh-officer" className="btn" style={{ background: 'white', color: 'var(--color-primary)' }}>Register as Officer</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
