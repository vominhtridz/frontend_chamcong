import React from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuth, getStoredUser } from '../../utils/auth';

const Header = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const displayName =
    user?.fullName || user?.personalInfo?.fullName || user?.email || 'User';

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  return (
    <header className="modern-header">
      <div className="header-logo">
        <h2>Hệ Thống Chấm Công</h2>
      </div>
      <div className="header-actions">
        <div className="user-info">
          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4F46E5&color=fff`}
            alt="Avatar"
            className="avatar"
          />
          <span>
            Xin chào, <strong>{displayName}</strong>
            {user?.role === 'Admin' && (
              <span className="text-xs ml-1 text-indigo-200">(Admin)</span>
            )}
          </span>
        </div>
        <button type="button" onClick={handleLogout} className="btn-logout">
          Đăng xuất
        </button>
      </div>
    </header>
  );
};

export default Header;
