import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Protected route component that redirects to login if not authenticated
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
