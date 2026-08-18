import axios from 'axios';

// Determine base URL depending on environment
const API_URL = import.meta.env.PROD 
  ? 'http://145.223.22.182:5000/api'
  : '/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 — try to refresh token, else clear auth and redirect
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    // If it's a 401, not a retry yet, and not the refresh endpoint itself
    if (err.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh-token') {
      originalRequest._retry = true;
      try {
        const res = await axios.post(`${API_URL}/auth/refresh-token`, {}, { withCredentials: true });
        if (res.data?.token) {
          localStorage.setItem('accessToken', res.data.token);
          originalRequest.headers.Authorization = `Bearer ${res.data.token}`;
          return api(originalRequest);
        }
      } catch (refreshErr) {
        // Refresh failed, clear session and redirect
        localStorage.removeItem('accessToken');
        localStorage.removeItem('dengueradar-auth');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    } else if (err.response?.status === 401 && originalRequest.url === '/auth/refresh-token') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('dengueradar-auth');
      window.location.href = '/login';
    }
    
    return Promise.reject(err);
  }
);

export default api;

// Typed API helpers
export const authAPI = {
  sendOtp:          (data) => api.post('/auth/send-otp', data),
  verifyOtp:        (data) => api.post('/auth/verify-otp', data),
  signupGeneral:    (data) => api.post('/auth/signup/general', data),
  signupMohOfficer: (data) => api.post('/auth/signup/moh-officer', data),
  login:            (data) => api.post('/auth/login', data),
  logout:           ()     => api.post('/auth/logout'),
  verifyEmail:      (token) => api.post('/auth/verify-email', { token }),
};

export const referenceAPI = {
  getDistricts: () => api.get('/districts'),
  getMohZones: (district) => api.get(`/moh-zones?district=${encodeURIComponent(district)}`),
};

export const publicAPI = {
  getLiveStats: () => api.get('/stats/live'),
  getNationalRisk: () => api.get('/risk/national'),
  getTopZones: () => api.get('/risk/top-zones'),
  getNationalTrends: () => api.get('/trends/national'),
};

export const userAPI = {
  getDashboard:  () => api.get('/user/dashboard'),
  getZoneTrend:  (period = 'monthly', district, mohZone) => {
    let url = `/user/zone-trend?period=${period}`;
    if (district) url += `&district=${encodeURIComponent(district)}`;
    if (mohZone) url += `&mohZone=${encodeURIComponent(mohZone)}`;
    return api.get(url);
  },
  updateProfile: (data) => api.patch('/user/profile', data),
};

export const mohAPI = {
  getDashboard: (district) => api.get(district ? `/moh/dashboard?district=${encodeURIComponent(district)}` : '/moh/dashboard'),
  getZoneReport: (mohZone) => api.get(`/moh/reports/${encodeURIComponent(mohZone)}`),
  exportZoneReport: (mohZone) => api.get(`/moh/reports/${encodeURIComponent(mohZone)}/export`, { responseType: 'blob' }),
  notifyZone: (mohZone) => api.post('/moh/notify-zone', { mohZone }),
};

export const weatherAPI = {
  getDistrict: (district) => api.get(`/weather/district/${encodeURIComponent(district)}`),
  getAll: () => api.get('/weather/all'),
};

export const adminAPI = {
  getDashboard:   ()         => api.get('/admin/dashboard'),
  getOfficers:    (status)   => api.get(`/admin/officers?status=${status}`),
  approveOfficer: (id)       => api.post(`/admin/officers/${id}/approve`),
  rejectOfficer:  (id, reason) => api.post(`/admin/officers/${id}/reject`, { reason }),
  deleteOfficer:  (id)       => api.delete(`/admin/officers/${id}`),
  getCitizens:    ()         => api.get('/admin/citizens'),
};
