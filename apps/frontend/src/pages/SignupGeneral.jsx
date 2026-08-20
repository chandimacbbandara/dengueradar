import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api.js';
import toast from 'react-hot-toast';
import DistrictZoneSelect from '../components/DistrictZoneSelect.jsx';
import PasswordStrength from '../components/PasswordStrength.jsx';
import Icon from '../components/Icon.jsx';
import Navbar from '../components/Navbar.jsx';

/* ─── 6-box OTP input ───────────────────────────────────────────── */
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
          id={`otp-digit-${i}`}
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
            border: `2px solid ${d && d !== ' ' ? 'var(--brand)' : 'var(--border)'}`,
            borderRadius: '12px',
            background: d && d !== ' ' ? 'var(--color-bg)' : 'var(--color-bg)',
            color: 'var(--text)',
            outline: 'none',
            transition: 'all 0.15s ease',
            boxShadow: d && d !== ' ' ? '0 0 0 3px rgba(14,165,165,0.15)' : 'none',
          }}
        />
      ))}
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────────── */
export default function SignupGeneral() {
  const { t } = useTranslation();
  const [step, setStep]     = useState('form');   // 'form' | 'otp'
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', whatsappNumber: '', password: '', confirmPassword: ''
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
    if (!formData.firstName)                          e.firstName      = 'Required';
    if (!formData.lastName)                           e.lastName       = 'Required';
    if (!formData.email.includes('@'))                e.email          = 'Invalid email';
    if (!formData.whatsappNumber)                     e.whatsappNumber = 'Required';
    if (formData.password.length < 8)                 e.password       = 'At least 8 characters';
    if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!district)                                    e.district       = 'Required';
    if (!mohZone)                                     e.mohZone        = 'Required';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await authAPI.sendOtp({ email: formData.email, name: formData.firstName });
      setStep('otp');
      toast.success(`Verification code sent to ${formData.email}`);
      startCooldown();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const startCooldown = () => {
    setResendCooldown(60);
    const id = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await authAPI.sendOtp({ email: formData.email, name: formData.firstName });
      toast.success('New code sent!');
      setOtp('');
      startCooldown();
    } catch (err) {
      toast.error('Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    const trimmedOtp = otp.replace(/\s/g, '');
    if (trimmedOtp.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    try {
      await authAPI.verifyOtp({ email: formData.email, otp: trimmedOtp });
      const payload = {
        name: formData.firstName + ' ' + formData.lastName,
        email: formData.email,
        password: formData.password,
        whatsappNumber: '+94' + formData.whatsappNumber.replace(/^0+/, ''),
        district,
        mohZone,
        role: 'general'
      };
      const res = await authAPI.signupGeneral(payload);
      const { token } = res.data;
      
      // We don't auto-login here since auth logic depends on useAuthStore login function which isn't used here.
      // Easiest is to redirect to login.
      toast.success('Account created successfully!');
      navigate('/login');

    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  /* ── OTP step UI ── */
  if (step === 'otp') {
    return (
      <>
      <Navbar />
      <div className="auth-layout">
        <div className="auth-panel-left">

          <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px', lineHeight: 1.2 }}>Check your inbox</h1>
          <p style={{ fontSize: '18px', marginBottom: '32px', maxWidth: '400px', color: 'var(--text-2)' }}>
            We sent a 6-digit verification code to protect your account.
          </p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '16px', listStyle: 'none', padding: 0 }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Icon name="shield" size={20} color="var(--teal)" /> Check spam/junk if you don't see it</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Icon name="alert-triangle" size={20} color="var(--teal)" /> Code valid for 10 minutes</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Icon name="activity" size={20} color="var(--teal)" /> Never share your code with anyone</li>
          </ul>
        </div>

        <div className="auth-panel-right">
          <div style={{maxWidth:'440px', width:'100%', margin:'0 auto'}}>

            <div style={{textAlign:'center', marginBottom:'8px'}}>
              <div style={{
                width:'80px', height:'80px', borderRadius:'50%',
                background:'var(--brand-light)',
                display:'flex', alignItems:'center', justifyContent:'center',
                margin:'0 auto 16px', fontSize:'36px',
                color: 'var(--brand)'
              }}><Icon name="shield" size={40} /></div>
              <h2 className="auth-form-title" style={{marginBottom:'4px'}}>Enter your code</h2>
              <p className="auth-form-subtitle" style={{marginBottom:0}}>
                Sent to <strong>{formData.email}</strong>
              </p>
            </div>

            <form onSubmit={handleVerifyAndRegister}>
              <OtpInput value={otp} onChange={setOtp} />
              
              <button
                id="verify-otp-btn"
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={loading || otp.replace(/\s/g,'').length < 6}
              >
                {loading ? 'Verifying...' : 'Verify & Create Account'}
              </button>
            </form>

            <div style={{textAlign:'center', marginTop:'24px'}}>
              <p className="text-sm text-muted">Didn't receive it?</p>
              <button
                id="resend-otp-btn"
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                style={{
                  marginTop:'8px', background:'none', border:'none',
                  color: resendCooldown > 0 ? 'var(--text-3)' : 'var(--brand)',
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
                style={{background:'none', border:'none', color:'var(--text-2)', fontSize:'13px', cursor:'pointer'}}
              >
                ← Back to sign up form
              </button>
            </div>

          </div>
        </div>
      </div>
      </>
    );
  }

  /* ── Registration form step ── */
  return (
    <>
      <Navbar />
      <div className="auth-layout">
      <div className="auth-panel-left">
        <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px', lineHeight: 1.2 }}>{t('auth.leftTitle')}</h1>
        <p style={{ fontSize: '18px', marginBottom: '32px', maxWidth: '400px', color: 'var(--text-2)' }}>
          {t('auth.leftDesc')}
        </p>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '16px', listStyle: 'none', padding: 0 }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Icon name="shield" size={20} color="var(--teal)" /> {t('auth.leftPoint1')}</li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Icon name="alert-triangle" size={20} color="var(--teal)" /> {t('auth.leftPoint2')}</li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Icon name="activity" size={20} color="var(--teal)" /> {t('auth.leftPoint3')}</li>
        </ul>
      </div>

      <div className="auth-panel-right">
        <div style={{maxWidth:'480px', width:'100%', margin:'0 auto'}}>
          <h2 className="auth-form-title">{t("auth.signupTitle")}</h2>
          <p className="auth-form-subtitle">{t("auth.signupSubtitle")}</p>

          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">{t("auth.name")} (First)</label>
                <input type="text" className={`form-input ${errors.firstName?'error':''}`} value={formData.firstName} onChange={e=>setFormData({...formData,firstName:e.target.value})} />
                {errors.firstName && <span className="form-error">{errors.firstName}</span>}
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">Last Name</label>
                <input type="text" className={`form-input ${errors.lastName?'error':''}`} value={formData.lastName} onChange={e=>setFormData({...formData,lastName:e.target.value})} />
                {errors.lastName && <span className="form-error">{errors.lastName}</span>}
              </div>
            </div>

            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">{t("auth.email")}</label>
              <input type="email" className={`form-input ${errors.email?'error':''}`} value={formData.email} onChange={e=>setFormData({...formData,email:e.target.value})} />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">{t("auth.phone")} (WhatsApp)</label>
              <div style={{display:'flex'}}>
                <span style={{padding:'12px',background:'var(--surface-2)',border:'1.5px solid var(--border)',borderRight:'none',borderRadius:'var(--radius-md) 0 0 var(--radius-md)'}}>+94</span>
                <input type="text" className={`form-input ${errors.whatsappNumber?'error':''}`} style={{borderRadius:'0 var(--radius-md) var(--radius-md) 0',width:'100%'}} placeholder="771234567" value={formData.whatsappNumber} onChange={e=>setFormData({...formData,whatsappNumber:e.target.value})} />
              </div>
              <span style={{fontSize:'12px', color:'var(--text-3)', marginTop:'4px'}}>Used for severe risk alerts only.</span>
              {errors.whatsappNumber && <span className="form-error">{errors.whatsappNumber}</span>}
            </div>

            <DistrictZoneSelect district={district} setDistrict={setDistrict} mohZone={mohZone} setMohZone={setMohZone} errors={errors} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">{t("auth.password")}</label>
                <input type="password" className={`form-input ${errors.password?'error':''}`} value={formData.password} onChange={e=>setFormData({...formData,password:e.target.value})} />
                <PasswordStrength password={formData.password} />
                {errors.password && <span className="form-error">{errors.password}</span>}
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">{t("auth.passwordConfirm")}</label>
                <input type="password" className={`form-input ${errors.confirmPassword?'error':''}`} value={formData.confirmPassword} onChange={e=>setFormData({...formData,confirmPassword:e.target.value})} />
                {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
              </div>
            </div>

            <button id="general-signup-btn" type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop:'8px' }} disabled={loading}>
              {loading ? 'Sending Code...' : 'Continue — Verify Email →'}
            </button>
          </form>

          <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: 'var(--text-3)' }}>
            {t('auth.haveAccount')} <Link to="/login" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>{t('auth.loginHere')}</Link>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
