import React from 'react';
import { NavLink } from 'react-router-dom';
import { getStoredUser, isEmployeeRestricted } from '../../utils/auth';

const Sidebar = () => {
  const user = getStoredUser();

  // Nếu chưa có thông tin user, không hiển thị sidebar (hoặc hiển thị loading)
  if (!user) return null;

  return (
    <aside className="modern-sidebar">
      <nav className="sidebar-nav">
        
        {/* === MENU DÀNH CHO TẤT CẢ MỌI NGƯỜI (CÁ NHÂN) === */}
        <h4 className="menu-title">CÁ NHÂN</h4>
        <ul>
          <li>
            <NavLink to="/profile">👤 Thông tin cá nhân</NavLink>
          </li>
          
          {/* Chỉ hiển thị Dashboard NV nếu role là Employee và KHÔNG bị giới hạn (isRestricted = false) */}
          {user.role === 'Employee' && !isEmployeeRestricted(user) && (
            <>
              <li>
                <NavLink to="/employee/dashboard">📊 Bảng điều khiển NV</NavLink>
              </li>
              <li>
                <NavLink to="/employee/checkin">⏰ Check-in / Check-out</NavLink>
              </li>
            </>
          )}
        </ul>

        {/* === MENU DÀNH RIÊNG CHO ADMIN === */}
        {user.role === 'Admin' && (
          <>
            <h4 className="menu-title">QUẢN TRỊ VIÊN</h4>
            <ul>
              <li>
                <NavLink to="/admin/dashboard">📈 Tổng quan Admin</NavLink>
              </li>
              <li>
                <NavLink to="/admin/employees">👥 Quản lý Nhân viên</NavLink>
              </li>
              <li>
                <NavLink to="/admin/attendance">📅 Quản lý Chấm công</NavLink>
              </li>
              <li>
                <NavLink to="/admin/settings">⚙️ Cài đặt hệ thống</NavLink>
              </li>
            </ul>
          </>
        )}

      </nav>
    </aside>
  );
};

export default Sidebar;