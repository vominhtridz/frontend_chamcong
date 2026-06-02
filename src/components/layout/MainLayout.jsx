import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { getStoredUser } from '../../utils/auth';
import './Layout.css';

const MainLayout = () => {
  const token = localStorage.getItem('token');
  const user = getStoredUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <div className="app-body">
        <button
          type="button"
          className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
          aria-label="Đóng menu"
          onClick={() => setSidebarOpen(false)}
        />
        <Sidebar isOpen={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
