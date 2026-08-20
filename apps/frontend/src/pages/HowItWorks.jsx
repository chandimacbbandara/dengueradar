import React, { useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import Icon from '../components/Icon.jsx';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

export default function HowItWorks() {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const modelAccuracyData = [
    { name: 'Stacking Ensemble (Production)', accuracy: 76.8, isMain: true },
    { name: 'CatBoost alone', accuracy: 76.1, isMain: false },
    { name: 'LightGBM alone', accuracy: 75.7, isMain: false },
    { name: 'XGBoost alone', accuracy: 75.3, isMain: false },
    { name: 'Naive persistence', accuracy: 75.2, isMain: false },
    { name: 'LSTM alone', accuracy: 73.4, isMain: false },
  ];

  const faqs = [
    {
      q: 'Why 4 classes instead of just "outbreak yes/no"?',
      a: 'Because public health response is graduated. A Warning gets a different response than an Alert, and lumping them together would lose important information. The 4-tier system matches the official Sri Lankan dengue response protocol.'
    },
    {
      q: 'Why don\'t you predict the exact number of cases?',
      a: 'We do! The system also produces a case count estimate (alongside the tier). The tier is more reliable because it\'s a classification problem (4 options) rather than a regression problem (any positive integer), and the class probabilities are easier to interpret for non-technical users.'
    },
    {
      q: 'How is this different from just looking at last week\'s cases?',
      a: 'It is, partially. Last week\'s cases are by far the strongest predictor — if your neighbourhood had 50 cases last week, it\'s likely a Warning or Alert this week. The model\'s edge is in detecting transitions — knowing when a steady "Watch" pattern is about to escalate to "Warning" based on district-level signals, weather changes, and seasonality.'
    },
    {
      q: 'What happens if the data is missing or wrong?',
      a: 'The model handles missing data by forward-filling (using the last known value) and falling back to 0 if no history is available. For deployment, the upstream data pipeline should flag data quality issues — a week with no reported cases from a busy neighbourhood is suspicious and should be investigated.'
    },
    {
      q: 'Can I trust the Alert predictions?',
      a: 'Trust them, but verify. The model is right about 78% of the time when it predicts Alert. For high-stakes decisions, look at the confidence score (p_Alert): a 0.95 Alert is much more trustworthy than a 0.52 Alert. The production system uses a 0.5 threshold to filter to high-confidence Alerts.'
    },
    {
      q: 'How often does the model update?',
      a: 'Quarterly, with the latest surveillance data. The training pipeline is automated and takes about 15 minutes on a standard cloud server.'
    },
    {
      q: 'What about other diseases — could you predict chikungunya or Zika too?',
      a: 'In principle, yes. The same architecture (gradient boosting + LSTM + ensemble) works for any disease with similar surveillance data. The main constraint is having enough historical data to train on.'
    },
    {
      q: 'Is the model fair across all regions?',
      a: 'This is a critical question we monitor. We compute per-district accuracy and flag any district where accuracy drops significantly below the average. The main risk is small-population rural MOHs where a single case swings the tier dramatically. We have per-district threshold tuning in our roadmap to address this.'
    }
  ];

  const MetricBadge = ({ type }) => {
    switch(type) {
      case 'low': return <span className="risk-badge low">Low</span>;
      case 'watch': return <span className="risk-badge watch" style={{background: 'var(--risk-mod)', color: '#fff'}}>Watch</span>;
      case 'warning': return <span className="risk-badge warning" style={{background: 'var(--risk-high)', color: '#fff'}}>Warning</span>;
      case 'alert': return <span className="risk-badge alert" style={{background: 'var(--risk-crit)', color: '#fff'}}>Alert</span>;
      default: return null;
    }
  };

  return (
    <>
      <Navbar />
      
      {/* Hero Section */}
      <div className="mesh-bg"></div>
      <section className="hero fade-in-up" style={{ position: 'relative', padding: '60px 0', textAlign: 'center', borderBottom: 'none' }}>
        <div className="hero-glow"></div>
        <div className="wrap" style={{ position: 'relative', zIndex: 1 }}>
          <div className="eyebrow" style={{ justifyContent: 'center', marginBottom: '24px' }}>
            <Icon name="brain" size={16} /> INTELLIGENCE CORE
          </div>
          <h1 className="display text-gradient" style={{ fontSize: '48px', margin: '0 auto', maxWidth: '800px' }}>How DengueRadar Works</h1>
          <p className="sub" style={{ maxWidth: '800px', margin: '20px auto 0', fontSize: '18px' }}>
            A complete guide to our AI-powered dengue early warning system. Every week, our multi-model ensemble predicts the risk of an outbreak in all 226 MOH areas across Sri Lanka with ~77% accuracy.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: '20px' }}>
        <div className="wrap" style={{ maxWidth: '900px' }}>
          
          {/* TLDR Card */}
          <div className="glass-panel delay-1 fade-in-up" style={{ padding: '30px', marginBottom: '60px', borderLeft: '4px solid var(--brand)' }}>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--brand)', marginBottom: '10px' }}>In 30 Seconds</h3>
            <p style={{ fontSize: '16px', lineHeight: '1.6', margin: 0, color: 'var(--text-2)' }}>
              Every week, for each of Sri Lanka's 226 neighbourhoods, our AI looks at the neighbourhood's recent case history, the district-wide pattern, and the weather — and predicts whether next week will be <MetricBadge type="low"/>, <MetricBadge type="watch"/>, <MetricBadge type="warning"/>, or <MetricBadge type="alert"/>. The system achieves <strong style={{ color: 'var(--text)' }}>~77% accuracy</strong> on data it has never seen, giving health authorities a one-week head start on outbreak response.
            </p>
          </div>

          {/* Section: What is this? */}
          <div className="delay-2 fade-in-up" style={{ marginBottom: '60px' }}>
            <h2 className="text-gradient" style={{ fontSize: '32px', marginBottom: '24px' }}>What is DengueRadar?</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'center' }}>
              <div>
                <p style={{ marginBottom: '16px', lineHeight: '1.7', fontSize: '16px', color: 'var(--text-2)' }}>
                  It is an AI system that predicts, every week, how likely each neighbourhood in Sri Lanka is to experience a dengue outbreak in the <strong style={{ color: 'var(--text)' }}>coming week</strong>.
                </p>
                <p style={{ marginBottom: '16px', lineHeight: '1.7', fontSize: '16px', color: 'var(--text-2)' }}>It does this by looking at:</p>
                <div style={{ marginLeft: '10px', display: 'flex', flexDirection: 'column', gap: '0' }}>
                  <div className="timeline-step">
                    <div className="timeline-dot"><Icon name="history" size={14} color="var(--brand)" /></div>
                    <div style={{ fontWeight: 600 }}>Recent Case History</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>Local epidemiological data</div>
                  </div>
                  <div className="timeline-step">
                    <div className="timeline-dot"><Icon name="map" size={14} color="var(--brand)" /></div>
                    <div style={{ fontWeight: 600 }}>District-wide Patterns</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>Regional spread mechanics</div>
                  </div>
                  <div className="timeline-step">
                    <div className="timeline-dot"><Icon name="cloud-rain" size={14} color="var(--brand)" /></div>
                    <div style={{ fontWeight: 600 }}>Weather & Climate</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>Rain, temp, humidity</div>
                  </div>
                </div>
              </div>
              
              <div className="glass-panel" style={{ padding: '0' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.05)' }}>
                      <th style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-3)', fontSize: '12px' }}>ALERT LEVEL</th>
                      <th style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-3)', fontSize: '12px' }}>ACTION REQUIRED</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}><MetricBadge type="low"/></td>
                      <td style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-2)', fontSize: '14px' }}>Routine surveillance</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}><MetricBadge type="watch"/></td>
                      <td style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-2)', fontSize: '14px' }}>Increase monitoring</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}><MetricBadge type="warning"/></td>
                      <td style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-2)', fontSize: '14px' }}>Activate response teams</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '16px' }}><MetricBadge type="alert"/></td>
                      <td style={{ padding: '16px', color: 'var(--text-2)', fontSize: '14px' }}>Emergency response</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section: The AI Features */}
          <div className="delay-3 fade-in-up" style={{ marginBottom: '60px' }}>
            <h2 className="text-gradient" style={{ fontSize: '32px', marginBottom: '24px' }}>What does the AI actually look at?</h2>
            <p style={{ marginBottom: '32px', lineHeight: '1.7', fontSize: '16px', color: 'var(--text-2)' }}>
              Every week, for each neighbourhood, the AI looks at <strong style={{ color: 'var(--text)' }}>63 different signals</strong> (features). They're grouped into major categories:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              <div className="glass-card">
                <div style={{ background: 'var(--brand-soft)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <Icon name="history" size={24} color="var(--brand)" className="icon-glow" />
                </div>
                <h4 style={{ fontSize: '18px', marginBottom: '12px' }}>Historical Cases</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: '1.6' }}>Cases from the last 1-5 weeks, 2-6 months ago, and exactly one year ago to capture strong seasonality.</p>
              </div>
              <div className="glass-card">
                <div style={{ background: 'var(--brand-soft)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <Icon name="trending-up" size={24} color="var(--brand)" className="icon-glow" />
                </div>
                <h4 style={{ fontSize: '18px', marginBottom: '12px' }}>Rolling Stats & Growth</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: '1.6' }}>Mean, peak, variability, week-over-week growth, and 8-week linear trends indicating momentum.</p>
              </div>
              <div className="glass-card">
                <div style={{ background: 'var(--brand-soft)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <Icon name="cloud-lightning" size={24} color="var(--brand)" className="icon-glow" />
                </div>
                <h4 style={{ fontSize: '18px', marginBottom: '12px' }}>Weather Interactions</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: '1.6' }}>Temperature, humidity, rainfall lags (since mosquitoes breed 2-4 weeks after rain), and heat indices.</p>
              </div>
              <div className="glass-card">
                <div style={{ background: 'var(--brand-soft)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <Icon name="map-pin" size={24} color="var(--brand)" className="icon-glow" />
                </div>
                <h4 style={{ fontSize: '18px', marginBottom: '12px' }}>District Context</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: '1.6' }}>Total district cases and the neighbourhood's percentile rank within the district (are you the epicenter?).</p>
              </div>
            </div>
          </div>

          {/* Section: The Model Architecture */}
          <div className="delay-4 fade-in-up" style={{ marginBottom: '60px' }}>
            <h2 className="text-gradient" style={{ fontSize: '32px', marginBottom: '24px' }}>How does the AI decide?</h2>
            <p style={{ marginBottom: '16px', lineHeight: '1.7', fontSize: '16px', color: 'var(--text-2)' }}>
              We don't use one AI. We use <strong style={{ color: 'var(--text)' }}>multiple different AIs that vote together</strong>, plus a meta-learner that learns how to combine their votes (stacking ensemble).
            </p>
            
            <div className="glass-panel" style={{ padding: '40px', marginTop: '32px' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '30px', textAlign: 'center', letterSpacing: '0.02em' }}>Test Accuracy (2025-2026 Held-out Data)</h3>
              <div style={{ width: '100%', height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modelAccuracyData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" domain={[70, 80]} stroke="var(--text-3)" />
                    <YAxis dataKey="name" type="category" width={180} stroke="var(--text-2)" tick={{fontSize: 13, fontWeight: 600}} />
                    <RechartsTooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{background: 'var(--glass)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)'}}
                      formatter={(val) => [`${val}%`, 'Accuracy']}
                    />
                    <Bar dataKey="accuracy" radius={[0, 6, 6, 0]} barSize={24}>
                      {modelAccuracyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.isMain ? 'var(--brand)' : 'var(--text-3)'} style={{ filter: entry.isMain ? 'drop-shadow(0 0 8px var(--brand-soft))' : 'none' }} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', textAlign: 'center', marginTop: '24px' }}>
                Tested on 16,035 (MOH, week) pairs. The 76.8% is honest, production-grade accuracy on unseen data.
              </p>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="delay-4 fade-in-up" style={{ marginBottom: '80px' }}>
            <h2 className="text-gradient" style={{ fontSize: '32px', marginBottom: '32px', textAlign: 'center' }}>Frequently Asked Questions</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px', margin: '0 auto' }}>
              {faqs.map((faq, index) => (
                <div 
                  key={index} 
                  className="glass-panel" 
                  style={{ 
                    overflow: 'hidden',
                    border: openFaq === index ? '1px solid var(--brand)' : '1px solid rgba(255,255,255,0.05)',
                    boxShadow: openFaq === index ? '0 8px 32px var(--brand-soft)' : '0 8px 32px rgba(0,0,0,0.1)',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}
                >
                  <button 
                    onClick={() => toggleFaq(index)}
                    style={{
                      width: '100%',
                      padding: '24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: openFaq === index ? 'var(--brand)' : 'var(--text)',
                      fontWeight: '700',
                      fontSize: '16px',
                      transition: 'color 0.2s ease'
                    }}
                  >
                    {faq.q}
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', background: openFaq === index ? 'var(--brand-soft)' : 'var(--surface-3)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease',
                      transform: openFaq === index ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}>
                      <Icon 
                        name="chevron-down" 
                        size={18} 
                        color={openFaq === index ? 'var(--brand)' : 'var(--text-3)'} 
                      />
                    </div>
                  </button>
                  <div 
                    style={{ 
                      padding: openFaq === index ? '0 24px 24px 24px' : '0 24px',
                      maxHeight: openFaq === index ? '500px' : '0px',
                      opacity: openFaq === index ? 1 : 0,
                      overflow: 'hidden',
                      transition: 'all 0.4s ease',
                      color: 'var(--text-2)',
                      lineHeight: '1.7',
                      fontSize: '15px'
                    }}
                  >
                    {faq.a}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </>
  );
}
