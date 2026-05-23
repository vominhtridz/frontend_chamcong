export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const isEmployeeRestricted = (user) => {
  if (!user || user.role !== 'Employee') return false;
  return user.isRestricted ?? (user.status === 'Pending' || !user.isFaceRegistered);
};

export const persistUser = (user) => {
  const isRestricted =
    user.role === 'Employee' && (user.status === 'Pending' || !user.isFaceRegistered);
  localStorage.setItem('user', JSON.stringify({ ...user, isRestricted }));
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getHomePath = (user) => {
  if (!user) return '/login';
  if (user.role === 'Admin') return '/admin/dashboard';
  if (isEmployeeRestricted(user)) return '/profile';
  return '/employee/dashboard';
};
