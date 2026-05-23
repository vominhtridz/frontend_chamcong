import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

const Dashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
  });
  const [pendingFacesCount, setPendingFacesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get('/api/dashboard/stats');
        setStats(res.data.dailyStats);
        setPendingFacesCount(res.data.pendingFacesCount);
      } catch (error) {
        console.error('Lỗi tải dữ liệu Dashboard:', error);
        setStats({ total: 0, present: 0, late: 0, absent: 0 });
        setPendingFacesCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Tổng quan hệ thống</h1>

      {pendingFacesCount > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-md flex items-center justify-between shadow-sm">
          <p className="text-yellow-700 font-medium">
            Có <span className="font-bold text-yellow-900">{pendingFacesCount}</span> nhân viên mới
            chờ lấy mẫu khuôn mặt!
          </p>
          <Link
            to="/admin/employees"
            className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-sm font-semibold rounded transition-colors"
          >
            Cập nhật ngay
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Tổng nhân viên" value={stats.total} color="blue" />
        <StatCard label="Đi làm hôm nay" value={stats.present} color="green" />
        <StatCard label="Đi muộn" value={stats.late} color="orange" />
        <StatCard label="Vắng mặt" value={stats.absent} color="red" />
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color }) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${colors[color]?.split(' ')[1] || 'text-gray-800'}`}>
        {value}
      </p>
    </div>
  );
};

export default Dashboard;
