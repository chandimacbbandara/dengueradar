import { useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { useAuthStore } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import { userAPI } from '../services/api.js';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    officerName: user?.officerName || '',
    whatsappNumber: user?.whatsappNumber || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await userAPI.updateProfile(formData);
      updateUser(res.data.user);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const isMoh = user?.role === 'moh_officer';

  return (
    <div className={`dashboard-layout ${!isMoh && user?.role !== 'admin' ? 'citizen-dashboard' : ''}`}>
      <Navbar />
      
      <div className="dashboard-header" style={{ background: 'var(--surface-2)', padding: '32px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="wrap" style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{t('profile.title')}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>{t('profile.subtitle')}</p>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: '32px', paddingBottom: '64px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        
        <div className="card" style={{ padding: '32px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '24px' }}>{t('profile.personalInfo')}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {isMoh ? (
              <div className="form-group">
                <label className="form-label">{t('profile.officerName')}</label>
                <input type="text" className="form-input" value={formData.officerName} onChange={e => setFormData({...formData, officerName: e.target.value})} required />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('profile.firstName')}</label>
                  <input type="text" className="form-input" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('profile.lastName')}</label>
                  <input type="text" className="form-input" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">{t('profile.whatsappNumber')}</label>
              <input type="text" className="form-input" value={formData.whatsappNumber} onChange={e => setFormData({...formData, whatsappNumber: e.target.value})} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('profile.districtRo')}</label>
                <input type="text" className="form-input" style={{ background: 'var(--surface-2)' }} value={user?.district || ''} disabled />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('profile.mohZoneRo')}</label>
                <input type="text" className="form-input" style={{ background: 'var(--surface-2)' }} value={user?.mohZone || ''} disabled />
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? t('profile.saving') : t('profile.saveChanges')}
              </button>
            </div>
          </form>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '24px' }}>{t('profile.accountDetails')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '4px' }}>{t('profile.email')}</p>
              <p style={{ color: 'var(--text)' }}>{user?.email}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '4px' }}>{t('profile.role')}</p>
              <p style={{ color: 'var(--text)', textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '4px' }}>{t('profile.memberSince')}</p>
              <p style={{ color: 'var(--text)' }}>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '4px' }}>{t('profile.password')}</p>
              <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', marginTop: '4px' }}>{t('profile.changePassword')}</button>
            </div>
          </div>
        </div>
        
      </div>
      <Footer />
    </div>
  );
}
