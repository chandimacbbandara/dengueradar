import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api.js';
import { useAuthStore } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import Icon from '../components/Icon.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'admin') navigate('/admin-dashboard');
      else navigate(user?.role === 'moh_officer' ? '/moh-dashboard' : '/dashboard');
    }
  }, [isAuthenticated, navigate, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authAPI.login({ email, password });
      const { user: userData, token } = res.data;
      
      login(userData, token);
      toast.success('Welcome back!');
      
      const from = location.state?.from?.pathname || (
        userData.role === 'admin' ? '/admin-dashboard' :
        userData.role === 'moh_officer' ? '/moh-dashboard' : '/dashboard'
      );
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-panel-left">
        <Link to="/" style={{ fontSize: '24px', fontWeight: 800, marginBottom: '48px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--teal)', textDecoration: 'none' }}>
          <Icon name="activity" /> Dengue<span style={{ color: 'var(--text)' }}>Radar</span>
        </Link>
        <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px', lineHeight: 1.2 }}>Welcome Back</h1>
        <p style={{ fontSize: '18px', marginBottom: '32px', maxWidth: '400px', color: 'var(--text-2)' }}>
          Access your personalized dashboard to monitor local dengue risks and manage your alert preferences.
        </p>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '16px', listStyle: 'none', padding: 0 }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Icon name="shield" size={20} color="var(--teal)" /> Real-time risk map</li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Icon name="alert-triangle" size={20} color="var(--teal)" /> Instant WhatsApp alerts</li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Icon name="activity" size={20} color="var(--teal)" /> Accurate AI predictions</li>
        </ul>
      </div>
      
      <div className="auth-panel-right">
        <div style={{maxWidth: '400px', width: '100%', margin: '0 auto'}}>
          <h2 className="auth-form-title">Log in</h2>
          <p className="auth-form-subtitle">Enter your details to access your account.</p>

          {error && <div className="alert" style={{ marginBottom: '24px', borderRadius: 'var(--r-sm)' }}><span className="dot-live" style={{background:'var(--risk-crit)'}}></span><div><div style={{fontSize:'14px', fontWeight:600}}>{error}</div></div></div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required 
              />
            </div>
            
            <div className="form-group relative">
              <label className="form-label">Password</label>
              <div style={{position: 'relative'}}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="form-input" 
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', color: 'var(--text-3)'}}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-2)', cursor: 'pointer' }}>
                <input type="checkbox" /> Remember me
              </label>
              <a href="#" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--teal)', textDecoration: 'none' }}>Forgot password?</a>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: 'var(--text-3)' }}>
            Don't have an account? <br/>
            <Link to="/signup/general" style={{ color: 'var(--teal)', fontWeight: 600, margin: '0 4px', textDecoration: 'none' }}>Sign up as Citizen</Link> | 
            <Link to="/signup/moh-officer" style={{ color: 'var(--teal)', fontWeight: 600, margin: '0 4px', textDecoration: 'none' }}>Register as MOH</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
