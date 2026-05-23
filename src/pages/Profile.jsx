import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { persistUser } from '../utils/auth';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchProfile = async () => {
    try {
      const res = await axiosClient.get('/api/auth/me');
      const profile = res.data.data || res.data;
      setUser(profile);
      if (profile?.role === 'Employee') {
        persistUser({
          id: profile.id,
          email: profile.email,
          role: profile.role,
          status: profile.status,
          isFaceRegistered: profile.isFaceRegistered,
          fullName: profile.personalInfo?.fullName,
        });
      }

    } catch (err) {
      console.error('Lỗi load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  fetchProfile();
}, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-lg font-semibold text-gray-600 animate-pulse">
          Đang tải thông tin...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center mt-10 text-red-500 font-semibold">
        Không thể tải thông tin người dùng
      </div>
    );
  }

  // Hàm render màu trạng thái
  const getStatusStyle = () => {
    switch (user.status) {
      case 'Active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Inactive':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Hàm render text trạng thái
  const getStatusText = () => {
    switch (user.status) {
      case 'Active':
        return user.isFaceRegistered ? '✅ Đã kích hoạt chấm công' : '⏳ Chờ Admin cấp quyền khuôn mặt';
      case 'Pending':
        return '⏳ Đang chờ Admin cấp quyền';
      case 'Inactive':
        return '❌ Bị khóa';
      default:
        return 'Không xác định';
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Banner */}
        <div className="h-44 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 relative">
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/10"></div>
        </div>

        {/* Content */}
        <div className="px-8 pb-10 -mt-20 relative z-10">
          
          {/* Avatar + Info */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            
            <div className="flex flex-col md:flex-row items-center md:items-end gap-5">
              
              {/* Avatar */}
              <img
                src={
                  user.profileImage ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user.personalInfo?.fullName || 'User'
                  )}&background=4F46E5&color=fff&size=256`
                }
                alt="Avatar"
                className="w-40 h-40 rounded-full border-4 border-white object-cover shadow-xl bg-gray-200"
              />

              {/* User Info */}
              <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold text-gray-800">
                  {user.personalInfo?.fullName || 'Chưa cập nhật'}
                </h1>

                <p className="text-gray-500 mt-1">{user.email}</p>

                <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
                  
                  {/* Status */}
                  <span
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${getStatusStyle()}`}
                  >
                    {getStatusText()}
                  </span>

                  {/* Role */}
                  <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                    {user.role === 'Admin'
                      ? '👑 Quản trị viên'
                      : '👨‍💼 Nhân viên'}
                  </span>

                  {/* Face Registered */}
                  <span
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${
                      user.isFaceRegistered
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-red-100 text-red-700 border-red-200'
                    }`}
                  >
                    {user.isFaceRegistered
                      ? '📸 Đã đăng ký khuôn mặt'
                      : '⚠️ Chưa đăng ký khuôn mặt'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Thông tin chi tiết */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* Phòng ban */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 hover:shadow-md transition">
              <p className="text-xs uppercase font-bold text-gray-500">
                Phòng ban
              </p>

              <p className="text-lg font-semibold text-gray-800 mt-2">
                {user.personalInfo?.department || 'Chưa cập nhật'}
              </p>
            </div>

            {/* Chức vụ */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 hover:shadow-md transition">
              <p className="text-xs uppercase font-bold text-gray-500">
                Chức vụ
              </p>

              <p className="text-lg font-semibold text-gray-800 mt-2">
                {user.personalInfo?.position || 'Chưa cập nhật'}
              </p>
            </div>

            {/* Số điện thoại */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 hover:shadow-md transition">
              <p className="text-xs uppercase font-bold text-gray-500">
                Số điện thoại
              </p>

              <p className="text-lg font-semibold text-gray-800 mt-2">
                {user.personalInfo?.phoneNumber || 'Chưa cập nhật'}
              </p>
            </div>

            {/* Email */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 hover:shadow-md transition">
              <p className="text-xs uppercase font-bold text-gray-500">
                Email
              </p>

              <p className="text-lg font-semibold text-gray-800 mt-2 break-all">
                {user.email}
              </p>
            </div>

            {/* Ngày tham gia */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 hover:shadow-md transition">
              <p className="text-xs uppercase font-bold text-gray-500">
                Ngày tham gia
              </p>

              <p className="text-lg font-semibold text-gray-800 mt-2">
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('vi-VN')
                  : '---'}
              </p>
            </div>

            {/* Cập nhật lần cuối */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 hover:shadow-md transition">
              <p className="text-xs uppercase font-bold text-gray-500">
                Cập nhật lần cuối
              </p>

              <p className="text-lg font-semibold text-gray-800 mt-2">
                {user.updatedAt
                  ? new Date(user.updatedAt).toLocaleString('vi-VN')
                  : '---'}
              </p>
            </div>
          </div>

          {/* Face Data */}
          <div className="mt-10 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              🔐 Thông tin nhận diện khuôn mặt
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              <div>
                <p className="text-sm text-gray-500 font-semibold">
                  Trạng thái Face ID
                </p>

                <p
                  className={`mt-2 font-bold ${
                    user.isFaceRegistered
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {user.isFaceRegistered
                    ? 'Đã đăng ký khuôn mặt'
                    : 'Chưa đăng ký khuôn mặt'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 font-semibold">
                  Số dữ liệu khuôn mặt
                </p>

                <p className="mt-2 font-bold text-indigo-600">
                  {user.faceData?.length || 0} mẫu dữ liệu
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;