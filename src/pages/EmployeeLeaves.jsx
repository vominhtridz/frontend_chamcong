import React from 'react';
import { Link } from 'react-router-dom';
import LeaveRequestPanel from '../components/LeaveRequestPanel';
import { getStoredUser, isEmployeeRestricted } from '../utils/auth';

const EmployeeLeaves = () => {
  const user = getStoredUser();
  const restricted = isEmployeeRestricted(user);

  return (
    <div className="page-shell max-w-3xl">
      <div className="mb-6">
        {!restricted && (
          <Link to="/employee/dashboard" className="text-sm text-indigo-600 hover:underline">
            ← Về bảng điều khiển
          </Link>
        )}
        {restricted && (
          <Link to="/profile" className="text-sm text-indigo-600 hover:underline">
            ← Về hồ sơ cá nhân
          </Link>
        )}
        <h1 className="page-title mt-2">Xin nghỉ phép</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gửi đơn nghỉ cho Admin duyệt. Đơn đã duyệt sẽ được ghi nhận trên hệ thống chấm công.
        </p>
      </div>
      <LeaveRequestPanel />
    </div>
  );
};

export default EmployeeLeaves;
