import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import {
  LEAVE_TYPES,
  emptyLeaveForm,
  formatLeaveDate,
  leaveTypeLabel,
  leaveStatusLabel,
  leaveStatusClass,
} from '../utils/leaveConstants';

const LeaveRequestPanel = ({ compact = false, onUpdated }) => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyLeaveForm());

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/api/leaves');
      setLeaves(res.data);
      onUpdated?.(res.data);
    } catch (error) {
      console.error('Lỗi tải đơn nghỉ:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const stats = useMemo(
    () => ({
      pending: leaves.filter((l) => l.status === 'Pending').length,
      approved: leaves.filter((l) => l.status === 'Approved').length,
    }),
    [leaves]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.dateTo < form.dateFrom) {
      alert('Ngày kết thúc phải từ ngày bắt đầu trở đi.');
      return;
    }
    try {
      setSubmitting(true);
      await axiosClient.post('/api/leaves', form);
      alert('Đã gửi đơn xin nghỉ phép. Admin sẽ duyệt trong thời gian sớm nhất.');
      setForm(emptyLeaveForm());
      setShowForm(false);
      fetchLeaves();
    } catch (error) {
      alert(error.response?.data?.message || 'Không gửi được đơn nghỉ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (leave) => {
    if (leave.status !== 'Pending') return;
    if (!window.confirm('Huỷ đơn nghỉ đang chờ duyệt?')) return;
    try {
      await axiosClient.delete(`/api/leaves/${leave.id}`);
      fetchLeaves();
    } catch (error) {
      alert(error.response?.data?.message || 'Không huỷ được đơn');
    }
  };

  const displayList = compact ? leaves.slice(0, 5) : leaves;

  return (
    <div className="space-y-4">
      {compact && (
        <h2 className="text-lg font-semibold text-gray-800">Đơn xin nghỉ phép của bạn</h2>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {!compact && <h2 className="text-lg font-semibold text-gray-800">Đơn xin nghỉ phép</h2>}
          <p className="text-sm text-gray-500">
            {stats.pending > 0 && (
              <span className="text-amber-600 font-medium">{stats.pending} đơn chờ duyệt</span>
            )}
            {stats.pending > 0 && stats.approved > 0 && ' · '}
            {stats.approved > 0 && (
              <span className="text-green-600">{stats.approved} đơn đã duyệt</span>
            )}
            {stats.pending === 0 && stats.approved === 0 && 'Chưa có đơn nghỉ phép'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow"
        >
          {showForm ? 'Đóng form' : '+ Gửi đơn xin nghỉ'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Loại nghỉ">
              <select
                required
                className="border rounded w-full p-2 text-sm bg-white"
                value={form.leaveType}
                onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Từ ngày">
              <input
                type="date"
                required
                className="border rounded w-full p-2 text-sm bg-white"
                value={form.dateFrom}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setForm({ ...form, dateFrom: e.target.value })}
              />
            </Field>
            <Field label="Đến ngày">
              <input
                type="date"
                required
                className="border rounded w-full p-2 text-sm bg-white"
                value={form.dateTo}
                min={form.dateFrom || new Date().toISOString().slice(0, 10)}
                onChange={(e) => setForm({ ...form, dateTo: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Lý do">
            <textarea
              required
              className="border rounded w-full p-2 text-sm bg-white"
              rows={3}
              placeholder="Mô tả lý do xin nghỉ..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </Field>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(emptyLeaveForm());
              }}
              className="flex-1 py-2 border rounded text-sm bg-white"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-60"
            >
              {submitting ? 'Đang gửi...' : 'Gửi đơn'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-gray-500 text-sm">Đang tải đơn nghỉ...</p>
        ) : displayList.length === 0 ? (
          <p className="p-6 text-center text-gray-500 text-sm">Bạn chưa gửi đơn nghỉ phép nào.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {displayList.map((leave) => (
              <li key={leave.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{leaveTypeLabel(leave.leaveType)}</span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${leaveStatusClass(leave.status)}`}
                    >
                      {leaveStatusLabel(leave.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {formatLeaveDate(leave.dateFrom)} → {formatLeaveDate(leave.dateTo)}
                  </p>
                  {leave.reason && (
                    <p className="text-xs text-gray-500 mt-1 truncate" title={leave.reason}>
                      {leave.reason}
                    </p>
                  )}
                  {leave.adminNote && leave.status !== 'Pending' && (
                    <p className="text-xs text-indigo-600 mt-1">Admin: {leave.adminNote}</p>
                  )}
                </div>
                {leave.status === 'Pending' && (
                  <button
                    type="button"
                    onClick={() => handleCancel(leave)}
                    className="text-xs px-3 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 shrink-0"
                  >
                    Huỷ đơn
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {compact && leaves.length > 5 && (
          <p className="p-3 text-center text-xs text-gray-500 border-t">
            Hiển thị 5 đơn gần nhất ·{' '}
            <Link to="/employee/leaves" className="text-indigo-600 hover:underline">
              Xem tất cả
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

export default LeaveRequestPanel;
