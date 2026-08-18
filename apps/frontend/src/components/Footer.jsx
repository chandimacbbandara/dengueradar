import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher.jsx';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div>
            <div className="footer-logo" style={{ display: 'flex', alignItems: 'center' }}>
              <img src="/logo.png" alt="Logo" style={{ height: '32px', marginRight: '8px' }} />
              Dengue<span>Radar</span>
            </div>
            <p className="footer-tagline" style={{color: '#94A3B8'}}>
              {t('footer.tagline')}
            </p>
          </div>
          <div className="footer-col">
            <h4>{t('footer.quickLinks')}</h4>
            <ul>
              <li><a href="#home">{t('nav.home')}</a></li>
              <li><a href="#map">{t('nav.riskMap')}</a></li>
              <li><Link to="/login">{t('nav.login')}</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <ul>
              <li><a href="#">Prevention Guide</a></li>
              <li><Link to="/signup/moh-officer">MOH Portal</Link></li>
              <li><a href="#">API Documentation</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>{t('footer.contact')}</h4>
            <ul>
              <li><a href="mailto:support@dengueradar.lk">support@dengueradar.lk</a></li>
              <li><a href="#">Emergency: 1999</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} DengueRadar Sri Lanka. {t('footer.rights')}</p>
          <div className="flex gap-4 items-center">
            <LanguageSwitcher />
            <span style={{color: 'rgba(255,255,255,0.2)'}}>|</span>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
