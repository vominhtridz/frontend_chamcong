import { Navigate, Outlet } from 'react-router-dom';
import { getHomePath, getStoredUser, isEmployeeRestricted } from '../utils/auth';

const ProtectedRoute = ({ allowedRoles, allowRestrictedEmployee = false }) => {
  const token = localStorage.getItem('token');
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getHomePath(user)} replace />;
  }

  if (user.role === 'Employee') {
    const restricted = isEmployeeRestricted(user);

    if (restricted && !allowRestrictedEmployee) {
      return <Navigate to="/profile" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
