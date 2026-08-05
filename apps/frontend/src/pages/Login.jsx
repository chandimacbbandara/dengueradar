import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api.js';
import { useAuthStore } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

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
      navigate(user?.role === 'moh_officer' ? '/moh-dashboard' : '/dashboard');
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
      
      const from = location.state?.from?.pathname || (userData.role === 'moh_officer' ? '/moh-dashboard' : '/dashboard');
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
        <Link to="/" className="text-2xl font-extrabold text-white mb-12 flex items-center gap-2">
          🦟 Dengue<span style={{color: '#e0f7f7'}}>Radar</span>
        </Link>
        <h1 className="text-4xl font-extrabold mb-4">Welcome Back</h1>
        <p className="text-lg opacity-90 mb-8 max-w-md">
          Access your personalized dashboard to monitor local dengue risks and manage your alert preferences.
        </p>
        <ul className="flex flex-col gap-4">
          <li className="flex items-center gap-3"><span className="text-xl">✅</span> Real-time risk map</li>
          <li className="flex items-center gap-3"><span className="text-xl">✅</span> Instant WhatsApp alerts</li>
          <li className="flex items-center gap-3"><span className="text-xl">✅</span> Accurate AI predictions</li>
        </ul>
      </div>
      
      <div className="auth-panel-right">
        <div style={{maxWidth: '400px', width: '100%', margin: '0 auto'}}>
          <h2 className="auth-form-title">Log in</h2>
          <p className="auth-form-subtitle">Enter your details to access your account.</p>

          {error && <div className="alert alert-error mb-6">{error}</div>}

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
                  style={{position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', color: 'var(--color-text-muted)'}}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center mb-6 mt-2">
              <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
                <input type="checkbox" /> Remember me
              </label>
              <a href="#" className="text-sm font-semibold text-primary">Forgot password?</a>
            </div>

            <button type="submit" className="btn btn-primary w-full justify-center" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-muted">
            Don't have an account? <br/>
            <Link to="/signup/general" className="text-primary font-semibold mx-1">Sign up as Citizen</Link> | 
            <Link to="/signup/moh-officer" className="text-primary font-semibold mx-1">Register as MOH</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
