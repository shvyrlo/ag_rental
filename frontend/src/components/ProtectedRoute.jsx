import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Clients must confirm their email before reaching the app. Mechanics
  // and admins are created by an administrator and are grandfathered in.
  if (user.role === 'client' && !user.email_verified) {
    return <Navigate to="/verify" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    const target = user.role === 'admin' ? '/admin'
      : user.role === 'mechanic' ? '/mechanic'
        : '/client';
    return <Navigate to={target} replace />;
  }
  return children;
}
