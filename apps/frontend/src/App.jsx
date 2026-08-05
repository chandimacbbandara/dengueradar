import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import SignupGeneral from './pages/SignupGeneral.jsx';
import SignupMohOfficer from './pages/SignupMohOfficer.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MohDashboard from './pages/MohDashboard.jsx';
import Profile from './pages/Profile.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontFamily: 'Inter, sans-serif', borderRadius: '12px' } }} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup/general" element={<SignupGeneral />} />
        <Route path="/signup/moh-officer" element={<SignupMohOfficer />} />
        <Route
          path="/dashboard"
          element={<ProtectedRoute role="general"><Dashboard /></ProtectedRoute>}
        />
        <Route
          path="/moh-dashboard"
          element={<ProtectedRoute role="moh_officer"><MohDashboard /></ProtectedRoute>}
        />
        <Route
          path="/profile"
          element={<ProtectedRoute><Profile /></ProtectedRoute>}
        />
      </Routes>
    </BrowserRouter>
  );
}
