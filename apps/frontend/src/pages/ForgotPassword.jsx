import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar.jsx';
import Icon from '../components/Icon.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1500);
  };

  return (
    <>
      <Navbar />
      <div className="auth-layout">
        <div className="auth-panel-left">
          <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px', lineHeight: 1.2 }}>{t('auth.leftTitle')}</h1>
          <p style={{ fontSize: '18px', marginBottom: '32px', maxWidth: '400px', color: 'var(--text-2)' }}>
            {t('auth.leftDesc')}
          </p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '16px', listStyle: 'none', padding: 0 }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Icon name="shield" size={20} color="var(--teal)" /> {t('auth.leftPoint1')}</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Icon name="alert-triangle" size={20} color="var(--teal)" /> {t('auth.leftPoint2')}</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Icon name="activity" size={20} color="var(--teal)" /> {t('auth.leftPoint3')}</li>
          </ul>
        </div>
        
        <div className="auth-panel-right">
          <div style={{maxWidth: '400px', width: '100%', margin: '0 auto'}}>
            <h2 className="auth-form-title">{t('auth.forgotTitle')}</h2>
            <p className="auth-form-subtitle">{t('auth.forgotSubtitle')}</p>

            {success ? (
              <div className="alert" style={{ background: 'var(--risk-low-bg)', color: 'var(--risk-low)', border: '1px solid var(--risk-low)', marginBottom: '24px', borderRadius: 'var(--r-sm)' }}>
                <span className="dot-live" style={{background:'var(--risk-low)'}}></span>
                <div><div style={{fontSize:'14px', fontWeight:600}}>Password reset link sent to your email.</div></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">{t('auth.email')}</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required 
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                  {loading ? 'Sending...' : t('auth.sendLinkBtn')}
                </button>
              </form>
            )}

            <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: 'var(--text-3)' }}>
              <Link to="/login" style={{ color: 'var(--teal)', fontWeight: 600, margin: '0 4px', textDecoration: 'none' }}>{t('auth.backToLogin')}</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
