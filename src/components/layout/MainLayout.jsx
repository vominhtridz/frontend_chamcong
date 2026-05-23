import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { getStoredUser } from '../../utils/auth';
import './Layout.css';

const MainLayout = () => {
  const token = localStorage.getItem('token');
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Header />
      <div className="app-body">
        <Sidebar />
        <main className="app-content">
          {/* Nơi render các component con dựa theo Route */}
          <Outlet /> 
        </main>
      </div>
    </div>
  );
};

export default MainLayout;