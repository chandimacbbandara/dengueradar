import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api.js';
import toast from 'react-hot-toast';
import DistrictZoneSelect from '../components/DistrictZoneSelect.jsx';
import PasswordStrength from '../components/PasswordStrength.jsx';
import Icon from '../components/Icon.jsx';

/* ─── 6-box OTP input (shared pattern) ─────────────────────────── */
function OtpInput({ value, onChange }) {
  const inputs = useRef([]);
  const digits  = (value + '      ').slice(0, 6).split('');

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const next = [...digits];
      if (next[i] && next[i] !== ' ') {
        next[i] = ' ';
      } else if (i > 0) {
        next[i - 1] = ' ';
        inputs.current[i - 1]?.focus();
      }
      onChange(next.join('').trimEnd());
      return;
    }
    if (!/^\d$/.test(e.key)) return;
    const next = [...digits];
    next[i] = e.key;
    onChange(next.join('').trimEnd());
    if (i < 5) inputs.current[i + 1]?.focus();
  };

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '24px 0' }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          id={`otp-officer-digit-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d === ' ' ? '' : d}
          onKeyDown={e => handleKey(i, e)}
          onChange={() => {}}
          onFocus={e => e.target.select()}
          style={{
            width: '52px', height: '64px', textAlign: 'center',
            fontSize: '26px', fontWeight: 800,
            border: `2px solid ${d && d !== ' ' ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: '12px',
            background: d && d !== ' ' ? 'var(--color-bg)' : 'var(--color-bg)',
            color: 'var(--color-text-primary)',
            outline: 'none',
            transition: 'all 0.15s ease',
            boxShadow: d && d !== ' ' ? '0 0 0 3px rgba(14,165,165,0.15)' : 'none',
          }}
        />
      ))}
    </div>
  );
}

export default function SignupMohOfficer() {
  const [step, setStep]       = useState('form');
  const [formData, setFormData] = useState({
    officerName: '', email: '', whatsappNumber: '', password: '', confirmPassword: '', employeeId: ''
  });
  const [district, setDistrict] = useState('');
  const [mohZone,  setMohZone]  = useState('');
  const [otp,      setOtp]      = useState('');
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();

  const validate = () => {
    const e = {};
    if (!formData.officerName)                        e.officerName      = 'Required';
    if (!formData.email.includes('@'))                e.email            = 'Invalid email';
    if (!formData.whatsappNumber)                     e.whatsappNumber   = 'Required';
    if (formData.password.length < 8)                 e.password         = 'At least 8 characters';
    if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!district)                                    e.district         = 'Required';
    if (!mohZone)                                     e.mohZone          = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await authAPI.sendOtp({ email: formData.email, name: formData.officerName });
      setStep('otp');
      toast.success(`Verification code sent to ${formData.email}`);
      startCooldown();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const startCooldown = () => {
    setResendCooldown(60);
    const id = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(id); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await authAPI.sendOtp({ email: formData.email, name: formData.officerName });
      toast.success('New code sent!');
      setOtp('');
      startCooldown();
    } catch (err) {
      toast.error('Failed to resend');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    const trimmedOtp = otp.replace(/\s/g, '');
    if (trimmedOtp.length !== 6) { toast.error('Please enter all 6 digits'); return; }
    setLoading(true);
    try {
      await authAPI.verifyOtp({ email: formData.email, otp: trimmedOtp });
      await authAPI.signupMohOfficer({
        ...formData,
        whatsappNumber: '+94' + formData.whatsappNumber.replace(/^0+/, ''),
        district,
        mohZone,
      });
      toast.success('Registration submitted! Pending admin approval.', { duration: 6000 });
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  /* ── OTP step ── */
  if (step === 'otp') {
    return (
      <div className="auth-layout">
        <div className="auth-panel-left">
          <Link to="/" className="text-2xl font-extrabold mb-12 flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
             <Icon name="activity" /> Dengue<span>Radar</span>
          </Link>
          <h1 className="text-4xl font-extrabold mb-4">Check your inbox</h1>
          <p className="text-lg mb-8 max-w-md" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Your official email must be verified before your MOH officer application is submitted.
          </p>
          <ul className="flex flex-col gap-4">
            <li className="flex items-center gap-3"><Icon name="shield" size={20} /> Check spam/junk if you don't see it</li>
            <li className="flex items-center gap-3"><Icon name="alert" size={20} /> Code valid for 10 minutes</li>
            <li className="flex items-center gap-3"><Icon name="activity" size={20} /> Never share your code with anyone</li>
          </ul>
        </div>

        <div className="auth-panel-right">
          <div style={{maxWidth:'440px', width:'100%', margin:'0 auto'}}>

            <div style={{textAlign:'center', marginBottom:'8px'}}>
              <div style={{
                width:'80px', height:'80px', borderRadius:'50%',
                background:'var(--color-primary-light)',
                display:'flex', alignItems:'center', justifyContent:'center',
                margin:'0 auto 16px', fontSize:'36px',
                color: 'var(--color-primary)'
              }}><Icon name="shield" size={40} /></div>
              <h2 className="auth-form-title" style={{marginBottom:'4px'}}>Enter your code</h2>
              <p className="auth-form-subtitle" style={{marginBottom:0}}>
                Sent to <strong>{formData.email}</strong>
              </p>
            </div>

            <form onSubmit={handleVerifyAndRegister}>
              <OtpInput value={otp} onChange={setOtp} />
              <button
                id="verify-otp-officer-btn"
                type="submit"
                className="btn btn-primary w-full justify-center"
                disabled={loading || otp.replace(/\s/g,'').length < 6}
              >
                {loading ? 'Verifying...' : 'Verify & Submit Application'}
              </button>
            </form>

            <div style={{textAlign:'center', marginTop:'24px'}}>
              <p className="text-sm text-muted">Didn't receive it?</p>
              <button
                id="resend-otp-officer-btn"
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                style={{
                  marginTop:'8px', background:'none', border:'none',
                  color: resendCooldown > 0 ? 'var(--color-text-muted)' : 'var(--color-primary)',
                  fontWeight:600, fontSize:'14px',
                  cursor: resendCooldown > 0 ? 'default' : 'pointer',
                }}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
            </div>

            <div style={{textAlign:'center', marginTop:'16px'}}>
              <button
                onClick={() => setStep('form')}
                style={{background:'none', border:'none', color:'var(--color-text-secondary)', fontSize:'13px', cursor:'pointer'}}
              >
                ← Back to registration form
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  /* ── Registration form step ── */
  return (
    <div className="auth-layout">
      <div className="auth-panel-left">
        <Link to="/" className="text-2xl font-extrabold mb-12 flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
           <Icon name="activity" /> Dengue<span>Radar</span>
        </Link>
        <h1 className="text-4xl font-extrabold mb-4">For MOH Officers</h1>
        <p className="text-lg mb-8 max-w-md" style={{ color: 'rgba(255,255,255,0.85)' }}>Access specialized tools to monitor risks, manage resources, and coordinate public health responses.</p>
        <ul className="flex flex-col gap-4">
          <li className="flex items-center gap-3"><Icon name="shield" size={20} /> Detailed risk reports</li>
          <li className="flex items-center gap-3"><Icon name="alert" size={20} /> Zone-level trend analysis</li>
          <li className="flex items-center gap-3"><Icon name="activity" size={20} /> Community outreach tools</li>
        </ul>
      </div>

      <div className="auth-panel-right">
        <div style={{maxWidth:'480px', width:'100%', margin:'0 auto'}}>
          <h2 className="auth-form-title">MOH Registration</h2>
          <p className="auth-form-subtitle">Register for official MOH access to DengueRadar.</p>

          <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Officer Name</label>
              <input type="text" className={`form-input ${errors.officerName?'error':''}`} value={formData.officerName} onChange={e=>setFormData({...formData,officerName:e.target.value})} />
              {errors.officerName && <span className="form-error">{errors.officerName}</span>}
            </div>

            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Official Email</label>
              <input type="email" className={`form-input ${errors.email?'error':''}`} value={formData.email} onChange={e=>setFormData({...formData,email:e.target.value})} />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="grid-2 gap-4">
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">WhatsApp Number</label>
                <div style={{display:'flex'}}>
                  <span style={{padding:'12px',background:'var(--color-bg-subtle)',border:'1.5px solid var(--color-border)',borderRight:'none',borderRadius:'var(--radius-md) 0 0 var(--radius-md)'}}>+94</span>
                  <input type="text" className={`form-input ${errors.whatsappNumber?'error':''}`} style={{borderRadius:'0 var(--radius-md) var(--radius-md) 0',width:'100%'}} placeholder="771234567" value={formData.whatsappNumber} onChange={e=>setFormData({...formData,whatsappNumber:e.target.value})} />
                </div>
                {errors.whatsappNumber && <span className="form-error">{errors.whatsappNumber}</span>}
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">Employee ID (Optional)</label>
                <input type="text" className="form-input" value={formData.employeeId} onChange={e=>setFormData({...formData,employeeId:e.target.value})} />
              </div>
            </div>

            <DistrictZoneSelect district={district} setDistrict={setDistrict} mohZone={mohZone} setMohZone={setMohZone} errors={errors} />

            <div className="grid-2 gap-4">
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">Password</label>
                <input type="password" className={`form-input ${errors.password?'error':''}`} value={formData.password} onChange={e=>setFormData({...formData,password:e.target.value})} />
                <PasswordStrength password={formData.password} />
                {errors.password && <span className="form-error">{errors.password}</span>}
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">Confirm Password</label>
                <input type="password" className={`form-input ${errors.confirmPassword?'error':''}`} value={formData.confirmPassword} onChange={e=>setFormData({...formData,confirmPassword:e.target.value})} />
                {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
              </div>
            </div>

            <div className="alert alert-info mt-2">
              <Icon name="alert" size={16} /> MOH officer accounts require admin approval before you can log in.
            </div>

            <button id="officer-signup-btn" type="submit" className="btn btn-primary w-full justify-center mt-2" disabled={loading}>
              {loading ? 'Sending Code...' : 'Continue — Verify Email →'}
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
