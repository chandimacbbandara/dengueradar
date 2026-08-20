import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer>
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <div className="brand" style={{marginBottom: '14px'}}>
              <div className="brand-mark" style={{width: '32px', height: '32px'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C12 2 5 10 5 15a7 7 0 0014 0c0-5-7-13-7-13z" fill="white"/></svg>
              </div>
              <div className="brand-name" style={{fontSize: '15px'}}>DengueRadar</div>
            </div>
            <p style={{fontSize: '13px', color: '#8b96ac', lineHeight: '1.6', maxWidth: '280px'}}>
              AI-powered dengue early warning and public health intelligence platform for Sri Lanka.
            </p>
          </div>
          <div>
            <h5>Platform</h5>
            <ul>
              <li><Link to="/">Overview</Link></li>
              <li><Link to="/how-it-works">How It Works</Link></li>
              <li><a href="#map">Live Map</a></li>
            </ul>
          </div>
          <div>
            <h5>Access</h5>
            <ul>
              <li><Link to="/signup/general">Citizen Sign Up</Link></li>
              <li><Link to="/signup/moh-officer">MOH Officer Portal</Link></li>
              <li><Link to="/login">Sign In</Link></li>
            </ul>
          </div>
          <div>
            <h5>Resources</h5>
            <ul>
              <li><a href="#">Documentation</a></li>
              <li><a href="mailto:support@dengueradar.lk">Contact Support</a></li>
              <li><a href="#">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} DengueRadar Sri Lanka. All rights reserved.</span>
          <span>Built with React · Leaflet · Recharts</span>
        </div>
      </div>
    </footer>
  );
}
