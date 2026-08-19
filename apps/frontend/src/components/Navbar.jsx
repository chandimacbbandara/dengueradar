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
        <nav className="links">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Overview</Link>
          <Link to="/how-it-works" className={location.pathname === '/how-it-works' ? 'active' : ''}>How It Works</Link>
          <a href="#map">Risk Map</a>
          <a href="#forecast">Predictions</a>
          <a href="#trends">Trends</a>
          <a href="#weather">Weather</a>
          <a href="#alerts">Alerts</a>
        </nav>
        <div className="nav-right">
          <div className="lang-pill" onClick={toggleLanguage}>
            {i18n.language?.toUpperCase().substring(0,2) || 'EN'}
          </div>
          <button className="icon-btn" title="Notifications">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          </button>
          <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            )}
          </button>
          {isAuthenticated ? (
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <Link to={user?.role === 'admin' ? '/admin-dashboard' : user?.role === 'moh_officer' ? '/moh-dashboard' : '/dashboard'} className="avatar" title="Go to Dashboard" style={{textDecoration: 'none'}}>
                {getInitials()}
              </Link>
              <button className="btn" style={{padding: '6px 12px', fontSize: '12px'}} onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Link to="/login" className="btn" style={{padding: '6px 12px', fontSize: '12px', background: 'transparent', border: 'none'}}>Log In</Link>
              <Link to="/signup/general" className="btn primary" style={{padding: '6px 12px', fontSize: '12px'}}>Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
