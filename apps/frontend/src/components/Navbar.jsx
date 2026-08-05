import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../context/AuthContext.jsx';
import { authAPI } from '../services/api.js';
import toast from 'react-hot-toast';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

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
      toast.success('Logged out successfully');
      navigate('/');
    }
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-inner">
        <Link to="/" className="nav-logo">
          🦟 Dengue<span>Radar</span>
        </Link>

        <ul className={`nav-links ${mobileOpen ? 'open' : ''}`}>
          <li><a href="/#home">Home</a></li>
          <li><a href="/#map">Map</a></li>
          <li><a href="/#how">How It Works</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>

        <div className="nav-actions">
          {isAuthenticated ? (
            <>
              <span style={{fontSize:'14px', fontWeight:600, marginRight:'8px'}}>
                {user?.firstName || user?.officerName}
              </span>
              <Link 
                to={user?.role === 'moh_officer' ? '/moh-dashboard' : '/dashboard'} 
                className="btn btn-sm btn-outline"
              >
                Dashboard
              </Link>
              <button onClick={handleLogout} className="btn btn-sm btn-ghost">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Login</Link>
              <Link to="/signup/general" className="btn btn-primary">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
