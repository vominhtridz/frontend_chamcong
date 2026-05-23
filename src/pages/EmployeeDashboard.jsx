import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { getStoredUser } from '../utils/auth';

const formatTime = (timestamp) => {
  if (!timestamp) return '--:--';
  return new Date(timestamp).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusLabel = (status) => {
  if (status === 'OnTime') return { text: 'Đúng giờ', className: 'bg-green-100 text-green-800' };
  if (status === 'Late') return { text: 'Đi muộn', className: 'bg-orange-100 text-orange-800' };
  return { text: status || '—', className: 'bg-gray-100 text-gray-700' };
};

const EmployeeDashboard = () => {
  const user = getStoredUser();
  const [loading, setLoading] = useState(true);
  const [todayRecord, setTodayRecord] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);

  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get('/api/attendances/me');
        const records = res.data || [];
        setTodayRecord(records.find((r) => r.date === todayStr) || null);
        setRecentRecords(records.slice(0, 7));
      } catch (error) {
        console.error('Lỗi tải dashboard nhân viên:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [todayStr]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>;
  }

  const displayName = user?.fullName || user?.email || 'Nhân viên';

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Xin chào, {displayName}</h1>
      <p className="text-gray-500 mb-6">Bảng điều khiển nhân viên — {todayStr}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Chấm công hôm nay</h2>
          {todayRecord ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Check-in:{' '}
                <span className="font-bold text-blue-600">{formatTime(todayRecord.checkInTime)}</span>
              </p>
              <p className="text-sm text-gray-600">
                Check-out:{' '}
                <span className="font-bold text-gray-800">
                  {formatTime(todayRecord.checkOutTime)}
                </span>
              </p>
              <span
                className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                  statusLabel(todayRecord.status).className
                }`}
              >
                {statusLabel(todayRecord.status).text}
              </span>
              {!todayRecord.checkOutTime && (
                <p className="text-sm text-indigo-600 mt-2">
                  Bạn chưa check-out. Hãy quét khuôn mặt để kết thúc ca làm.
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 mb-4">Bạn chưa chấm công hôm nay.</p>
          )}
          <Link
            to="/employee/checkin"
            className="inline-block mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow transition"
          >
            ⏰ Đi tới Check-in / Check-out
          </Link>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Tài khoản</h2>
          <p className="text-sm text-gray-600 mb-1">
            Trạng thái:{' '}
            <span className="font-semibold text-gray-800">{user?.status || '—'}</span>
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Khuôn mặt:{' '}
            {user?.isFaceRegistered ? (
              <span className="text-green-600 font-semibold">Đã đăng ký</span>
            ) : (
              <span className="text-red-600 font-semibold">Chưa đăng ký</span>
            )}
          </p>
          <Link to="/profile" className="text-indigo-600 hover:underline text-sm font-medium">
            Xem hồ sơ cá nhân →
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-800 px-6 py-4 border-b">
          Lịch sử gần đây
        </h2>
        {recentRecords.length === 0 ? (
          <p className="p-6 text-gray-500 text-center">Chưa có lịch sử chấm công.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ngày
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Vào
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Ra
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentRecords.map((row) => (
                <tr key={row.id}>
                  <td className="px-6 py-4 text-sm text-gray-800">{row.date}</td>
                  <td className="px-6 py-4 text-sm text-center text-blue-600 font-medium">
                    {formatTime(row.checkInTime)}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700">
                    {formatTime(row.checkOutTime)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusLabel(row.status).className
                      }`}
                    >
                      {statusLabel(row.status).text}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;
