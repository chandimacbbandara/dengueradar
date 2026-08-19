import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer>
      <div className="wrap footer-inner">
        <div>
          <Link to="/" className="brand">
            <svg className="brand-mark" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="19" stroke="var(--brand)" strokeWidth="1.4" opacity="0.35"/>
              <circle cx="20" cy="20" r="13" stroke="var(--brand)" strokeWidth="1.4" opacity="0.55"/>
              <circle cx="20" cy="20" r="3.4" fill="var(--brand)"/>
              <path d="M20 20 L20 4" stroke="var(--brand)" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M20 20 L31 11" stroke="var(--brand)" strokeWidth="1.6" strokeLinecap="round" opacity="0.6"/>
            </svg>
            <div>
              <div className="brand-name">DengueRadar</div>
              <div className="brand-sub">Sri Lanka · Live</div>
            </div>
          </Link>
          <div className="l" style={{marginTop: '14px', maxWidth: '280px'}}>
            {t('footer.tagline')}
          </div>
          <div className="l" style={{marginTop: '8px', opacity: 0.7}}>
            &copy; {new Date().getFullYear()} DengueRadar Sri Lanka. All rights reserved.
          </div>
        </div>
        <div className="footer-links" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{fontWeight: 600, color: 'var(--text)', marginBottom: '4px'}}>Quick Links</div>
          <Link to="/">Overview</Link>
          <a href="#map">Risk Map</a>
          <Link to="/login">Login</Link>
        </div>
        <div className="footer-links" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{fontWeight: 600, color: 'var(--text)', marginBottom: '4px'}}>Resources</div>
          <a href="#">Prevention Guide</a>
          <Link to="/signup/moh-officer">MOH Portal</Link>
          <a href="#">API Documentation</a>
        </div>
        <div className="footer-links" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{fontWeight: 600, color: 'var(--text)', marginBottom: '4px'}}>Legal</div>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="mailto:support@dengueradar.lk">Contact Support</a>
        </div>
      </div>
    </footer>
  );
}
