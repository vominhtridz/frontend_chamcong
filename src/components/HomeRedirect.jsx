import { Navigate } from 'react-router-dom';
import { getHomePath, getStoredUser } from '../utils/auth';

const HomeRedirect = () => {
  const token = localStorage.getItem('token');
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getHomePath(user)} replace />;
};

export default HomeRedirect;
