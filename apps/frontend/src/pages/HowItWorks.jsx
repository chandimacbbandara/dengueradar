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
      <section className="hero" style={{ paddingBottom: '40px' }}>
        <div className="wrap">
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="brain" size={16} /> HOW IT WORKS
          </div>
          <h1 className="display">Intelligence Core</h1>
          <p className="sub" style={{ maxWidth: '800px', margin: '0 auto' }}>
            A complete guide to our AI-powered dengue early warning system. Every week, our multi-model ensemble predicts the risk of an outbreak in all 226 MOH areas across Sri Lanka with ~77% accuracy.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: '20px' }}>
        <div className="wrap" style={{ maxWidth: '900px' }}>
          
          {/* TLDR Card */}
          <div className="card" style={{ padding: '30px', background: 'var(--surface-2)', marginBottom: '40px', borderLeft: '4px solid var(--brand)' }}>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--brand)', marginBottom: '10px' }}>In 30 Seconds</h3>
            <p style={{ fontSize: '16px', lineHeight: '1.6', margin: 0 }}>
              Every week, for each of Sri Lanka's 226 neighbourhoods, our AI looks at the neighbourhood's recent case history, the district-wide pattern, and the weather — and predicts whether next week will be <MetricBadge type="low"/>, <MetricBadge type="watch"/>, <MetricBadge type="warning"/>, or <MetricBadge type="alert"/>. The system achieves <strong>~77% accuracy</strong> on data it has never seen, giving health authorities a one-week head start on outbreak response.
            </p>
          </div>

          {/* Section: What is this? */}
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>What is this?</h2>
            <p style={{ marginBottom: '16px', lineHeight: '1.7' }}>
              <strong>DengueRadar</strong> is an AI system that predicts, every week, how likely each neighbourhood in Sri Lanka is to experience a dengue outbreak in the <strong>coming week</strong>.
            </p>
            <p style={{ marginBottom: '16px', lineHeight: '1.7' }}>It does this by looking at:</p>
            <ul style={{ listStyleType: 'disc', paddingLeft: '24px', marginBottom: '24px', lineHeight: '1.7' }}>
              <li>The neighbourhood's own recent case history</li>
              <li>The pattern of cases across the whole district</li>
              <li>The current weather (rain, temperature, humidity)</li>
              <li>The time of year</li>
            </ul>

            <div className="card" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <th style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>Alert</th>
                    <th style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>What it means</th>
                    <th style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>What to do</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}><MetricBadge type="low"/></td>
                    <td style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>Normal week, low dengue activity</td>
                    <td style={{ padding: '16px', borderBottom: '1px solid var(--border)', color: 'var(--text-2)' }}>Routine surveillance</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}><MetricBadge type="watch"/></td>
                    <td style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>Slightly elevated, keep an eye on it</td>
                    <td style={{ padding: '16px', borderBottom: '1px solid var(--border)', color: 'var(--text-2)' }}>Increase monitoring</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}><MetricBadge type="warning"/></td>
                    <td style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>Outbreak likely starting</td>
                    <td style={{ padding: '16px', borderBottom: '1px solid var(--border)', color: 'var(--text-2)' }}>Activate response teams</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '16px' }}><MetricBadge type="alert"/></td>
                    <td style={{ padding: '16px' }}>Active outbreak, full response needed</td>
                    <td style={{ padding: '16px', color: 'var(--text-2)' }}>Emergency response</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: The AI Features */}
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>What does the AI actually look at?</h2>
            <p style={{ marginBottom: '24px', lineHeight: '1.7' }}>
              Every week, for each neighbourhood, the AI looks at <strong>63 different signals</strong> (features). They're grouped into major categories:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              <div className="card" style={{ padding: '20px' }}>
                <Icon name="history" size={24} color="var(--brand)" style={{ marginBottom: '12px' }} />
                <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>Historical Cases</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: '1.5' }}>Cases from the last 1-5 weeks, 2-6 months ago, and exactly one year ago to capture strong seasonality.</p>
              </div>
              <div className="card" style={{ padding: '20px' }}>
                <Icon name="trending-up" size={24} color="var(--brand)" style={{ marginBottom: '12px' }} />
                <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>Rolling Stats & Growth</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: '1.5' }}>Mean, peak, variability, week-over-week growth, and 8-week linear trends indicating momentum.</p>
              </div>
              <div className="card" style={{ padding: '20px' }}>
                <Icon name="cloud-lightning" size={24} color="var(--brand)" style={{ marginBottom: '12px' }} />
                <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>Weather Interactions</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: '1.5' }}>Temperature, humidity, rainfall lags (since mosquitoes breed 2-4 weeks after rain), and heat indices.</p>
              </div>
              <div className="card" style={{ padding: '20px' }}>
                <Icon name="map-pin" size={24} color="var(--brand)" style={{ marginBottom: '12px' }} />
                <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>District Context</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: '1.5' }}>Total district cases and the neighbourhood's percentile rank within the district (are you the epicenter?).</p>
              </div>
            </div>
          </div>

          {/* Section: The Model Architecture */}
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>How does the AI decide?</h2>
            <p style={{ marginBottom: '16px', lineHeight: '1.7' }}>
              We don't use one AI. We use <strong>multiple different AIs that vote together</strong>, plus a meta-learner that learns how to combine their votes (stacking ensemble).
            </p>
            
            <div className="card" style={{ padding: '30px', background: 'var(--surface)', marginTop: '24px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '20px', textAlign: 'center' }}>Test Accuracy (2025-2026 Held-out Data)</h3>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modelAccuracyData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                    <XAxis type="number" domain={[70, 80]} stroke="var(--text-3)" />
                    <YAxis dataKey="name" type="category" width={180} stroke="var(--text-2)" tick={{fontSize: 13}} />
                    <RechartsTooltip 
                      cursor={{fill: 'var(--surface-2)'}}
                      contentStyle={{background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)'}}
                      formatter={(val) => [`${val}%`, 'Accuracy']}
                    />
                    <Bar dataKey="accuracy" radius={[0, 4, 4, 0]} barSize={20}>
                      {modelAccuracyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.isMain ? 'var(--brand)' : 'var(--text-3)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', textAlign: 'center', marginTop: '16px' }}>
                Tested on 16,035 (MOH, week) pairs. The 76.8% is honest, production-grade accuracy on unseen data.
              </p>
            </div>
          </div>

          {/* FAQ Section */}
          <div style={{ marginBottom: '60px' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>Frequently Asked Questions</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {faqs.map((faq, index) => (
                <div 
                  key={index} 
                  className="card" 
                  style={{ 
                    overflow: 'hidden',
                    border: openFaq === index ? '1px solid var(--brand)' : '1px solid var(--border)',
                    transition: 'border-color 0.2s'
                  }}
                >
                  <button 
                    onClick={() => toggleFaq(index)}
                    style={{
                      width: '100%',
                      padding: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: 'var(--text)',
                      fontWeight: '600',
                      fontSize: '15px'
                    }}
                  >
                    {faq.q}
                    <Icon 
                      name="chevron-down" 
                      size={20} 
                      color="var(--text-3)" 
                      style={{ 
                        transform: openFaq === index ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease'
                      }} 
                    />
                  </button>
                  <div 
                    style={{ 
                      padding: openFaq === index ? '0 20px 20px 20px' : '0 20px',
                      maxHeight: openFaq === index ? '500px' : '0px',
                      opacity: openFaq === index ? 1 : 0,
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      color: 'var(--text-2)',
                      lineHeight: '1.6'
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
