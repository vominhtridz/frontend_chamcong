import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { WORK_SHIFTS } from '../utils/employeeConstants';

const defaultShiftTimes = () =>
  Object.fromEntries(
    WORK_SHIFTS.map((s) => {
      const [start, end] = (s.hours || '08:00 – 17:30').split(' – ');
      return [s.id, { workStartTime: start, workEndTime: end, lateThreshold: 15 }];
    })
  );

const Settings = () => {
  const [settings, setSettings] = useState({
    shiftTimes: defaultShiftTimes(),
    geofenceEnabled: false,
    geofenceLat: '',
    geofenceLng: '',
    geofenceRadiusMeters: 500,
    imgbbApiKey: '',
  });

  useEffect(() => {
    axiosClient
      .get('/api/auth/settings')
      .then((res) =>
        setSettings((prev) => ({
          ...prev,
          ...res.data,
          shiftTimes: { ...defaultShiftTimes(), ...(res.data.shiftTimes || {}) },
        }))
      )
      .catch(() => alert('Không tải được cài đặt hệ thống'));
  }, []);

  const updateShiftTime = (shiftId, field, value) => {
    setSettings((prev) => ({
      ...prev,
      shiftTimes: {
        ...prev.shiftTimes,
        [shiftId]: { ...prev.shiftTimes[shiftId], [field]: value },
      },
    }));
  };

  const handleSave = async () => {
    try {
      await axiosClient.put('/api/auth/settings', {
        ...settings,
        geofenceRadiusMeters: Number(settings.geofenceRadiusMeters) || 500,
        geofenceLat: settings.geofenceLat === '' ? null : Number(settings.geofenceLat),
        geofenceLng: settings.geofenceLng === '' ? null : Number(settings.geofenceLng),
        shiftTimes: Object.fromEntries(
          Object.entries(settings.shiftTimes || {}).map(([id, row]) => [
            id,
            {
              workStartTime: row.workStartTime,
              workEndTime: row.workEndTime,
              lateThreshold: Number(row.lateThreshold) || 0,
            },
          ])
        ),
      });
      alert('Cấu hình đã được lưu!');
    } catch {
      alert('Lỗi lưu cài đặt');
    }
  };

  return (
    <div className="page-shell max-w-4xl">
      <h1 className="page-title mb-4 md:mb-6">Cài đặt Hệ thống</h1>

      <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-4 md:mb-6">
        <h2 className="text-lg font-semibold mb-2 border-b pb-2">Giờ làm theo ca</h2>
        <p className="text-xs text-gray-500 mb-4">
          Mỗi nhân viên được gán ca trong Quản lý Nhân viên. Hệ thống dùng khung giờ tương ứng khi
          check-in/check-out.
        </p>
        <div className="space-y-4">
          {WORK_SHIFTS.map((shift) => {
            const row = settings.shiftTimes?.[shift.id] || {};
            return (
              <div key={shift.id} className="border rounded-lg p-4 bg-gray-50">
                <p className="font-medium text-gray-800 mb-3">
                  {shift.label}{' '}
                  <span className="text-xs font-normal text-gray-500">({shift.hours})</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs mb-1">Giờ bắt đầu</label>
                    <input
                      type="time"
                      className="border p-2 rounded w-full text-sm"
                      value={row.workStartTime || ''}
                      onChange={(e) => updateShiftTime(shift.id, 'workStartTime', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Giờ kết thúc</label>
                    <input
                      type="time"
                      className="border p-2 rounded w-full text-sm"
                      value={row.workEndTime || ''}
                      onChange={(e) => updateShiftTime(shift.id, 'workEndTime', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Phút trễ tối đa</label>
                    <input
                      type="number"
                      min="0"
                      className="border p-2 rounded w-full text-sm"
                      value={row.lateThreshold ?? 15}
                      onChange={(e) => updateShiftTime(shift.id, 'lateThreshold', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-4 md:mb-6">
        <h2 className="text-lg font-semibold mb-4 border-b pb-2">Geofencing (vùng GPS)</h2>
        <label className="flex items-center gap-2 mb-4 text-sm">
          <input
            type="checkbox"
            checked={Boolean(settings.geofenceEnabled)}
            onChange={(e) => setSettings({ ...settings, geofenceEnabled: e.target.checked })}
          />
          Bật cảnh báo khi chấm công ngoài vùng cho phép
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Vĩ độ (lat)</label>
            <input
              type="number"
              step="any"
              className="border p-2 rounded w-full"
              value={settings.geofenceLat}
              onChange={(e) => setSettings({ ...settings, geofenceLat: e.target.value })}
              placeholder="10.762622"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Kinh độ (lng)</label>
            <input
              type="number"
              step="any"
              className="border p-2 rounded w-full"
              value={settings.geofenceLng}
              onChange={(e) => setSettings({ ...settings, geofenceLng: e.target.value })}
              placeholder="106.660172"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Bán kính (mét)</label>
            <input
              type="number"
              min="50"
              className="border p-2 rounded w-full"
              value={settings.geofenceRadiusMeters}
              onChange={(e) => setSettings({ ...settings, geofenceRadiusMeters: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-4 md:mb-6">
        <h2 className="text-lg font-semibold mb-4 border-b pb-2">Cấu hình tích hợp</h2>
        <label className="block text-sm mb-1">ImgBB API Key</label>
        <input
          type="password"
          className="border p-2 rounded w-full"
          value={settings.imgbbApiKey}
          onChange={(e) => setSettings({ ...settings, imgbbApiKey: e.target.value })}
        />
        <p className="text-xs text-gray-500 mt-1">Dùng để upload ảnh bằng chứng chấm công.</p>
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded shadow hover:bg-blue-700"
      >
        Lưu thay đổi
      </button>
    </div>
  );
};

export default Settings;
