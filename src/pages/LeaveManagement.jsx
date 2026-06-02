import React, { useState, useEffect, useMemo } from 'react';
import axiosClient from '../api/axiosClient';
import {
  LEAVE_TYPES,
  formatLeaveDate,
  leaveTypeLabel,
  leaveStatusLabel,
  leaveStatusClass,
  emptyLeaveForm,
} from '../utils/leaveConstants';

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewId, setReviewId] = useState(null);
  const [form, setForm] = useState({ userId: '', ...emptyLeaveForm() });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leaveRes, empRes] = await Promise.all([
        axiosClient.get('/api/leaves'),
        axiosClient.get('/api/employees'),
      ]);
      setLeaves(leaveRes.data);
      setEmployees(empRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    if (statusFilter === 'All') return leaves;
    return leaves.filter((l) => l.status === statusFilter);
  }, [leaves, statusFilter]);

  const stats = useMemo(
    () => ({
      pending: leaves.filter((l) => l.status === 'Pending').length,
      approved: leaves.filter((l) => l.status === 'Approved').length,
      rejected: leaves.filter((l) => l.status === 'Rejected').length,
    }),
    [leaves]
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post('/api/leaves', form);
      alert('Đã tạo đơn nghỉ phép');
      setShowForm(false);
      setForm({ userId: '', ...emptyLeaveForm() });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi tạo đơn');
    }
  };

  const handleReview = async (id, status) => {
    try {
      await axiosClient.patch(`/api/leaves/${id}/status`, {
        status,
        adminNote: reviewNote,
      });
      setReviewId(null);
      setReviewNote('');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi cập nhật');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Xóa đơn nghỉ của "${name}"?`)) return;
    try {
      await axiosClient.delete(`/api/leaves/${id}`);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Không xóa được');
    }
  };

  return (
    <div className="page-shell">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-6">
        <div>
          <h1 className="page-title">Quản lý Nghỉ phép</h1>
          <p className="text-sm text-gray-500 mt-1">Duyệt đơn xin nghỉ · Tạo đơn thay nhân viên</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded shadow"
        >
          + Tạo đơn nghỉ
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Chờ duyệt" value={stats.pending} color="amber" />
        <StatCard label="Đã duyệt" value={stats.approved} color="green" />
        <StatCard label="Từ chối" value={stats.rejected} color="red" />
      </div>

      <div className="mb-4">
        <select
          className="border rounded px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">Tất cả trạng thái</option>
          <option value="Pending">Chờ duyệt</option>
          <option value="Approved">Đã duyệt</option>
          <option value="Rejected">Từ chối</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Không có đơn nghỉ phép.</div>
        ) : (
          <table className="data-table min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Nhân viên</th>
                <th className="px-4 py-3 text-left">Loại</th>
                <th className="px-4 py-3 text-left">Từ – Đến</th>
                <th className="px-4 py-3 text-left">Lý do</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((leave) => (
                <tr key={leave.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{leave.fullName}</p>
                    <p className="text-xs text-gray-500">
                      {leave.employeeCode} · {leave.department}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {leaveTypeLabel(leave.leaveType)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatLeaveDate(leave.dateFrom)} → {formatLeaveDate(leave.dateTo)}
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate" title={leave.reason}>
                    {leave.reason || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${leaveStatusClass(leave.status)}`}
                    >
                      {leaveStatusLabel(leave.status)}
                    </span>
                    {leave.adminNote && (
                      <p className="text-xs text-gray-400 mt-1">{leave.adminNote}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {leave.status === 'Pending' ? (
                      <div className="flex flex-wrap gap-1 justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewId(leave.id);
                            setReviewNote('');
                          }}
                          className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700"
                        >
                          Duyệt/Từ chối
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(leave.id, leave.fullName)}
                          className="text-xs px-2 py-1 rounded bg-red-50 text-red-600"
                        >
                          Xóa
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 px-4">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Tạo đơn nghỉ phép</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <Field label="Nhân viên">
                <select
                  required
                  className="border rounded w-full p-2 text-sm"
                  value={form.userId}
                  onChange={(e) => setForm({ ...form, userId: e.target.value })}
                >
                  <option value="">— Chọn —</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employee_code} — {e.full_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Loại nghỉ">
                <select
                  className="border rounded w-full p-2 text-sm"
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
              <div className="grid grid-cols-2 gap-3">
                <Field label="Từ ngày">
                  <input
                    type="date"
                    required
                    className="border rounded w-full p-2 text-sm"
                    value={form.dateFrom}
                    onChange={(e) => setForm({ ...form, dateFrom: e.target.value })}
                  />
                </Field>
                <Field label="Đến ngày">
                  <input
                    type="date"
                    required
                    className="border rounded w-full p-2 text-sm"
                    value={form.dateTo}
                    onChange={(e) => setForm({ ...form, dateTo: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Lý do">
                <textarea
                  className="border rounded w-full p-2 text-sm"
                  rows={3}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </Field>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border rounded"
                >
                  Hủy
                </button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded">
                  Gửi đơn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewId && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 px-4">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm">
            <h2 className="text-lg font-bold mb-3">Phản hồi đơn nghỉ</h2>
            <textarea
              className="border rounded w-full p-2 text-sm mb-4"
              rows={3}
              placeholder="Ghi chú admin (tuỳ chọn)"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleReview(reviewId, 'Approved')}
                className="flex-1 py-2 bg-green-600 text-white rounded text-sm"
              >
                Duyệt
              </button>
              <button
                type="button"
                onClick={() => handleReview(reviewId, 'Rejected')}
                className="flex-1 py-2 bg-red-600 text-white rounded text-sm"
              >
                Từ chối
              </button>
              <button
                type="button"
                onClick={() => setReviewId(null)}
                className="px-4 py-2 border rounded text-sm"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, color }) => {
  const colors = { amber: 'text-amber-600', green: 'text-green-600', red: 'text-red-600' };
  return (
    <div className="bg-white p-4 rounded-xl border shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

export default LeaveManagement;
