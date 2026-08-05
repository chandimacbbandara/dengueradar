import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user?.role !== role) {
    return <Navigate to={user?.role === 'moh_officer' ? '/moh-dashboard' : '/dashboard'} replace />;
  }

  return children;
}
