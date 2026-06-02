import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import axiosClient from '../api/axiosClient';

const formatTime = (ts) => {
  if (!ts) return '--:--';
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatDateTime = (ts) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('vi-VN');
};

const typeLabel = (type) => {
  const map = {
    check_in: 'Check-in',
    check_out: 'Check-out',
    face_fail: 'Nhận diện thất bại',
    spoof_suspect: 'Nghi ngờ giả mạo',
    unknown_device: 'Thiết bị lạ',
    out_of_zone: 'Ngoài vùng GPS',
    liveness_fail: 'Liveness thất bại',
    time_fail: 'Sai giờ ca',
    api_error: 'Lỗi API',
  };
  return map[type] || type;
};

const MiniMap = ({ center, radiusMeters, pins }) => {
  if (!center?.lat || !center?.lng) {
    return (
      <p className="text-sm text-gray-500 p-4">
        Chưa cấu hình tọa độ vùng làm việc. Vào Cài đặt → Geofencing để thiết lập.
      </p>
    );
  }

  const latRange = 0.01;
  const lngRange = 0.01;

  const toPos = (lat, lng) => ({
    left: `${50 + ((lng - center.lng) / lngRange) * 40}%`,
    top: `${50 - ((lat - center.lat) / latRange) * 40}%`,
  });

  return (
    <div className="relative h-56 bg-slate-100 rounded-lg border overflow-hidden">
      <div
        className="absolute border-2 border-dashed border-blue-400 rounded-full bg-blue-100/30"
        style={{
          left: '30%',
          top: '30%',
          width: '40%',
          height: '40%',
        }}
        title={`Bán kính ${radiusMeters}m`}
      />
      <div
        className="absolute w-3 h-3 bg-blue-600 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 z-10"
        style={toPos(center.lat, center.lng)}
        title="Trung tâm vùng"
      />
      {pins.map((p, i) => (
        <div
          key={`${p.userId}-${i}`}
          className={`absolute w-2.5 h-2.5 rounded-full border border-white -translate-x-1/2 -translate-y-1/2 z-20 ${
            p.inGeofence ? 'bg-green-500' : 'bg-red-500'
          }`}
          style={toPos(p.lat, p.lng)}
          title={p.fullName}
        />
      ))}
      <p className="absolute bottom-2 left-2 text-xs text-gray-600 bg-white/80 px-2 py-0.5 rounded">
        {pins.length} điểm check-in hôm nay · xanh = trong vùng · đỏ = ngoài vùng
      </p>
    </div>
  );
};

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await axiosClient.get('/api/dashboard/overview');
      setData(res.data);
      setLastRefresh(Date.now());
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    const id = setInterval(fetchOverview, 15000);
    return () => clearInterval(id);
  }, [fetchOverview]);

  if (loading && !data) {
    return <div className="py-12 text-center text-gray-500">Đang tải dashboard...</div>;
  }

  if (!data) {
    return <div className="py-12 text-center text-red-600">Không tải được dữ liệu dashboard.</div>;
  }

  const { todayOverview, donut, kpiCards, chart7Days, liveFeed, systemHealth, security, geofence, departmentBreakdown, topLate, pendingTasks, shiftDate } = data;

  return (
    <div className="page-shell space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Dashboard quản trị</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ca ngày {shiftDate} · Cập nhật {formatTime(lastRefresh)}
          </p>
        </div>
        <button
          type="button"
          onClick={fetchOverview}
          className="px-4 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 shadow-sm"
        >
          Làm mới
        </button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {pendingTasks.map((task) => (
          <Link
            key={task.id}
            to={task.link}
            className={`p-4 rounded-xl border shadow-sm hover:shadow transition ${
              task.priority === 'high' ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'
            }`}
          >
            <p className="text-2xl font-bold text-gray-900">{task.count}</p>
            <p className="text-sm text-gray-600 mt-1">{task.label}</p>
          </Link>
        ))}
      </div>

      {/* KPI + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {kpiCards.map((k) => (
            <div key={k.key} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 font-medium">{k.label}</p>
              <p className="text-2xl font-bold mt-1 text-gray-900">{k.value}</p>
            </div>
          ))}
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-2">Hôm nay — tổng quan</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donut}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {donut.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-center text-gray-500 mt-1">
            Tổng {todayOverview.total} NV · Có mặt {todayOverview.present} · Vắng {todayOverview.absent}
          </p>
        </div>
      </div>

      {/* Charts 7 days */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <h2 className="font-semibold mb-4">7 ngày qua — có mặt / vắng</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart7Days}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" name="Có mặt" fill="#22c55e" />
                <Bar dataKey="absent" name="Vắng" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <h2 className="font-semibold mb-4">7 ngày qua — đúng giờ / muộn</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart7Days}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="onTime" name="Đúng giờ" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="late" name="Muộn" stroke="#eab308" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Live feed */}
        <div className="xl:col-span-1 bg-white rounded-xl shadow-sm border flex flex-col max-h-[520px]">
          <h2 className="font-semibold p-4 border-b">Live Feed</h2>
          <div className="overflow-y-auto flex-1 p-3 space-y-3">
            {liveFeed.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Chưa có hoạt động chấm công.</p>
            ) : (
              liveFeed.map((item) => (
                <div key={item.id} className="flex gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gray-200 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-gray-900 truncate">{item.fullName}</p>
                    <p className="text-xs text-indigo-600">{typeLabel(item.type)}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(item.timestamp)}</p>
                    {item.faceDistance != null && (
                      <p className="text-xs text-gray-400">Độ khớp: {Number(item.faceDistance).toFixed(4)}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System health + dept */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <h2 className="font-semibold mb-3">System Health</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className={`p-3 rounded-lg border ${
                  systemHealth.database?.status === 'ok'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <p className="font-medium text-sm">{systemHealth.database?.label}</p>
                <p className="text-lg font-bold capitalize">{systemHealth.database?.status}</p>
                <p className="text-xs text-gray-500">{systemHealth.database?.latencyMs}ms</p>
              </div>
              <div
                className={`p-3 rounded-lg border ${
                  systemHealth.faceApi?.status === 'ok'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <p className="font-medium text-sm">{systemHealth.faceApi?.label}</p>
                <p className="text-lg font-bold capitalize">{systemHealth.faceApi?.status}</p>
                <p className="text-xs text-gray-500">{systemHealth.faceApi?.note}</p>
                {systemHealth.faceApi?.lastSuccessAt && (
                  <p className="text-xs mt-1">Lần cuối: {formatDateTime(systemHealth.faceApi.lastSuccessAt)}</p>
                )}
              </div>
            </div>
            {systemHealth.recentErrors?.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-red-700 mb-1">Lỗi gần đây</p>
                <ul className="text-xs text-red-600 space-y-1 max-h-24 overflow-y-auto">
                  {systemHealth.recentErrors.map((e) => (
                    <li key={e.id}>{e.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <h2 className="font-semibold mb-3">Tuân thủ theo phòng ban</h2>
            <div className="h-48">
              {departmentBreakdown.length === 0 ? (
                <p className="text-sm text-gray-500">Chưa có dữ liệu phòng ban.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentBreakdown} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} unit="%" />
                    <YAxis type="category" dataKey="department" width={75} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Bar dataKey="complianceRate" name="Tỷ lệ đúng giờ" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <h2 className="font-semibold mb-4">Cảnh báo an ninh & gian lận</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SecurityList title="Quét thất bại" items={security.failedAttempts} />
          <SecurityList title="Nghi ngờ giả mạo" items={security.spoofAlerts} />
          <SecurityList title="Thiết bị/IP lạ" items={security.unknownDevices} />
          <SecurityList title="Ngoài vùng GPS" items={security.outOfZone} />
        </div>
      </div>

      {/* Map + Top late */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <h2 className="font-semibold mb-3">Bản đồ check-in (GPS thật)</h2>
          <MiniMap center={geofence.center} radiusMeters={geofence.radiusMeters} pins={geofence.pins} />
          {geofence.pins.map((p) => (
            <p key={p.userId} className="text-xs text-gray-600 mt-2">
              <a
                href={`https://www.google.com/maps?q=${p.lat},${p.lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                {p.fullName}
              </a>
              {' — '}
              {formatTime(p.time)}
              {p.inGeofence ? ' (trong vùng)' : ' (NGOÀI VÙNG)'}
            </p>
          ))}
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <h2 className="font-semibold mb-3">Top đi muộn (7 ngày)</h2>
          {topLate.length === 0 ? (
            <p className="text-sm text-gray-500">Chưa có dữ liệu đi muộn trong tuần.</p>
          ) : (
            <ol className="space-y-3">
              {topLate.map((p, i) => (
                <li key={p.userId} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <div>
                    <span className="font-bold text-indigo-600 mr-2">#{i + 1}</span>
                    <span className="font-medium">{p.fullName}</span>
                    <span className="text-xs text-gray-500 block">{p.department}</span>
                  </div>
                  <span className="text-sm font-semibold text-orange-600">
                    {p.lateCount} lần · ~{p.totalLateMinutes} phút
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};

const SecurityList = ({ title, items }) => (
  <div className="border rounded-lg p-3 bg-slate-50 max-h-48 overflow-y-auto">
    <p className="text-sm font-semibold text-gray-800 mb-2">{title}</p>
    {items.length === 0 ? (
      <p className="text-xs text-gray-500">Không có cảnh báo.</p>
    ) : (
      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id} className="text-xs border-b border-slate-200 pb-2 last:border-0">
            <p className="font-medium">{a.fullName || 'Không rõ'}</p>
            <p className="text-gray-600">{a.message}</p>
            <p className="text-gray-400">{formatDateTime(a.timestamp)}</p>
            {a.faceDistance != null && (
              <p className="text-red-500">Score: {Number(a.faceDistance).toFixed(4)}</p>
            )}
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default Dashboard;
