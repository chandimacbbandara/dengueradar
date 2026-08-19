import { useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { useAuthStore } from '../context/AuthContext.jsx';
import { userAPI } from '../services/api.js';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, updateUser } = useAuthStore();
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
      
      <div className="dashboard-header" style={{ background: 'var(--surface-2)' }}>
        <div className="container">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Account Settings</h1>
          <p className="text-muted mt-1" style={{ color: 'var(--text-2)' }}>Manage your profile and notification preferences</p>
        </div>
      </div>

      <div className="dashboard-content" style={{maxWidth: '800px', margin: '0 auto', width: '100%'}}>
        
        <div className="card p-8 mb-6">
          <h2 className="text-lg font-bold mb-6" style={{ color: 'var(--text)' }}>Personal Information</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {isMoh ? (
              <div className="form-group">
                <label className="form-label">Officer Name</label>
                <input type="text" className="form-input" value={formData.officerName} onChange={e => setFormData({...formData, officerName: e.target.value})} required />
              </div>
            ) : (
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input type="text" className="form-input" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input type="text" className="form-input" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">WhatsApp Number</label>
              <input type="text" className="form-input" value={formData.whatsappNumber} onChange={e => setFormData({...formData, whatsappNumber: e.target.value})} required />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">District (Read-only)</label>
                <input type="text" className="form-input" style={{ background: 'var(--surface-2)' }} value={user?.district || ''} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">MOH Zone (Read-only)</label>
                <input type="text" className="form-input" style={{ background: 'var(--surface-2)' }} value={user?.mohZone || ''} disabled />
              </div>
            </div>

            <div className="mt-4">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        <div className="card p-8">
          <h2 className="text-lg font-bold mb-6" style={{ color: 'var(--text)' }}>Account Details</h2>
          <div className="grid-2 gap-6">
            <div>
              <p className="text-sm font-bold uppercase mb-1" style={{ color: 'var(--text-3)' }}>Email Address</p>
              <p style={{ color: 'var(--text)' }}>{user?.email}</p>
            </div>
            <div>
              <p className="text-sm font-bold uppercase mb-1" style={{ color: 'var(--text-3)' }}>Account Role</p>
              <p className="capitalize" style={{ color: 'var(--text)' }}>{user?.role?.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm font-bold uppercase mb-1" style={{ color: 'var(--text-3)' }}>Member Since</p>
              <p style={{ color: 'var(--text)' }}>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-bold uppercase mb-1" style={{ color: 'var(--text-3)' }}>Password</p>
              <button className="btn btn-sm btn-outline mt-1">Change Password</button>
            </div>
          </div>
        </div>
        
      </div>
      <Footer />
    </div>
  );
}
