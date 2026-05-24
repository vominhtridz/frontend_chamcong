import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import LeaveRequestPanel from '../components/LeaveRequestPanel';
import { getStoredUser } from '../utils/auth';
import { shiftLabel } from '../utils/employeeConstants';
import { formatTime, statusLabel, formatMinutes, checkOutStatusLabel } from '../utils/attendanceDisplay';
import { Link } from 'react-router-dom';

const EmployeeDashboard = () => {
  const user = getStoredUser();
  const [loading, setLoading] = useState(true);
  const [workConfig, setWorkConfig] = useState(null);
  const [shiftRecord, setShiftRecord] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [configRes, recordsRes, leavesRes] = await Promise.all([
          axiosClient.get('/api/attendances/work-config'),
          axiosClient.get('/api/attendances/me'),
          axiosClient.get('/api/leaves').catch(() => ({ data: [] })),
        ]);
        setWorkConfig(configRes.data);
        setShiftRecord(configRes.data?.record || null);
        setRecentRecords((recordsRes.data || []).slice(0, 7));
        setPendingLeaves((leavesRes.data || []).filter((l) => l.status === 'Pending').length);
      } catch (error) {
        console.error('Lỗi tải dashboard nhân viên:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>;
  }

  const displayName = user?.fullName || user?.email || 'Nhân viên';
  const shiftDate = workConfig?.shiftDate || '—';
  const shiftName = shiftLabel(workConfig?.workShift);

  return (
    <div className="page-shell">
      <h1 className="page-title mb-1">Xin chào, {displayName}</h1>
      <p className="text-gray-500 text-sm mb-4 md:mb-6">
        Ca {shiftName} · ngày {shiftDate} · {workConfig?.workStartTime} → {workConfig?.workEndTime}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Chấm công ca hiện tại</h2>
          {workConfig?.message && (
            <p className="text-sm text-indigo-600 mb-4">{workConfig.message}</p>
          )}
          {shiftRecord ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Check-in:{' '}
                <span className="font-bold text-blue-600">{formatTime(shiftRecord.checkInTime)}</span>
              </p>
              <p className="text-sm text-gray-600">
                Check-out:{' '}
                <span className="font-bold text-gray-800">
                  {formatTime(shiftRecord.checkOutTime)}
                </span>
              </p>
              <span
                className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                  statusLabel(shiftRecord.status).className
                }`}
              >
                {statusLabel(shiftRecord.status).text}
              </span>
              {shiftRecord.lateMinutes > 0 && (
                <p className="text-sm text-orange-600">Trễ check-in: {shiftRecord.lateMinutes} phút</p>
              )}
              {shiftRecord.workedMinutes > 0 && (
                <p className="text-sm text-gray-600">
                  Giờ làm: {formatMinutes(shiftRecord.workedMinutes)}
                </p>
              )}
              {shiftRecord.checkOutStatus && (
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    checkOutStatusLabel(shiftRecord.checkOutStatus).className
                  }`}
                >
                  {checkOutStatusLabel(shiftRecord.checkOutStatus).text}
                </span>
              )}
              {shiftRecord.note && (
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded border">
                  <span className="font-medium">Ghi chú:</span> {shiftRecord.note}
                </p>
              )}
              {!shiftRecord.checkOutTime && (
                <p className="text-sm text-indigo-600 mt-2">
                  Bạn chưa check-out — có thể check-out bất kỳ lúc nào sau khi đã vào ca.
                </p>
              )}
              {workConfig?.isCompleted && (
                <p className="text-sm text-green-700 mt-2 font-medium">
                  Đã hoàn tất ca hôm nay. Chờ ngày ca tiếp theo để chấm công lại.
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 mb-4">Chưa có chấm công cho ca này.</p>
          )}
          <div className="flex flex-wrap gap-3 mt-4">
            <Link
              to="/employee/checkin"
              className="inline-block text-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow transition"
            >
              ⏰ Check-in / Check-out
            </Link>
            <Link
              to="/employee/attendance-test"
              className="inline-block text-center px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow transition"
            >
              🧪 Test chấm công
            </Link>
          </div>
        </div>

        <div className="space-y-6">
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

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Nghỉ phép</h2>
            <p className="text-sm text-gray-500 mb-3">
              {pendingLeaves > 0
                ? `${pendingLeaves} đơn đang chờ Admin duyệt`
                : 'Gửi đơn xin nghỉ khi cần vắng mặt'}
            </p>
            <Link
              to="/employee/leaves"
              className="inline-block w-full text-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
            >
              📋 Gửi đơn xin nghỉ
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-8">
        <LeaveRequestPanel compact onUpdated={(list) => setPendingLeaves(list.filter((l) => l.status === 'Pending').length)} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-800 px-4 sm:px-6 py-4 border-b">
          Lịch sử chấm công gần đây
        </h2>
        {recentRecords.length === 0 ? (
          <p className="p-6 text-gray-500 text-center">Chưa có lịch sử chấm công.</p>
        ) : (
          <>
            <ul className="md:hidden divide-y divide-gray-200">
              {recentRecords.map((row) => (
                <li key={row.id} className="p-4 flex flex-wrap justify-between gap-2">
                  <span className="font-medium text-gray-800">{row.date}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusLabel(row.status).className}`}
                  >
                    {statusLabel(row.status).text}
                  </span>
                  <p className="w-full text-sm text-gray-600">
                    Vào <span className="font-bold text-blue-600">{formatTime(row.checkInTime)}</span>
                    {' · '}Ra <span className="font-bold">{formatTime(row.checkOutTime)}</span>
                  </p>
                  {row.note && (
                    <p className="w-full text-xs text-gray-500">Ghi chú: {row.note}</p>
                  )}
                </li>
              ))}
            </ul>
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ngày ca
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ghi chú
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
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusLabel(row.status).className}`}
                        >
                          {statusLabel(row.status).text}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {row.note || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;
