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

  const highRiskCount = riskData.filter(d => d.riskLevel === 'high').length;
  const criticalRiskCount = riskData.filter(d => d.riskLevel === 'critical').length;
  const severeCount = highRiskCount + criticalRiskCount;
  
  let nationalRiskLevel = 'Low';
  if (severeCount > 5) nationalRiskLevel = 'High';
  else if (severeCount > 0) nationalRiskLevel = 'Moderate';

  const riskBadgeClass = nationalRiskLevel.toLowerCase();

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
            {topZones.slice(0, 5).map((zone, i) => {
              const riskLevel = zone.riskLevel || 'low';
              const riskColor = riskLevel === 'critical' ? 'crit' : riskLevel;
              
              return (
                <div key={i} className="kpi">
                  <div className="spectrum" style={{ background: `var(--risk-${riskColor})` }}></div>
                  <div className="kpi-top">
                    <div className="kpi-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s-8-5.5-8-12a8 8 0 0116 0c0 6.5-8 12-8 12z"/>
                      </svg>
                    </div>
                    <div className="kpi-trend up">Rank #{i + 1}</div>
                  </div>
                  <div className="kpi-value" style={{ fontSize: '22px', marginBottom: '4px', wordBreak: 'break-word', lineHeight: '1.2' }}>{zone.district}</div>
                  <div className="kpi-label">{riskLevel.toUpperCase()} RISK</div>
                  <div style={{ marginTop: '14px', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(zone.riskScore, 100)}%`, height: '100%', background: `var(--risk-${riskColor})`, transition: 'width 1s ease-in-out' }}></div>
                  </div>
                  <div className="kpi-updated" style={{ marginTop: '8px' }}>RISK SCORE: {Math.round(zone.riskScore)}</div>
                </div>
              );
            })}
            
            {/* Fill empty spots if less than 5 top zones */}
            {topZones.length < 5 && Array.from({ length: 5 - topZones.length }).map((_, i) => (
              <div key={`empty-${i}`} className="kpi" style={{ opacity: 0.5 }}>
                <div className="kpi-top">
                  <div className="kpi-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                  <div className="kpi-trend flat">—</div>
                </div>
                <div className="kpi-value" style={{ fontSize: '22px', color: 'var(--text-3)' }}>Safe Area</div>
                <div className="kpi-label">LOW RISK</div>
                <div style={{ marginTop: '14px', height: '4px', background: 'var(--border)', borderRadius: '2px' }}></div>
                <div className="kpi-updated" style={{ marginTop: '8px' }}>—</div>
              </div>
            ))}
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
                {/* Embed existing React map */}
                <SharedMapCard riskData={riskData} title="" />

                <div className="map-corner-actions">
                  <button className="icon-btn" title="Reset view" style={{background:'var(--glass)'}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head"><h3>AI Risk Intelligence</h3><span className={`risk-badge ${riskData.length > 0 ? riskBadgeClass : ''}`}>Live</span></div>
              <div className="panel-body">
                <div className="intel-row"><span className="intel-label">National Risk</span><span className={`risk-badge ${riskBadgeClass}`}>{riskData.length > 0 ? nationalRiskLevel : '...'}</span></div>
                <div className="intel-row"><span className="intel-label">Highest-Risk District</span><span className="intel-value">{topZones[0]?.district || '...'}</span></div>
                <div className="intel-row"><span className="intel-label">Predicted Risk</span><span className={`risk-badge ${riskBadgeClass}`}>{riskData.length > 0 ? nationalRiskLevel : '...'}</span></div>
                <div className="intel-row"><span className="intel-label">Prediction Horizon</span><span className="intel-value mono" style={{fontSize:'12px'}}>{topZones.length > 0 && topZones[0]?.predictedFor ? new Date(topZones[0]?.predictedFor).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '...'}</span></div>
                <div style={{marginTop:'14px'}}>
                  <div style={{fontSize:'11px', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:'8px'}}>Contributing Factors</div>
                  <div className="factor-tags">
                    {nationalRiskLevel === 'High' ? (
                      <>
                        <span className="factor-tag"><span className="arrow-up">▲</span> Rainfall</span>
                        <span className="factor-tag"><span className="arrow-up">▲</span> Humidity</span>
                        <span className="factor-tag"><span className="arrow-up">▲</span> Recent Cases</span>
                        <span className="factor-tag"><span className="arrow-down">▼</span> Temperature</span>
                      </>
                    ) : nationalRiskLevel === 'Moderate' ? (
                      <>
                        <span className="factor-tag"><span className="arrow-up">▲</span> Rainfall</span>
                        <span className="factor-tag"><span className="arrow-down">▼</span> Humidity</span>
                        <span className="factor-tag"><span className="arrow-up">▲</span> Recent Cases</span>
                        <span className="factor-tag"><span className="arrow-down">▼</span> Temperature</span>
                      </>
                    ) : (
                      <>
                        <span className="factor-tag"><span className="arrow-down">▼</span> Rainfall</span>
                        <span className="factor-tag"><span className="arrow-down">▼</span> Humidity</span>
                        <span className="factor-tag"><span className="arrow-down">▼</span> Recent Cases</span>
                        <span className="factor-tag"><span className="arrow-up">▲</span> Temperature</span>
                      </>
                    )}
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
