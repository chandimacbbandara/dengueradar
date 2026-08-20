import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import SignupGeneral from './pages/SignupGeneral.jsx';
import SignupMohOfficer from './pages/SignupMohOfficer.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MohDashboard from './pages/MohDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Profile from './pages/Profile.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ThemeInit from './components/ThemeInit.jsx';
import ChatWidget from './components/ChatWidget.jsx';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeInit />
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontFamily: 'Inter, sans-serif', borderRadius: '12px' } }} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
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
            path="/admin-dashboard"
            element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>}
          />
          <Route
            path="/profile"
            element={<ProtectedRoute><Profile /></ProtectedRoute>}
          />
        </Routes>
        <ChatWidget />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
