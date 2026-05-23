import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

const Settings = () => {
  const [settings, setSettings] = useState({
    workStartTime: '08:00',
    workEndTime: '17:30',
    lateThreshold: 15,
    imgbbApiKey: ''
  });

  useEffect(() => {
    axiosClient
      .get('/api/auth/settings')
      .then((res) => setSettings((prev) => ({ ...prev, ...res.data })))
      .catch(() => alert('Không tải được cài đặt hệ thống'));
  }, []);

  const handleSave = async () => {
    try {
      await axiosClient.put('/api/auth/settings', settings);
      alert('Cấu hình đã được lưu!');
    } catch (e) { alert('Lỗi lưu cài đặt'); }
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Cài đặt Hệ thống</h1>

      {/* Nhóm 1: Giờ làm việc */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4 border-b pb-2">Ca làm việc</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Giờ bắt đầu</label>
            <input type="time" className="border p-2 rounded w-full" value={settings.workStartTime} 
              onChange={(e) => setSettings({...settings, workStartTime: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm mb-1">Giờ kết thúc</label>
            <input type="time" className="border p-2 rounded w-full" value={settings.workEndTime} 
              onChange={(e) => setSettings({...settings, workEndTime: e.target.value})} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm mb-1">Ngưỡng tính đi muộn (phút)</label>
            <input type="number" className="border p-2 rounded w-full" value={settings.lateThreshold} 
              onChange={(e) => setSettings({...settings, lateThreshold: e.target.value})} />
          </div>
        </div>
      </div>

      {/* Nhóm 2: API Keys */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4 border-b pb-2">Cấu hình tích hợp</h2>
        <label className="block text-sm mb-1">ImgBB API Key</label>
        <input type="password" className="border p-2 rounded w-full" value={settings.imgbbApiKey} 
          onChange={(e) => setSettings({...settings, imgbbApiKey: e.target.value})} />
        <p className="text-xs text-gray-500 mt-1">Dùng để upload ảnh bằng chứng chấm công.</p>
      </div>

      <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700">
        Lưu thay đổi
      </button>
    </div>
  );
};

export default Settings;