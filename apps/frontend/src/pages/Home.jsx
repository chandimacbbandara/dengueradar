import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import LiveStatsStrip from '../components/LiveStatsStrip.jsx';
import SriLankaMap from '../components/SriLankaMap.jsx';
import TrendChart from '../components/TrendChart.jsx';
import LiveTicker from '../components/LiveTicker.jsx';
import { publicAPI } from '../services/api.js';

function TopRiskCards({ riskData }) {
  if (!riskData || riskData.length === 0) return null;
  // Get top 3 highest risk scores
  const top3 = [...riskData]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 3);

  return (
    <section className="section" style={{ paddingTop: '20px', paddingBottom: '40px' }}>
      <div className="container">
        <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>
          🚨 Top High-Risk Zones Right Now
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {top3.map((zone, idx) => (
            <div key={idx} className="radar-glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{zone.mohZone}</span>
                <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', fontSize: '12px', fontWeight: 700 }}>
                  HIGH RISK
                </span>
              </div>
              <div style={{ fontSize: '14px', color: '#94A3B8' }}>{zone.district} District</div>
              
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px' }}>AI Risk Score</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#F8FAFC' }}>{Math.round(zone.riskScore)}<span style={{fontSize:'14px', color:'#64748B'}}>/100</span></div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px' }}>Forecast</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0EA5A5' }}>Escalating 📈</div>
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

  useEffect(() => {
    publicAPI.getNationalRisk()
      .then(res => setRiskData(res.data.data || []))
      .catch(console.error);

    publicAPI.getNationalTrends()
      .then(res => setTrendData(res.data.data))
      .catch(console.error);
  }, []);

  return (
    <div className="home-radar-theme">
      <Navbar />
      <LiveTicker riskData={riskData} />
      
      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="hero-inner">
          <div className="hero-content">
            <div className="hero-tag animate-fadeInUp" style={{ background: 'rgba(14, 165, 165, 0.2)', border: '1px solid rgba(14, 165, 165, 0.4)', color: '#0EA5A5' }}>
              <span className="dot dot-high" style={{ background: '#0EA5A5', boxShadow: '0 0 8px #0EA5A5' }}></span> Live AI Monitoring Active
            </div>
            <h1 className="hero-title animate-fadeInUp" style={{animationDelay: '0.1s'}}>
              Know Your Dengue Risk <br/> 
              <span style={{ color: '#0EA5A5' }} className="typing-text">Before It Spreads</span>
            </h1>
            <p className="hero-subtitle animate-fadeInUp" style={{animationDelay: '0.2s'}}>
              DengueRadar provides real-time dengue risk monitoring and alerts for Sri Lanka. Track risk by district, get WhatsApp alerts, and stay safe.
            </p>
            <div className="hero-actions animate-fadeInUp" style={{animationDelay: '0.3s'}}>
              <a href="#map" className="btn btn-primary btn-lg">Check Your Area &rarr;</a>
              <Link to="/signup/general" className="btn btn-outline btn-lg" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>Sign Up for Alerts</Link>
            </div>
          </div>
          <div className="hero-graphic animate-fadeIn">
            <div className="radar-glass-card" style={{ padding: '16px', height: '480px', width: '100%', maxWidth: '460px' }}>
              <SriLankaMap riskData={riskData} />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <LiveStatsStrip />

      {/* Top 3 Live Risk Cards */}
      <TopRiskCards riskData={riskData} />

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
          <div className="map-container">
            <SriLankaMap riskData={riskData} />
          </div>
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
              <div className="step-icon">📡</div>
              <h4 className="step-title">Data Collected</h4>
              <p className="step-desc">Epidemiology unit reports and live weather data are fed into our system continuously.</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon">🤖</div>
              <h4 className="step-title">AI Predicts Risk</h4>
              <p className="step-desc">Advanced ML models analyze the data to forecast high-risk areas before outbreaks happen.</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon">🔔</div>
              <h4 className="step-title">Alerts Sent</h4>
              <p className="step-desc">Registered users receive instant WhatsApp and web alerts when their area risk level changes.</p>
            </div>
            <div className="step-card">
              <div className="step-number">4</div>
              <div className="step-icon">🛡️</div>
              <h4 className="step-title">Community Acts</h4>
              <p className="step-desc">The public takes precautions and MOH officers deploy targeted prevention strategies.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="who-section section">
        <div className="container">
          <div className="who-cards">
            <div className="who-card who-card-public card">
              <div className="who-card-icon">👨‍👩‍👧‍👦</div>
              <h3>For the General Public</h3>
              <p>Protect your family. Get real-time alerts when dengue risk increases in your area and learn how to eliminate breeding sites.</p>
              <Link to="/signup/general" className="btn">Sign Up Free</Link>
            </div>
            <div className="who-card who-card-moh card">
              <div className="who-card-icon">🩺</div>
              <h3>For MOH Officers</h3>
              <p>Access advanced predictive analytics, manage your zone's risk profile, and export detailed reports to coordinate field responses.</p>
              <Link to="/signup/moh-officer" className="btn">Register as Officer</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <div className="footer-logo">🦟 Dengue<span>Radar</span></div>
              <p className="footer-tagline">Advanced AI-powered dengue risk monitoring and early warning system for Sri Lanka.</p>
            </div>
            <div className="footer-col">
              <h4>Platform</h4>
              <ul>
                <li><a href="#home">Home</a></li>
                <li><a href="#map">Live Map</a></li>
                <li><a href="#trends">Trends</a></li>
                <li><Link to="/login">Login</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <ul>
                <li><a href="#">Prevention Guide</a></li>
                <li><a href="#">MOH Portal</a></li>
                <li><a href="#">API Documentation</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Contact</h4>
              <ul>
                <li><a href="mailto:support@dengueradar.lk">support@dengueradar.lk</a></li>
                <li><a href="#">Emergency: 1999</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} DengueRadar Sri Lanka. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
