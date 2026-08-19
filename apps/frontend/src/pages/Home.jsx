import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import SharedMapCard from '../components/SharedMapCard.jsx';
import TrendChart from '../components/TrendChart.jsx';
import { publicAPI } from '../services/api.js';

export default function Home() {
  const [riskData, setRiskData] = useState([]);
  const [trendData, setTrendData] = useState(null);
  const [topZones, setTopZones] = useState([]);

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
    <>
      <Navbar />

      <section className="hero" id="home">
        <div className="wrap">
          <div className="eyebrow"><span className="pulse"></span> SYSTEM ONLINE</div>
          <h1 className="display">Dengue Intelligence Center</h1>
          <p className="sub">Real-time dengue risk monitoring and AI-powered early warning for Sri Lanka — built on live case reports, weather telemetry, and district-level forecasting.</p>
          <div className="status-row">
            <div className="status-chip"><span className="dot"></span> Live Data <b>&nbsp;Updated just now</b></div>
            <div className="status-chip">Prediction Model <b>&nbsp;v2.3 · Updated 6h ago</b></div>
            <div className="status-chip">Weather Feed <b>&nbsp;Connected</b></div>
            <div className="status-chip">Coverage <b>&nbsp;25 / 25 Districts</b></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="kpi-grid">
            <div className="kpi"><div className="spectrum"></div>
              <div className="kpi-top">
                <div className="kpi-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s-8-5.5-8-12a8 8 0 0116 0c0 6.5-8 12-8 12z"/></svg>
                </div>
                <div className="kpi-trend up">▲ 4.2%</div>
              </div>
              <div className="kpi-value">1,284</div>
              <div className="kpi-label">Current Dengue Cases</div>
              <svg className="spark" viewBox="0 0 100 28" preserveAspectRatio="none"><polyline points="0,20 15,18 30,15 45,17 60,10 75,12 90,4 100,6" fill="none" stroke="var(--risk-high)" strokeWidth="2"/></svg>
              <div className="kpi-updated">UPDATED 2 MIN AGO</div>
            </div>
            
            <div className="kpi"><div className="spectrum"></div>
              <div className="kpi-top">
                <div className="kpi-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                </div>
                <div className="kpi-trend up">▲ 2 districts</div>
              </div>
              <div className="kpi-value">{topZones.length || 6}</div>
              <div className="kpi-label">High-Risk Districts</div>
              <svg className="spark" viewBox="0 0 100 28" preserveAspectRatio="none"><polyline points="0,22 20,20 40,14 60,16 80,8 100,6" fill="none" stroke="var(--risk-crit)" strokeWidth="2"/></svg>
              <div className="kpi-updated">UPDATED 6 MIN AGO</div>
            </div>
            
            <div className="kpi"><div className="spectrum"></div>
              <div className="kpi-top">
                <div className="kpi-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                </div>
                <div className="kpi-trend flat">— stable</div>
              </div>
              <div className="kpi-value">MODERATE</div>
              <div className="kpi-label">National Risk Level</div>
              <svg className="spark" viewBox="0 0 100 28" preserveAspectRatio="none"><polyline points="0,14 20,15 40,13 60,14 80,15 100,14" fill="none" stroke="var(--risk-mod)" strokeWidth="2"/></svg>
              <div className="kpi-updated">UPDATED 6 MIN AGO</div>
            </div>
            
            <div className="kpi"><div className="spectrum"></div>
              <div className="kpi-top">
                <div className="kpi-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                </div>
                <div className="kpi-trend up">▲ next 14d</div>
              </div>
              <div className="kpi-value">HIGH</div>
              <div className="kpi-label">AI Predicted Risk</div>
              <svg className="spark" viewBox="0 0 100 28" preserveAspectRatio="none"><polyline points="0,20 20,17 40,18 60,10 80,9 100,3" fill="none" stroke="var(--risk-high)" strokeWidth="2"/></svg>
              <div className="kpi-updated">MODEL RUN 6H AGO</div>
            </div>
            
            <div className="kpi"><div className="spectrum"></div>
              <div className="kpi-top">
                <div className="kpi-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 16.2A4.5 4.5 0 0017.5 8h-1.8A7 7 0 104 14.9"/><path d="M12 12v9M9 18l3 3 3-3"/></svg>
                </div>
                <div className="kpi-trend up">▲ rainfall</div>
              </div>
              <div className="kpi-value">ELEVATED</div>
              <div className="kpi-label">Weather Risk Factor</div>
              <svg className="spark" viewBox="0 0 100 28" preserveAspectRatio="none"><polyline points="0,24 20,20 40,22 60,10 80,14 100,6" fill="none" stroke="var(--risk-mod)" strokeWidth="2"/></svg>
              <div className="kpi-updated">UPDATED 12 MIN AGO</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="map">
        <div className="wrap">
          <div className="main-grid">
            <div className="panel">
              <div className="panel-head">
                <h3>National Dengue Risk Map</h3>
                <div className="section-actions">
                  <button className="btn">Fullscreen</button>
                  <button className="btn primary">Refresh</button>
                </div>
              </div>
              <div className="map-wrap" id="mapArea">
                <div className="map-controls">
                  <div className="glass-panel search-box">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>
                    <input placeholder="Search district…" />
                  </div>
                  <div className="filter-group">
                    <div className="glass-panel">
                      <select className="filter-select" style={{background:'none', border:'none', color:'var(--text-2)'}}>
                        <option>All Risk Levels</option><option>Low</option><option>Moderate</option><option>High</option><option>Critical</option>
                      </select>
                    </div>
                    <div className="glass-panel">
                      <select className="filter-select" style={{background:'none', border:'none', color:'var(--text-2)'}}>
                        <option>Prediction: 7 days</option><option>14 days</option><option>30 days</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Embed existing React map */}
                <SharedMapCard riskData={riskData} title="" />

                <div className="map-legend glass-panel" style={{flexDirection:'column', alignItems:'flex-start', padding:'12px 14px'}}>
                  <div style={{fontSize:'10.5px', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:'6px'}}>Risk Legend</div>
                  <div className="legend-row"><span className="legend-swatch" style={{background:'var(--risk-low)'}}></span> Low Risk</div>
                  <div className="legend-row"><span className="legend-swatch" style={{background:'var(--risk-mod)'}}></span> Moderate Risk</div>
                  <div className="legend-row"><span className="legend-swatch" style={{background:'var(--risk-high)'}}></span> High Risk</div>
                  <div className="legend-row"><span className="legend-swatch" style={{background:'var(--risk-crit)'}}></span> Very High Risk</div>
                </div>
                <div className="map-corner-actions">
                  <button className="icon-btn" title="Reset view" style={{background:'var(--glass)'}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head"><h3>AI Risk Intelligence</h3><span className="risk-badge moderate">Confidence 82%</span></div>
              <div className="panel-body">
                <div className="intel-row"><span className="intel-label">National Risk</span><span className="risk-badge moderate">Moderate</span></div>
                <div className="intel-row"><span className="intel-label">Highest-Risk District</span><span className="intel-value">{topZones[0]?.district || 'Colombo'}</span></div>
                <div className="intel-row"><span className="intel-label">Predicted Risk (14d)</span><span className="risk-badge high">High</span></div>
                <div className="intel-row"><span className="intel-label">Prediction Horizon</span><span className="intel-value mono" style={{fontSize:'12px'}}>14 days</span></div>
                <div style={{marginTop:'14px'}}>
                  <div style={{fontSize:'11px', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:'8px'}}>Contributing Factors</div>
                  <div className="factor-tags">
                    <span className="factor-tag"><span className="arrow-up">▲</span> Rainfall</span>
                    <span className="factor-tag"><span className="arrow-up">▲</span> Humidity</span>
                    <span className="factor-tag"><span className="arrow-up">▲</span> Recent Cases</span>
                    <span className="factor-tag"><span className="arrow-down">▼</span> Temperature</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="forecast">
        <div className="wrap">
          <div className="section-head">
            <div><h2>Dengue Risk Forecast</h2><div className="desc">Historical cases vs. AI-forecasted risk — 14-day horizon</div></div>
            <div className="section-actions"><button className="btn">Export</button></div>
          </div>
          <div className="panel"><div className="panel-body"><div className="chart-box">
            <TrendChart data={trendData} />
          </div></div></div>
        </div>
      </section>

      <section className="section" id="weather">
        <div className="wrap">
          <div className="two-col">
            <div className="panel">
              <div className="panel-head"><h3>Weather Intelligence</h3><span className="mono" style={{fontSize:'10.5px', color:'var(--text-3)'}}>UPDATED 12 MIN AGO</span></div>
              <div className="panel-body">
                <div className="weather-hero">
                  <div><div className="weather-loc">Colombo</div><div className="weather-temp">28°C</div></div>
                  <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.6"><path d="M8 19a5 5 0 01-1-9.9A6 6 0 0118 8a4.5 4.5 0 011 8.9"/><path d="M8 19h9"/></svg>
                </div>
                <div className="weather-stats">
                  <div className="weather-stat"><div className="v">82%</div><div className="l">Humidity</div></div>
                  <div className="weather-stat"><div className="v">14mm</div><div className="l">Rainfall</div></div>
                  <div className="weather-stat"><div className="v">11km/h</div><div className="l">Wind</div></div>
                </div>
              </div>
            </div>
            
            <div className="panel" id="alerts">
              <div className="panel-head"><h3>Alert Center</h3><span className="risk-badge high">3 Active</span></div>
              <div className="panel-body">
                <div className="alert"><span className="alert-dot" style={{background:'var(--risk-crit)'}}></span>
                  <div><div className="alert-title">High-risk district detected</div><div className="alert-meta">Colombo · 18 min ago</div><div className="alert-desc">Case density crossed the high-risk threshold this week.</div></div>
                </div>
                <div className="alert"><span className="alert-dot" style={{background:'var(--risk-high)'}}></span>
                  <div><div className="alert-title">Risk increasing</div><div className="alert-meta">Gampaha · 1h ago</div><div className="alert-desc">Predicted risk moved from Moderate to High over 14 days.</div></div>
                </div>
                <div className="alert"><span className="alert-dot" style={{background:'var(--risk-mod)'}}></span>
                  <div><div className="alert-title">Heavy rainfall conditions</div><div className="alert-meta">Kalutara · 3h ago</div><div className="alert-desc">Rainfall 40% above seasonal average, breeding risk elevated.</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="two-col">
            <div className="panel">
              <div className="panel-head"><h3>What's Changing?</h3></div>
              <div className="panel-body">
                <div className="change-list">
                  <div className="change-item"><span className="bullet">▲</span> Risk increased in 2 districts over the past week.</div>
                  <div className="change-item"><span className="bullet">▲</span> Rainfall increased sharply in the Western province.</div>
                  <div className="change-item"><span className="bullet">▼</span> National dengue cases decreased slightly week-over-week.</div>
                  <div className="change-item"><span className="bullet">▲</span> Forecast indicates increasing risk over the next 14 days.</div>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="panel-head"><h3>Data &amp; Model Status</h3></div>
              <div className="panel-body">
                <div className="intel-row"><span className="intel-label">Case Data Feed</span><span className="mono" style={{color:'var(--risk-low)', fontSize:'12px'}}>● Connected</span></div>
                <div className="intel-row"><span className="intel-label">Weather API</span><span className="mono" style={{color:'var(--risk-low)', fontSize:'12px'}}>● Connected</span></div>
                <div className="intel-row"><span className="intel-label">Prediction Model</span><span className="mono" style={{color:'var(--risk-low)', fontSize:'12px'}}>● v2.3 Active</span></div>
                <div className="intel-row"><span className="intel-label">Last Full Sync</span><span className="intel-value mono" style={{fontSize:'12px'}}>08:14 AM</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
