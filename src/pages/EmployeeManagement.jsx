import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import FaceRegistrationModal from './FaceRegistrationModal';
const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [faceModalOpen, setFaceModalOpen] = useState(false);
const [selectedEmpForFace, setSelectedEmpForFace] = useState(null);

const handleOpenFaceModal = (emp) => {
  setSelectedEmpForFace(emp);
  setFaceModalOpen(true);
};
  // State Tìm kiếm & Lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // State Modal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    employee_code: '',
    full_name: '',
    department: '',
    status: 'Active' // Mặc định khi thêm mới
  });

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

  // Modal Thêm mới
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ employee_code: '', full_name: '', department: '', status: 'Active' });
    setIsModalOpen(true);
  };

  // Modal Sửa
  const handleOpenEdit = (emp) => {
    setEditingId(emp.id);
    setFormData({
      employee_code: emp.employee_code,
      full_name: emp.full_name,
      department: emp.department,
      status: emp.status || 'Active'
    });
    setIsModalOpen(true);
  };

  // Lưu Data
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

  // Nút Xóa
  const handleDelete = async (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa nhân viên "${name}" và toàn bộ dữ liệu khuôn mặt không? Hành động này không thể hoàn tác!`)) {
      try {
        await axiosClient.delete(`/api/employees/${id}`);
        alert('Đã xóa thành công!');
        fetchEmployees();
      } catch (error) {
        alert(error.response?.data?.message || 'Lỗi khi xóa');
      }
    }
  };

  // Lọc dữ liệu trước khi Render
  const filteredEmployees = employees.filter(emp => {
    const matchSearch = 
      (emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (emp.employee_code?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = statusFilter === 'All' || emp.status === statusFilter;
    
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý Nhân viên</h1>
        <button 
          onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded shadow transition"
        >
          + Thêm Nhân Viên
        </button>
      </div>

      {/* THANH TÌM KIẾM VÀ LỌC */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-col md:flex-row gap-4">
        <input 
          type="text"
          placeholder="Tìm theo Tên hoặc Mã NV..."
          className="flex-1 border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
          className="border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">Tất cả Trạng thái</option>
          <option value="Active">Đang làm việc</option>
          <option value="Pending">Chờ duyệt</option>
          <option value="Inactive">Đã khóa / Nghỉ việc</option>
        </select>
      </div>

      {/* BẢNG DANH SÁCH */}
      <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải danh sách...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã NV</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Họ và Tên</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phòng ban</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Khuôn mặt</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">Không tìm thấy nhân viên nào!</td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{emp.employee_code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{emp.full_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.department}</td>
                    
                    {/* HUY HIỆU TRẠNG THÁI */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        emp.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 
                        emp.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {emp.status === 'Active' ? 'Đang làm' : emp.status === 'Pending' ? 'Chờ duyệt' : 'Đã khóa'}
                      </span>
                    </td>

                    {/* KHUÔN MẶT */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        emp.isFaceRegistered ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {emp.isFaceRegistered ? 'Đã có mẫu' : 'Chưa có'}
                      </span>
                    </td>

                    {/* NÚT THAO TÁC */}
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      {!emp.isFaceRegistered && (
  <button 
    onClick={() => handleOpenFaceModal(emp)} 
    className="text-orange-600 hover:text-orange-900 mr-3 font-medium" 
    title="Lấy mẫu khuôn mặt"
  >
    📷 Lấy mẫu
  </button>
)}
                      <button onClick={() => handleOpenEdit(emp)} className="text-blue-600 hover:text-blue-900 mr-3">
                        Sửa
                      </button>
                      <button onClick={() => handleDelete(emp.id, emp.full_name)} className="text-red-600 hover:text-red-900">
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL THÊM / SỬA CÓ TÙY CHỌN TRẠNG THÁI */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 px-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Sửa thông tin' : 'Thêm nhân viên'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã NV</label>
                <input 
                  type="text" required disabled={!!editingId}
                  className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100"
                  value={formData.employee_code}
                  onChange={(e) => setFormData({...formData, employee_code: e.target.value})}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và Tên</label>
                <input 
                  type="text" required
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Phòng ban</label>
                <input 
                  type="text" required
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                />
              </div>
              
              {/* DROPDOWN CHỌN TRẠNG THÁI */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái làm việc</label>
                <select 
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="Active">Đang làm việc</option>
                  <option value="Pending">Chờ duyệt</option>
                  <option value="Inactive">Đã khóa / Nghỉ việc</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">
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
      {/* MODAL QUÉT KHUÔN MẶT */}
      {faceModalOpen && selectedEmpForFace && (
        <FaceRegistrationModal
          key={selectedEmpForFace.id}
          employee={selectedEmpForFace}
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

export default EmployeeManagement;