import React from 'react';
import { NavLink } from 'react-router-dom';
import { getStoredUser, isEmployeeRestricted } from '../../utils/auth';

const Sidebar = ({ isOpen, onNavigate }) => {
  const user = getStoredUser();

  if (!user) return null;

  const linkClass = ({ isActive }) => (isActive ? 'active' : undefined);

  const handleNav = () => {
    if (onNavigate) onNavigate();
  };

  return (
    <aside className={`modern-sidebar ${isOpen ? 'open' : ''}`}>
      <nav className="sidebar-nav">
        <h4 className="menu-title">CÁ NHÂN</h4>
        <ul>
          <li>
            <NavLink to="/profile" className={linkClass} onClick={handleNav}>
              👤 Thông tin cá nhân
            </NavLink>
          </li>
          {user.role === 'Employee' && (
            <li>
              <NavLink to="/employee/leaves" className={linkClass} onClick={handleNav}>
                📋 Xin nghỉ phép
              </NavLink>
            </li>
          )}

          {user.role === 'Employee' && !isEmployeeRestricted(user) && (
            <>
              <li>
                <NavLink
                  to="/employee/dashboard"
                  className={linkClass}
                  onClick={handleNav}
                >
                  📊 Bảng điều khiển NV
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/employee/checkin"
                  className={linkClass}
                  onClick={handleNav}
                >
                  ⏰ Check-in / Check-out
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/employee/attendance-test"
                  className={linkClass}
                  onClick={handleNav}
                >
                  🧪 Test chấm công
                </NavLink>
              </li>
            </>
          )}
        </ul>

        {user.role === 'Admin' && (
          <>
            <h4 className="menu-title">QUẢN TRỊ VIÊN</h4>
            <ul>
              <li>
                <NavLink
                  to="/admin/dashboard"
                  className={linkClass}
                  onClick={handleNav}
                >
                  📈 Tổng quan Admin
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/employees"
                  className={linkClass}
                  onClick={handleNav}
                >
                  👥 Quản lý Nhân viên
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/attendance"
                  className={linkClass}
                  onClick={handleNav}
                >
                  📅 Quản lý Chấm công
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/leaves"
                  className={linkClass}
                  onClick={handleNav}
                >
                  📋 Nghỉ phép
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/settings"
                  className={linkClass}
                  onClick={handleNav}
                >
                  ⚙️ Cài đặt hệ thống
                </NavLink>
              </li>
            </ul>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
