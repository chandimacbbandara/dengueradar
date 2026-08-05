import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api.js';
import toast from 'react-hot-toast';
import DistrictZoneSelect from '../components/DistrictZoneSelect.jsx';
import PasswordStrength from '../components/PasswordStrength.jsx';

export default function SignupGeneral() {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', whatsappNumber: '', password: '', confirmPassword: ''
  });
  const [district, setDistrict] = useState('');
  const [mohZone, setMohZone] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName) newErrors.firstName = 'Required';
    if (!formData.email.includes('@')) newErrors.email = 'Invalid email';
    if (!formData.whatsappNumber) newErrors.whatsappNumber = 'Required';
    if (formData.password.length < 8) newErrors.password = 'Must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!district) newErrors.district = 'Required';
    if (!mohZone) newErrors.mohZone = 'Required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      await authAPI.signupGeneral({
        ...formData,
        whatsappNumber: '+94' + formData.whatsappNumber.replace(/^0+/, ''),
        district,
        mohZone
      });
      toast.success('Account created! Please check your email to verify, then log in.', { duration: 6000 });
      navigate('/login');
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        toast.error(err.response?.data?.message || 'Signup failed');
      }
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
        <h1 className="text-4xl font-extrabold mb-4">Join DengueRadar</h1>
        <p className="text-lg opacity-90 mb-8 max-w-md">Stay ahead of dengue outbreaks and protect your family with our AI early warning system.</p>
        <ul className="flex flex-col gap-4">
          <li className="flex items-center gap-3"><span className="text-xl">📍</span> Localized risk updates</li>
          <li className="flex items-center gap-3"><span className="text-xl">📱</span> WhatsApp push alerts</li>
          <li className="flex items-center gap-3"><span className="text-xl">🛡️</span> Community prevention tips</li>
        </ul>
      </div>
      
      <div className="auth-panel-right">
        <div style={{maxWidth: '480px', width: '100%', margin: '0 auto'}}>
          <h2 className="auth-form-title">Create Account</h2>
          <p className="auth-form-subtitle">Register to receive dengue risk alerts for your area.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid-2 gap-4">
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">First Name</label>
                <input type="text" className={`form-input ${errors.firstName ? 'error' : ''}`} value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                {errors.firstName && <span className="form-error">{errors.firstName}</span>}
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">Last Name</label>
                <input type="text" className="form-input" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
              </div>
            </div>

            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Email Address</label>
              <input type="email" className={`form-input ${errors.email ? 'error' : ''}`} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">WhatsApp Number</label>
              <div style={{display:'flex'}}>
                <span style={{padding:'12px', background:'var(--color-bg-subtle)', border:'1.5px solid var(--color-border)', borderRight:'none', borderRadius:'var(--radius-md) 0 0 var(--radius-md)'}}>+94</span>
                <input type="text" className={`form-input ${errors.whatsappNumber ? 'error' : ''}`} style={{borderRadius:'0 var(--radius-md) var(--radius-md) 0'}} placeholder="771234567" value={formData.whatsappNumber} onChange={e => setFormData({...formData, whatsappNumber: e.target.value})} />
              </div>
              {errors.whatsappNumber && <span className="form-error">{errors.whatsappNumber}</span>}
            </div>

            <DistrictZoneSelect district={district} setDistrict={setDistrict} mohZone={mohZone} setMohZone={setMohZone} errors={errors} />

            <div className="grid-2 gap-4">
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">Password</label>
                <input type="password" className={`form-input ${errors.password ? 'error' : ''}`} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                <PasswordStrength password={formData.password} />
                {errors.password && <span className="form-error">{errors.password}</span>}
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">Confirm Password</label>
                <input type="password" className={`form-input ${errors.confirmPassword ? 'error' : ''}`} value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
                {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm mt-2 cursor-pointer">
              <input type="checkbox" required /> I agree to the Terms of Service and Privacy Policy
            </label>

            <button type="submit" className="btn btn-primary w-full justify-center mt-4" disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-muted">
            Already have an account? <Link to="/login" className="text-primary font-semibold">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
