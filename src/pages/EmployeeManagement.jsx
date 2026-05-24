import React, { useState, useEffect, useMemo } from 'react';
import axiosClient from '../api/axiosClient';
import FaceRegistrationModal from './FaceRegistrationModal';
import {
  WORK_SHIFTS,
  shiftLabel,
  FACE_DATA_STATUS,
  qualityBadge,
} from '../utils/employeeConstants';

const emptyForm = () => ({
  employee_code: '',
  full_name: '',
  department: '',
  position: '',
  phone: '',
  email: '',
  work_shift: 'office',
  status: 'Pending',
});

const formatDate = (ts) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('vi-VN');
};

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [selectedEmpForFace, setSelectedEmpForFace] = useState(null);
  const [reRegisterMode, setReRegisterMode] = useState(false);
  const [detailEmp, setDetailEmp] = useState(null);
  const [faceHistory, setFaceHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const importInputRef = React.useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [faceFilter, setFaceFilter] = useState('All');
  const [shiftFilter, setShiftFilter] = useState('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm());

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/api/employees');
      setEmployees(res.data);
    } catch (error) {
      console.error('Lỗi fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const stats = useMemo(() => {
    const total = employees.length;
    const ready = employees.filter((e) => e.faceDataStatus === 'ready').length;
    const needsUpdate = employees.filter((e) => e.faceDataStatus === 'needs_update').length;
    const none = employees.filter((e) => e.faceDataStatus === 'none').length;
    return { total, ready, needsUpdate, none };
  }, [employees]);

  const handleOpenFaceModal = (emp, reRegister = false) => {
    setSelectedEmpForFace(emp);
    setReRegisterMode(reRegister);
    setFaceModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData(emptyForm());
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setEditingId(emp.id);
    setFormData({
      employee_code: emp.employee_code,
      full_name: emp.full_name,
      department: emp.department || '',
      position: emp.position || '',
      phone: emp.phone || '',
      email: emp.email || '',
      work_shift: emp.work_shift || 'office',
      status: emp.status || 'Pending',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axiosClient.put(`/api/employees/${editingId}`, formData);
        alert('Cập nhật thành công!');
      } else {
        await axiosClient.post('/api/employees', formData);
        alert('Thêm nhân viên thành công!');
      }
      setIsModalOpen(false);
      fetchEmployees();
    } catch (error) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id, name) => {
    if (
      !window.confirm(
        `Xóa nhân viên "${name}" và toàn bộ dữ liệu sinh trắc? Không thể hoàn tác.`
      )
    ) {
      return;
    }
    try {
      await axiosClient.delete(`/api/employees/${id}`);
      alert('Đã xóa thành công!');
      fetchEmployees();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi khi xóa');
    }
  };

  const handleResetFace = async (emp) => {
    if (!window.confirm(`Xóa toàn bộ embedding của ${emp.full_name}?`)) return;
    try {
      await axiosClient.post(`/api/employees/${emp.id}/reset-face`);
      alert('Đã reset dữ liệu khuôn mặt.');
      fetchEmployees();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi');
    }
  };

  const handleMarkNeedsUpdate = async (emp) => {
    try {
      await axiosClient.post(`/api/employees/${emp.id}/mark-face-update`);
      fetchEmployees();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi');
    }
  };

  const openDetail = async (emp) => {
    setDetailEmp(emp);
    setFaceHistory([]);
    setHistoryLoading(true);
    try {
      const res = await axiosClient.get(`/api/employees/${emp.id}/face-history`);
      setFaceHistory(res.data);
    } catch {
      setFaceHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await axiosClient.get('/api/employees/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `nhan-vien-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Không export được CSV');
    }
  };

  const handleImportCsv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const csvText = await file.text();
      const res = await axiosClient.post('/api/employees/import/csv', { csvText });
      const errMsg = res.data.errors?.length ? `\n\nLỗi:\n${res.data.errors.join('\n')}` : '';
      alert(`${res.data.message}${errMsg}`);
      fetchEmployees();
    } catch (error) {
      alert(error.response?.data?.message || 'Import thất bại');
    } finally {
      e.target.value = '';
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      emp.full_name?.toLowerCase().includes(q) ||
      emp.employee_code?.toLowerCase().includes(q) ||
      emp.department?.toLowerCase().includes(q) ||
      emp.email?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' || emp.status === statusFilter;
    const matchFace = faceFilter === 'All' || emp.faceDataStatus === faceFilter;
    const matchShift = shiftFilter === 'All' || emp.work_shift === shiftFilter;
    return matchSearch && matchStatus && matchFace && matchShift;
  });

  const FaceBadge = ({ status }) => {
    const cfg = FACE_DATA_STATUS[status] || FACE_DATA_STATUS.none;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
        <span>{cfg.icon}</span> {cfg.label}
      </span>
    );
  };

  const ActionButtons = ({ emp }) => (
    <div className="flex flex-wrap gap-1 justify-center">
      <button
        type="button"
        onClick={() => handleOpenFaceModal(emp, emp.isFaceRegistered)}
        className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium"
        title="Trích xuất vector embedding từ ảnh khuôn mặt"
      >
        {emp.isFaceRegistered ? '🔄 Re-Extract' : '🧬 Extract Embeddings'}
      </button>
      {emp.isFaceRegistered && (
        <>
          <button
            type="button"
            onClick={() => openDetail(emp)}
            className="text-xs px-2 py-1 rounded bg-slate-50 text-slate-700 hover:bg-slate-100"
          >
            Chi tiết
          </button>
          <button
            type="button"
            onClick={() => handleResetFace(emp)}
            className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
          >
            Reset
          </button>
        </>
      )}
      {emp.faceDataStatus === 'ready' && (
        <button
          type="button"
          onClick={() => handleMarkNeedsUpdate(emp)}
          className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100"
        >
          Đánh dấu cần cập nhật
        </button>
      )}
      <button
        type="button"
        onClick={() => handleOpenEdit(emp)}
        className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
      >
        Sửa
      </button>
      <button
        type="button"
        onClick={() => handleDelete(emp.id, emp.full_name)}
        className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
      >
        Xóa
      </button>
    </div>
  );

  return (
    <div className="page-shell">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-4 md:mb-6">
        <div>
          <h1 className="page-title">Quản lý Nhân viên & Sinh trắc học</h1>
          <p className="text-sm text-gray-500 mt-1">
            CRUD nhân viên · Trích xuất embedding AI · Gán ca làm việc
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportCsv}
            className="w-full sm:w-auto border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded shadow-sm text-sm"
          >
            ⬇ Export CSV
          </button>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="w-full sm:w-auto border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded shadow-sm text-sm"
          >
            ⬆ Import CSV
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportCsv}
          />
          <button
            type="button"
            onClick={handleOpenAdd}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded shadow transition"
          >
            + Thêm nhân viên
          </button>
        </div>
      </div>

      {/* Thống kê sinh trắc */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Tổng NV" value={stats.total} color="blue" />
        <StatCard label="Đã có embedding" value={stats.ready} color="green" />
        <StatCard label="Cần cập nhật" value={stats.needsUpdate} color="amber" />
        <StatCard label="Chưa có dữ liệu" value={stats.none} color="gray" />
      </div>

      {/* Bộ lọc */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          type="text"
          placeholder="Tìm tên, mã, phòng ban, email..."
          className="border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">Mọi trạng thái</option>
          <option value="Active">Đang làm</option>
          <option value="Pending">Chờ duyệt</option>
          <option value="Inactive">Nghỉ / Khóa</option>
        </select>
        <select
          className="border rounded px-3 py-2"
          value={faceFilter}
          onChange={(e) => setFaceFilter(e.target.value)}
        >
          <option value="All">Mọi trạng thái khuôn mặt</option>
          <option value="ready">Đã có dữ liệu</option>
          <option value="needs_update">Cần cập nhật</option>
          <option value="none">Chưa có</option>
        </select>
        <select
          className="border rounded px-3 py-2"
          value={shiftFilter}
          onChange={(e) => setShiftFilter(e.target.value)}
        >
          <option value="All">Mọi ca làm</option>
          {WORK_SHIFTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Mobile list */}
      <div className="md:hidden bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Không có nhân viên.</div>
        ) : (
          <ul className="divide-y">
            {filteredEmployees.map((emp) => (
              <li key={emp.id} className="p-4">
                <div className="flex gap-3">
                  {emp.profileImage ? (
                    <img src={emp.profileImage} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                      {emp.full_name?.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{emp.full_name}</p>
                    <p className="text-xs text-gray-500">
                      {emp.employee_code} · {emp.department} · {shiftLabel(emp.work_shift)}
                    </p>
                    <div className="mt-1">
                      <FaceBadge status={emp.faceDataStatus} />
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <ActionButtons emp={emp} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : (
          <table className="data-table min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NV</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thông tin</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ca làm</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sinh trắc</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Chất lượng</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    Không tìm thấy nhân viên
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const q = qualityBadge(emp.faceQualityScore);
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {emp.profileImage ? (
                            <img
                              src={emp.profileImage}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                              {emp.full_name?.charAt(0)}
                            </div>
                          )}
                          <span className="font-bold">{emp.employee_code}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{emp.full_name}</p>
                        <p className="text-xs text-gray-500">
                          {emp.department}
                          {emp.position ? ` · ${emp.position}` : ''}
                        </p>
                        <p className="text-xs text-gray-400">{emp.email}</p>
                        {emp.phone && <p className="text-xs text-gray-400">{emp.phone}</p>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-medium bg-purple-50 text-purple-800 px-2 py-1 rounded">
                          {shiftLabel(emp.work_shift)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <FaceBadge status={emp.faceDataStatus} />
                        <p className="text-xs text-gray-400 mt-1">{emp.faceSampleCount || 0} vector</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold ${q.className}`}>{q.text}</span>
                        {emp.recentFaceFails > 0 && (
                          <p className="text-xs text-red-500">{emp.recentFaceFails} lỗi/tuần</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={emp.status} />
                      </td>
                      <td className="px-4 py-3">
                        <ActionButtons emp={emp} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Form modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 px-4 overflow-y-auto py-8">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Sửa nhân viên' : 'Thêm nhân viên mới'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Field label="Mã NV *">
                <input
                  required
                  disabled={!!editingId}
                  className="w-full border rounded px-3 py-2 disabled:bg-gray-100"
                  value={formData.employee_code}
                  onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                />
              </Field>
              <Field label="Họ và tên *">
                <input
                  required
                  className="w-full border rounded px-3 py-2"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phòng ban">
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </Field>
                <Field label="Chức vụ">
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Email">
                <input
                  type="email"
                  className="w-full border rounded px-3 py-2"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@company.com"
                />
              </Field>
              <Field label="Số điện thoại">
                <input
                  className="w-full border rounded px-3 py-2"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </Field>
              <Field label="Ca làm việc">
                <select
                  className="w-full border rounded px-3 py-2"
                  value={formData.work_shift}
                  onChange={(e) => setFormData({ ...formData, work_shift: e.target.value })}
                >
                  {WORK_SHIFTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({s.hours})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Trạng thái">
                <select
                  className="w-full border rounded px-3 py-2"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Pending">Chờ duyệt</option>
                  <option value="Active">Đang làm việc</option>
                  <option value="Inactive">Nghỉ / Khóa</option>
                </select>
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded">
                  Hủy
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Biometric detail modal */}
      {detailEmp && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 px-4">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Chi tiết sinh trắc học</h2>
            <div className="flex gap-4 mb-4">
              {detailEmp.profileImage && (
                <img
                  src={detailEmp.profileImage}
                  alt=""
                  className="w-24 h-24 rounded-lg object-cover border"
                />
              )}
              <div>
                <p className="font-bold">{detailEmp.full_name}</p>
                <p className="text-sm text-gray-500">{detailEmp.employee_code}</p>
                <FaceBadge status={detailEmp.faceDataStatus} />
              </div>
            </div>
            <dl className="text-sm space-y-2">
              <Row label="Số vector embedding" value={`${detailEmp.faceSampleCount || 0} × 128 chiều`} />
              <Row label="Độ khớp tốt nhất" value={detailEmp.faceQualityScore?.toFixed(4) ?? '—'} />
              <Row label="Đánh giá" value={detailEmp.faceQualityLabel} />
              <Row label="Lần trích xuất cuối" value={formatDate(detailEmp.lastExtractedAt)} />
              <Row label="Lỗi nhận diện (7 ngày)" value={detailEmp.recentFaceFails ?? 0} />
              <Row label="Ca làm việc" value={shiftLabel(detailEmp.work_shift)} />
            </dl>
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Lịch sử trích xuất embedding</h3>
              {historyLoading ? (
                <p className="text-xs text-gray-400">Đang tải...</p>
              ) : faceHistory.length === 0 ? (
                <p className="text-xs text-gray-400">Chưa có lịch sử (lần re-extract tiếp theo sẽ lưu bản cũ).</p>
              ) : (
                <ul className="max-h-40 overflow-y-auto text-xs space-y-2 border rounded p-2 bg-gray-50">
                  {faceHistory.map((h) => (
                    <li key={h.id} className="border-b border-gray-100 pb-1 last:border-0">
                      <span className="font-medium">{formatDate(h.archivedAt)}</span>
                      {' · '}
                      {h.sampleCount} mẫu
                      {h.registrationQuality?.bestDistance != null &&
                        ` · ${(h.registrationQuality.bestDistance * 100).toFixed(0)}%`}
                      {h.action === 're_extract' && ' · Re-extract'}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  handleOpenFaceModal(detailEmp, true);
                  setDetailEmp(null);
                }}
                className="flex-1 py-2 bg-indigo-600 text-white rounded text-sm"
              >
                Re-Extract Embeddings
              </button>
              <button
                type="button"
                onClick={() => setDetailEmp(null)}
                className="px-4 py-2 border rounded text-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {faceModalOpen && selectedEmpForFace && (
        <FaceRegistrationModal
          key={`${selectedEmpForFace.id}-${reRegisterMode}`}
          employee={selectedEmpForFace}
          reRegister={reRegisterMode}
          onClose={() => {
            setFaceModalOpen(false);
            setSelectedEmpForFace(null);
          }}
          onSuccess={fetchEmployees}
        />
      )}
    </div>
  );
};

const StatCard = ({ label, value, color }) => {
  const colors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    amber: 'text-amber-600',
    gray: 'text-gray-600',
  };
  return (
    <div className="bg-white p-4 rounded-xl border shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
    </div>
  );
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
      status === 'Active'
        ? 'bg-green-50 text-green-700 border-green-200'
        : status === 'Pending'
          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
          : 'bg-red-50 text-red-700 border-red-200'
    }`}
  >
    {status === 'Active' ? 'Đang làm' : status === 'Pending' ? 'Chờ duyệt' : 'Khóa'}
  </span>
);

const Field = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex justify-between border-b border-gray-100 pb-1">
    <dt className="text-gray-500">{label}</dt>
    <dd className="font-medium text-gray-800">{value}</dd>
  </div>
);

export default EmployeeManagement;
