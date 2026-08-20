import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import SriLankaMap from '../components/SriLankaMap.jsx';
import TrendChart from '../components/TrendChart.jsx';
import { publicAPI } from '../services/api.js';

export default function Home() {
  const { t } = useTranslation();
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

      <section className="hero" id="home">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow"><span className="dot-live"></span> {t('home.hero.eyebrow')}</div>
            <h1 className="display">{t('home.hero.titlePart1')}<span>{t('home.hero.titlePart2')}</span></h1>
            <p className="lead">{t('home.hero.lead')}</p>
            <div className="hero-ctas">
              <a href="#map" className="btn btn-primary" style={{padding:'13px 22px', fontSize:'14.5px'}}>{t('home.hero.viewMap')}</a>
              <Link to="/how-it-works" className="btn btn-ghost" style={{padding:'13px 22px', fontSize:'14.5px'}}>{t('home.hero.howItWorks')}</Link>
            </div>
            <div className="hero-stats">
              <div className="hero-stat"><b>25</b><span>{t('home.hero.districtsMonitored')}</span></div>
              <div className="hero-stat"><b>7-day</b><span>{t('home.hero.forecastHorizon')}</span></div>
              <div className="hero-stat"><b>24/7</b><span>{t('home.hero.liveWeather')}</span></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hv-head">
              <span className="tag">{t('home.topRisk.title')}</span>
              <span className="live-flag"><span className="dot-live"></span> {t('home.topRisk.live')}</span>
            </div>
            {topZones.slice(0, 5).map((zone, i) => {
              const risk = zone.riskLevel || 'low';
              const riskColorClass = risk === 'critical' ? 'crit' : risk === 'moderate' ? 'mod' : risk;
              return (
                <div className="risk-row" key={i}>
                  <span className="district">{zone.mohZone} <span style={{fontSize: '11px', color: 'var(--text-3)', marginLeft: '4px'}}>({zone.district})</span></span>
                  <span className={`badge ${riskColorClass}`}>{risk.charAt(0).toUpperCase() + risk.slice(1)}</span>
                </div>
              );
            })}
            {topZones.length === 0 && (
              <div style={{ color: 'var(--text-3)', fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>{t('home.topRisk.loading')}</div>
            )}
          </div>
        </div>
      </section>

      <section id="map">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="kicker">{t('home.mapSection.kicker')}</span>
              <h2>{t('home.mapSection.title')}</h2>
              <p>{t('home.mapSection.desc')}</p>
            </div>
            <span className="live-flag"><span className="dot-live"></span> {t('home.mapSection.updatedNow')}</span>
          </div>

          <div className="map-card">
            <div className="map-card-head">
              <h3><span className="live-flag" style={{background:'var(--teal-dim)', color:'var(--teal)'}}><span className="dot-live" style={{background:'var(--teal)'}}></span></span>{t('home.mapSection.cardTitle')}</h3>
              <div style={{display:'flex', gap:'8px'}}>
                <button className="btn btn-ghost" style={{borderColor:'var(--border)', color:'var(--text-2)', padding:'8px 12px', fontSize:'12.5px'}}>{t('home.mapSection.filters')}</button>
                <button className="btn btn-ghost" style={{borderColor:'var(--border)', color:'var(--text-2)', padding:'8px 12px', fontSize:'12.5px'}}>{t('home.mapSection.export')}</button>
              </div>
            </div>
            <div className="map-card-body">
              <div className="map-stage" id="mapArea">
                <div style={{ height: '100%', width: '100%', position: 'absolute', inset: 0, zIndex: 1 }}>
                  <SriLankaMap riskData={riskData} />
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)', display: 'flex', gap: '16px', justifyContent: 'center', zIndex: 10 }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--risk-low)' }}></span> {t('home.mapSection.lowRisk')}</div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600' }}><span style={{ width: '0', height: '0', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '10px solid var(--risk-mod)' }}></span> {t('home.mapSection.moderateRisk')}</div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600' }}><span style={{ width: '10px', height: '10px', background: 'var(--risk-high)' }}></span> {t('home.mapSection.highRisk')}</div>
                </div>
              </div>
              <div className="map-side">
                <div className="side-title">Top Risk MOH Areas</div>
                {topZones.slice(0, 10).map((zone, i) => {
                  const risk = zone.riskLevel || 'low';
                  const riskColorClass = risk === 'critical' ? 'crit' : risk === 'moderate' ? 'mod' : risk;
                  return (
                    <div className="district-item" key={i}>
                      <div className="name">{zone.mohZone} <small>{t('home.topRisk.score')}: {Number(zone.riskScore).toFixed(1)}</small></div>
                      <span className={`badge ${riskColorClass}`}>{risk.charAt(0).toUpperCase() + risk.slice(1)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="stats-grid" style={{ marginTop: '24px' }}>
            <div className="stat-card">
              <div className="stat-top">
                <div className="stat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
                <span className="trend down">▼ 12%</span>
              </div>
              <div className="stat-val">2,405</div>
              <div className="stat-label">{t('home.stats.activeCases')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-top">
                <div className="stat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
                <span className="trend up">▲ 4%</span>
              </div>
              <div className="stat-val">342</div>
              <div className="stat-label">{t('home.stats.newCases')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-top">
                <div className="stat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
                <span className="trend flat">— 0%</span>
              </div>
              <div className="stat-val">8</div>
              <div className="stat-label">{t('home.stats.criticalZones')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-top">
                <div className="stat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                <span className="trend flat">—</span>
              </div>
              <div className="stat-val">99.8%</div>
              <div className="stat-label">{t('home.stats.modelAccuracy')}</div>
            </div>
          </div>
          
          <div className="ticker" style={{ marginTop: '24px' }}>
            <div className="ticker-label">{t('home.ticker.label')}</div>
            <div className="ticker-track">
              <span><b>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</b> {t('home.ticker.msg1')}</span>
              <span><b>ALERT:</b> {t('home.ticker.msg2')}</span>
              <span><b>UPDATE:</b> {t('home.ticker.msg3')}</span>
              <span><b>Gampaha:</b> {t('home.ticker.msg4')}</span>
              <span><b>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</b> {t('home.ticker.msg1')}</span>
              <span><b>ALERT:</b> {t('home.ticker.msg2')}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="forecast">
        <div className="wrap">
          <div className="section-head">
            <div>
              <h2>{t('home.forecast.title')}</h2>
              <p>{t('home.forecast.desc')}</p>
            </div>
            <div className="section-actions"><button className="btn btn-outline">{t('home.forecast.export')}</button></div>
          </div>
          <div className="card" style={{ padding: '24px' }}>
            <div className="chart-box" style={{ height: '400px', width: '100%' }}>
              <TrendChart data={trendData} />
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="weather">
        <div className="wrap">
          <div className="hero-grid" style={{ gap: '24px' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="map-card-head">
                <h3 style={{fontSize:'16px', fontWeight:700}}>{t('home.weather.title')}</h3>
                <span className="mono" style={{fontSize:'11px', color:'var(--text-3)'}}>{t('home.weather.updated')}</span>
              </div>
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div>
                    <div style={{fontSize:'14px', color:'var(--text-2)', marginBottom:'4px'}}>{t('home.weather.colombo')}</div>
                    <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '48px', lineHeight: 1, letterSpacing: '-.02em', color:'var(--teal)' }}>28°C</div>
                  </div>
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.2"><path d="M8 19a5 5 0 01-1-9.9A6 6 0 0118 8a4.5 4.5 0 011 8.9"/><path d="M8 19h9"/></svg>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '12px', textAlign: 'center' }}><div style={{ fontSize:'18px', fontWeight:700, color: 'var(--text)' }}>82%</div><div style={{ fontSize:'11.5px', color:'var(--text-3)', fontWeight:600, marginTop:'4px' }}>{t('home.weather.humidity')}</div></div>
                  <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '12px', textAlign: 'center' }}><div style={{ fontSize:'18px', fontWeight:700, color: 'var(--text)' }}>14mm</div><div style={{ fontSize:'11.5px', color:'var(--text-3)', fontWeight:600, marginTop:'4px' }}>{t('home.weather.rainfall')}</div></div>
                  <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '12px', textAlign: 'center' }}><div style={{ fontSize:'18px', fontWeight:700, color: 'var(--text)' }}>11km/h</div><div style={{ fontSize:'11.5px', color:'var(--text-3)', fontWeight:600, marginTop:'4px' }}>{t('home.weather.wind')}</div></div>
                </div>
              </div>
            </div>
            
            <div className="card" id="alerts" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="map-card-head">
                <h3 style={{fontSize:'16px', fontWeight:700}}>{t('home.alerts.title')}</h3>
                <span className="badge high">3 {t('home.alerts.active')}</span>
              </div>
              <div style={{ padding: '0 24px 24px' }}>
                <div className="alert" style={{borderBottom:'1px solid var(--border)', padding:'16px 0', borderRadius:0}}><span className="dot-live" style={{background:'var(--risk-crit)', marginTop:'5px', flexShrink:0}}></span>
                  <div><div style={{fontSize:'14px', fontWeight:600}}>{t('home.alerts.alert1Title')}</div><div style={{fontSize:'12px', color:'var(--text-3)', marginTop:'2px'}} className="mono">{t('home.alerts.alert1Time')}</div><div style={{fontSize:'13px', color:'var(--text-2)', marginTop:'4px'}}>{t('home.alerts.alert1Desc')}</div></div>
                </div>
                <div className="alert" style={{borderBottom:'1px solid var(--border)', padding:'16px 0', borderRadius:0}}><span className="dot-live" style={{background:'var(--risk-high)', marginTop:'5px', flexShrink:0}}></span>
                  <div><div style={{fontSize:'14px', fontWeight:600}}>{t('home.alerts.alert2Title')}</div><div style={{fontSize:'12px', color:'var(--text-3)', marginTop:'2px'}} className="mono">{t('home.alerts.alert2Time')}</div><div style={{fontSize:'13px', color:'var(--text-2)', marginTop:'4px'}}>{t('home.alerts.alert2Desc')}</div></div>
                </div>
                <div className="alert" style={{padding:'16px 0 0', borderRadius:0}}><span className="dot-live" style={{background:'var(--risk-mod)', marginTop:'5px', flexShrink:0}}></span>
                  <div><div style={{fontSize:'14px', fontWeight:600}}>{t('home.alerts.alert3Title')}</div><div style={{fontSize:'12px', color:'var(--text-3)', marginTop:'2px'}} className="mono">{t('home.alerts.alert3Time')}</div><div style={{fontSize:'13px', color:'var(--text-2)', marginTop:'4px'}}>{t('home.alerts.alert3Desc')}</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="wrap">
          <div className="hero-grid" style={{ gap: '24px' }}>
            <div className="card">
              <div className="map-card-head">
                <h3 style={{fontSize:'16px', fontWeight:700}}>{t('home.changes.title')}</h3>
              </div>
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '13.5px', color: 'var(--text-2)' }}><span style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'var(--brand-soft)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>▲</span> {t('home.changes.point1')}</div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '13.5px', color: 'var(--text-2)' }}><span style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'var(--brand-soft)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>▲</span> {t('home.changes.point2')}</div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '13.5px', color: 'var(--text-2)' }}><span style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'var(--risk-low-bg)', color: 'var(--risk-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>▼</span> {t('home.changes.point3')}</div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '13.5px', color: 'var(--text-2)' }}><span style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'var(--brand-soft)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>▲</span> {t('home.changes.point4')}</div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="map-card-head">
                <h3 style={{fontSize:'16px', fontWeight:700}}>{t('home.status.title')}</h3>
              </div>
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}><span style={{color:'var(--text-2)', fontSize:'13.5px'}}>{t('home.status.feed')}</span><span className="mono" style={{color:'var(--risk-low)', fontSize:'12.5px', display: 'flex', alignItems: 'center', gap: '6px'}}><span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--risk-low)', boxShadow: '0 0 8px var(--risk-low)' }}></span> {t('home.status.connected')}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}><span style={{color:'var(--text-2)', fontSize:'13.5px'}}>{t('home.status.api')}</span><span className="mono" style={{color:'var(--risk-low)', fontSize:'12.5px', display: 'flex', alignItems: 'center', gap: '6px'}}><span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--risk-low)', boxShadow: '0 0 8px var(--risk-low)' }}></span> Connected</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}><span style={{color:'var(--text-2)', fontSize:'13.5px'}}>{t('home.status.model')}</span><span className="mono" style={{color:'var(--teal)', fontSize:'12.5px', display: 'flex', alignItems: 'center', gap: '6px'}}><span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', boxShadow: '0 0 8px var(--teal)' }}></span> {t('home.status.active')}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}><span style={{color:'var(--text-2)', fontSize:'13.5px'}}>{t('home.status.sync')}</span><span className="mono" style={{fontSize:'12.5px', fontWeight:700}}>08:14 AM</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
