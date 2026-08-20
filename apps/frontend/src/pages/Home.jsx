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
      <div className="mesh-bg"></div>

      <section className="hero fade-in-up" id="home" style={{ position: 'relative', padding: '80px 0 60px', textAlign: 'center', borderBottom: 'none' }}>
        <div className="hero-glow"></div>
        <div className="wrap" style={{ position: 'relative', zIndex: 1 }}>
          <div className="eyebrow" style={{ justifyContent: 'center', marginBottom: '24px' }}><span className="pulse"></span> LIVE INTELLIGENCE FEED</div>
          <h1 className="display text-gradient" style={{ fontSize: '56px', margin: '0 auto', maxWidth: '800px', lineHeight: 1.1 }}>Dengue Intelligence Center</h1>
          <p className="sub" style={{ fontSize: '18px', maxWidth: '640px', margin: '20px auto 32px' }}>Real-time epidemiological telemetry, multi-model AI forecasting, and dynamic outbreak risk monitoring for Sri Lanka.</p>
          <div className="status-row delay-2 fade-in-up" style={{ justifyContent: 'center', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
              <span className="dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--risk-low)', boxShadow: '0 0 10px var(--risk-low)' }}></span> 
              Live Data <span style={{ color: 'var(--text-3)' }}>· Syncing</span>
            </div>
            <div className="glass-panel" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              Prediction Core <span style={{ color: 'var(--text-3)' }}>· v2.3 Active</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section delay-3 fade-in-up">
        <div className="wrap">
          <div className="section-head" style={{ marginBottom: '24px' }}>
            <div><h2 className="text-gradient">Critical Monitoring Zones</h2><div className="desc">Highest risk MOH areas identified by the prediction core</div></div>
          </div>
          <div className="kpi-grid">
            {topZones.slice(0, 5).map((zone, i) => {
              const riskLevel = zone.riskLevel || 'low';
              const riskColor = riskLevel === 'critical' ? 'crit' : riskLevel;
              
              return (
                <div key={i} className="glass-card hover-reveal" style={{ padding: '20px' }}>
                  <div className="spectrum" style={{ background: `var(--risk-${riskColor})`, height: '4px', boxShadow: `0 0 10px var(--risk-${riskColor})` }}></div>
                  <div className="kpi-top" style={{ marginTop: '12px' }}>
                    <div className="kpi-icon icon-glow" style={{ background: 'transparent' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={`var(--risk-${riskColor})`} strokeWidth="2">
                        <path d="M12 22s-8-5.5-8-12a8 8 0 0116 0c0 6.5-8 12-8 12z"/>
                      </svg>
                    </div>
                    <div className="kpi-trend up" style={{ background: 'transparent', border: `1px solid var(--risk-${riskColor})`, color: `var(--risk-${riskColor})` }}>Rank #{i + 1}</div>
                  </div>
                  <div className="kpi-value" style={{ fontSize: '22px', margin: '16px 0 4px', fontWeight: 800, wordBreak: 'break-word', lineHeight: '1.2' }}>{zone.mohZone}</div>
                  <div className="kpi-label" style={{ fontWeight: 700, color: `var(--risk-${riskColor})`, letterSpacing: '0.05em' }}>{riskLevel.toUpperCase()} RISK</div>
                  
                  <div className="reveal-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-2)', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase' }}>
                      <span>Risk Score</span>
                      <span style={{ color: 'var(--text)' }}>{Math.round(zone.riskScore)} / 100</span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--surface-3)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(zone.riskScore, 100)}%`, height: '100%', background: `var(--risk-${riskColor})`, boxShadow: `0 0 8px var(--risk-${riskColor})`, transition: 'width 1s ease-in-out' }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Fill empty spots if less than 5 top zones */}
            {topZones.length < 5 && Array.from({ length: 5 - topZones.length }).map((_, i) => (
              <div key={`empty-${i}`} className="glass-card hover-reveal" style={{ padding: '20px', opacity: 0.5 }}>
                <div className="spectrum" style={{ background: 'var(--surface-3)', height: '4px' }}></div>
                <div className="kpi-top" style={{ marginTop: '12px' }}>
                  <div className="kpi-icon icon-glow" style={{ background: 'transparent' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                  </div>
                </div>
                <div className="kpi-value" style={{ fontSize: '22px', margin: '16px 0 4px', color: 'var(--text-3)' }}>Safe Area</div>
                <div className="kpi-label" style={{ fontWeight: 700 }}>LOW RISK</div>
              </div>
            ))}
          </div>
          <div className="cyber-line"></div>
        </div>
      </section>

      <section className="section" id="map">
        <div className="wrap">
          <div className="main-grid">
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-head" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 className="text-gradient">National Dengue Risk Map</h3>
                <div className="section-actions">
                  <button className="btn" style={{ background: 'var(--surface-2)', border: 'none' }}>Fullscreen</button>
                  <button className="btn primary" style={{ background: 'var(--brand)', color: '#000', border: 'none' }}>Refresh</button>
                </div>
              </div>
              <div className="map-wrap" id="mapArea" style={{ background: 'transparent' }}>
                <SharedMapCard riskData={riskData} title="" />
                <div className="map-corner-actions">
                  <button className="icon-btn" title="Reset view" style={{background:'var(--glass)'}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-head" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 className="text-gradient">AI Risk Intelligence</h3>
                <span className={`risk-badge ${riskData.length > 0 ? riskBadgeClass : ''}`}>Live</span>
              </div>
              <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div className="intel-row"><span className="intel-label">National Risk</span><span className={`risk-badge ${riskBadgeClass}`}>{riskData.length > 0 ? nationalRiskLevel : '...'}</span></div>
                <div className="intel-row"><span className="intel-label">Highest-Risk District</span><span className="intel-value">{topZones[0]?.district || '...'}</span></div>
                <div className="intel-row"><span className="intel-label">Predicted Risk</span><span className={`risk-badge ${riskBadgeClass}`}>{riskData.length > 0 ? nationalRiskLevel : '...'}</span></div>
                <div className="intel-row" style={{ borderBottom: 'none' }}><span className="intel-label">Prediction Horizon</span><span className="intel-value mono" style={{fontSize:'12px'}}>{topZones.length > 0 && topZones[0]?.predictedFor ? new Date(topZones[0]?.predictedFor).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '...'}</span></div>
                
                <div className="cyber-line" style={{ margin: '12px 0' }}></div>
                
                <div>
                  <div style={{fontSize:'11px', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:'12px', fontWeight: 600}}>Contributing Factors</div>
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
          <div className="section-head" style={{ marginBottom: '24px' }}>
            <div><h2 className="text-gradient">Dengue Risk Forecast</h2><div className="desc">Historical cases vs. AI-forecasted risk — 14-day horizon</div></div>
            <div className="section-actions"><button className="btn" style={{ background: 'var(--surface-2)', border: 'none' }}>Export Data</button></div>
          </div>
          <div className="glass-panel hover-reveal" style={{ padding: '24px' }}>
            <div className="chart-box">
              <TrendChart data={trendData} />
            </div>
          </div>
          <div className="cyber-line"></div>
        </div>
      </section>

      <section className="section" id="weather">
        <div className="wrap">
          <div className="two-col">
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-head" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 className="text-gradient">Weather Intelligence</h3>
                <span className="mono" style={{fontSize:'10.5px', color:'var(--text-3)'}}>UPDATED 12 MIN AGO</span>
              </div>
              <div className="panel-body">
                <div className="weather-hero">
                  <div>
                    <div className="weather-loc">Colombo</div>
                    <div className="text-brand-glow" style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: '56px', lineHeight: 1 }}>28°C</div>
                  </div>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.2" className="icon-glow"><path d="M8 19a5 5 0 01-1-9.9A6 6 0 0118 8a4.5 4.5 0 011 8.9"/><path d="M8 19h9"/></svg>
                </div>
                <div className="weather-stats">
                  <div className="weather-stat" style={{ background: 'var(--surface-3)', border: '1px solid rgba(255,255,255,0.05)' }}><div className="v" style={{ color: 'var(--text)' }}>82%</div><div className="l">Humidity</div></div>
                  <div className="weather-stat" style={{ background: 'var(--surface-3)', border: '1px solid rgba(255,255,255,0.05)' }}><div className="v" style={{ color: 'var(--text)' }}>14mm</div><div className="l">Rainfall</div></div>
                  <div className="weather-stat" style={{ background: 'var(--surface-3)', border: '1px solid rgba(255,255,255,0.05)' }}><div className="v" style={{ color: 'var(--text)' }}>11km/h</div><div className="l">Wind</div></div>
                </div>
              </div>
            </div>
            
            <div className="glass-panel" id="alerts" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-head" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 className="text-gradient">Alert Center</h3>
                <span className="risk-badge high">3 Active</span>
              </div>
              <div className="panel-body" style={{ padding: '0 18px 18px' }}>
                <div className="alert"><span className="alert-dot" style={{background:'var(--risk-crit)', boxShadow: '0 0 8px var(--risk-crit)'}}></span>
                  <div><div className="alert-title">High-risk district detected</div><div className="alert-meta">Colombo · 18 min ago</div><div className="alert-desc">Case density crossed the high-risk threshold this week.</div></div>
                </div>
                <div className="alert"><span className="alert-dot" style={{background:'var(--risk-high)', boxShadow: '0 0 8px var(--risk-high)'}}></span>
                  <div><div className="alert-title">Risk increasing</div><div className="alert-meta">Gampaha · 1h ago</div><div className="alert-desc">Predicted risk moved from Moderate to High over 14 days.</div></div>
                </div>
                <div className="alert" style={{ borderBottom: 'none', paddingBottom: 0 }}><span className="alert-dot" style={{background:'var(--risk-mod)', boxShadow: '0 0 8px var(--risk-mod)'}}></span>
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
            <div className="glass-panel">
              <div className="panel-head" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 className="text-gradient">What's Changing?</h3>
              </div>
              <div className="panel-body">
                <div className="change-list">
                  <div className="change-item"><span className="bullet">▲</span> Risk increased in 2 districts over the past week.</div>
                  <div className="change-item"><span className="bullet">▲</span> Rainfall increased sharply in the Western province.</div>
                  <div className="change-item"><span className="bullet" style={{ color: 'var(--risk-low)', background: 'var(--risk-low-bg)' }}>▼</span> National dengue cases decreased slightly week-over-week.</div>
                  <div className="change-item"><span className="bullet">▲</span> Forecast indicates increasing risk over the next 14 days.</div>
                </div>
              </div>
            </div>
            <div className="glass-panel">
              <div className="panel-head" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 className="text-gradient">Data &amp; Model Status</h3>
              </div>
              <div className="panel-body">
                <div className="intel-row"><span className="intel-label">Case Data Feed</span><span className="mono" style={{color:'var(--risk-low)', fontSize:'12px', display: 'flex', alignItems: 'center', gap: '4px'}}><span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--risk-low)', boxShadow: '0 0 8px var(--risk-low)' }}></span> Connected</span></div>
                <div className="intel-row"><span className="intel-label">Weather API</span><span className="mono" style={{color:'var(--risk-low)', fontSize:'12px', display: 'flex', alignItems: 'center', gap: '4px'}}><span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--risk-low)', boxShadow: '0 0 8px var(--risk-low)' }}></span> Connected</span></div>
                <div className="intel-row"><span className="intel-label">Prediction Model</span><span className="mono" style={{color:'var(--brand)', fontSize:'12px', display: 'flex', alignItems: 'center', gap: '4px'}}><span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', boxShadow: '0 0 8px var(--brand)' }}></span> v2.3 Active</span></div>
                <div className="intel-row" style={{ borderBottom: 'none' }}><span className="intel-label">Last Full Sync</span><span className="intel-value mono" style={{fontSize:'12px'}}>08:14 AM</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
