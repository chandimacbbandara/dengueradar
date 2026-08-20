import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../context/AuthContext.jsx';
import { useThemeStore } from '../context/ThemeContext.jsx';
import { authAPI } from '../services/api.js';
import toast from 'react-hot-toast';
import LanguageSwitcher from './LanguageSwitcher.jsx';

export default function Navbar() {
  const { isDark, toggleTheme } = useThemeStore();
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch(e) {
      console.error(e);
    } finally {
      logout();
      toast.success(t('auth.logout') || 'Logged out');
      navigate('/');
    }
  };

  const isActive = (path) => {
    if (path.startsWith('/#')) {
      return location.hash === path.substring(1) ? 'active' : '';
    }
    return location.pathname === path ? 'active' : '';
  };

  const getInitials = () => {
    if (!user) return 'GU';
    const name = user.firstName || user.officerName || 'User';
    return name.substring(0, 2).toUpperCase();
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'si' : (i18n.language === 'si' ? 'ta' : 'en');
    i18n.changeLanguage(nextLang);
  };

  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <Link to="/" className="brand">
          <div className="brand-mark" style={{ background: '#ffffff', padding: '4px', borderRadius: '8px' }}>
            <img src="/cropped-logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div className="brand-name">DengueRadar</div>
            <div className="brand-sub">AI Early Warning</div>
          </div>
        </Link>
        <nav className="links">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Overview</Link>
          <Link to="/how-it-works" className={location.pathname === '/how-it-works' ? 'active' : ''}>How It Works</Link>
          <a href="#map">Live Map</a>
          <a href="#forecast">Predictions</a>
          <a href="#trends">Trends</a>
          <a href="#weather">Weather</a>
        </nav>
        <div className="nav-right">
          <div className="lang-pill">
            <button className={i18n.language === 'en' ? 'active' : ''} onClick={() => i18n.changeLanguage('en')}>EN</button>
            <button className={i18n.language === 'si' ? 'active' : ''} onClick={() => i18n.changeLanguage('si')}>සිං</button>
            <button className={i18n.language === 'ta' ? 'active' : ''} onClick={() => i18n.changeLanguage('ta')}>தமி</button>
          </div>
          
          <button className="icon-btn" onClick={toggleTheme} title="Toggle theme" style={{background:'transparent', border:'none', color:'rgba(255,255,255,0.6)'}}>
            {isDark ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            )}
          </button>

          {isAuthenticated ? (
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <Link to={user?.role === 'admin' ? '/admin-dashboard' : user?.role === 'moh_officer' ? '/moh-dashboard' : '/dashboard'} className="avatar" title="Go to Dashboard" style={{textDecoration: 'none'}}>
                {getInitials()}
              </Link>
              <button className="btn btn-ghost" style={{padding: '8px 14px', fontSize: '12.5px'}} onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Link to="/login" className="btn btn-ghost" style={{padding: '8px 14px', fontSize: '12.5px'}}>Sign in</Link>
              <Link to="/signup/general" className="btn btn-primary" style={{padding: '8px 14px', fontSize: '12.5px'}}>Get Started</Link>
            </div>
          )}
          <svg className="hamburger" width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
      </div>
    </header>
  );
}
