import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../context/AuthContext.jsx';
import { authAPI } from '../services/api.js';
import toast from 'react-hot-toast';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import Icon from './Icon.jsx';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Theme state initialization from localStorage or system preference
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Apply theme to document element
  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-inner">
        <Link to="/" className="nav-logo" style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '32px', marginRight: '8px' }} />
          Dengue<span>Radar</span>
        </Link>

        <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <ul className={`nav-links ${mobileOpen ? 'open' : ''}`}>
          <li><a href="/#home" className={isActive('/#home')} style={{color: isActive('/#home') ? 'var(--color-primary)' : ''}}>{t('nav.home')}</a></li>
          <li><a href="/#map" className={isActive('/#map')} style={{color: isActive('/#map') ? 'var(--color-primary)' : ''}}>{t('nav.riskMap')}</a></li>
          <li><a href="/#how">{t('nav.about')}</a></li>
          {mobileOpen && (
            <li style={{ marginTop: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border-light)' }}>
              <LanguageSwitcher />
            </li>
          )}
        </ul>

        <div className="nav-actions">
          <button 
            onClick={() => setIsDark(!isDark)}
            style={{
              background: 'none', border: 'none', color: 'var(--color-text-secondary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px',
              marginRight: '8px'
            }}
            aria-label="Toggle Dark Mode"
          >
            {isDark ? <Icon name="sun" size={20} /> : <Icon name="moon" size={20} />}
          </button>
          
          {!mobileOpen && <LanguageSwitcher />}
          <span style={{color: 'var(--color-border-light)', margin: '0 8px'}}>|</span>
          
          {isAuthenticated ? (
            <>
              <span style={{fontSize:'14px', fontWeight:600, marginRight:'8px', color: 'var(--color-text-primary)'}}>
                {user?.firstName || user?.officerName}
              </span>
              <Link 
                to={user?.role === 'admin' ? '/admin-dashboard' : (user?.role === 'moh_officer' ? '/moh-dashboard' : '/dashboard')} 
                className="btn btn-sm btn-outline"
              >
                {t('nav.dashboard')}
              </Link>
              <button onClick={handleLogout} className="btn btn-sm btn-ghost">{t('nav.logout')}</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">{t('nav.login')}</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
