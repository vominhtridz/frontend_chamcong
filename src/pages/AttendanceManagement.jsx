import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import * as XLSX from 'xlsx'; // Thư viện xuất Excel

const AttendanceManagement = () => {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State quản lý Modal Xem Ảnh
  const [imageModal, setImageModal] = useState({ isOpen: false, inUrl: '', outUrl: '', name: '', date: '' });
  
  // State bộ lọc tháng (Mặc định là tháng hiện tại)
  const currentMonth = new Date().toISOString().slice(0, 7); // Format: 'YYYY-MM'
  const [filterMonth, setFilterMonth] = useState(currentMonth);

  useEffect(() => {
    const fetchAttendances = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get('/api/attendances');
        setAttendances(res.data);
      } catch (error) {
        console.error('Lỗi lấy dữ liệu chấm công:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendances();
  }, []);

  // Format timestamp thành chuỗi Giờ:Phút (VD: 08:30)
  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--';
    const d = new Date(timestamp);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  // Lọc dữ liệu theo tháng đã chọn trên UI
  const filteredData = attendances.filter(record => record.date.startsWith(filterMonth));

  // HÀM XUẤT EXCEL
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      alert('Không có dữ liệu để xuất!');
      return;
    }

    // Map lại data tiếng Việt để xuất ra cột Excel cho đẹp
    const excelData = filteredData.map((item, index) => ({
      'STT': index + 1,
      'Mã NV': item.employee_code,
      'Họ và Tên': item.full_name,
      'Ngày': item.date,
      'Giờ Vào': formatTime(item.checkInTime),
      'Giờ Ra': formatTime(item.checkOutTime),
      'Trạng thái': item.status === 'OnTime' ? 'Đúng giờ' : item.status === 'Late' ? 'Đi muộn' : 'Vắng mặt'
    }));

    // Tạo Workbook và lưu file
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BangChamCong");
    
    XLSX.writeFile(workbook, `Bao_Cao_Cham_Cong_${filterMonth}.xlsx`);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Lịch sử Chấm công</h1>
        
        <div className="flex space-x-4 mt-4 md:mt-0">
          {/* Bộ lọc Tháng */}
          <input 
            type="month" 
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 focus:ring-blue-500"
          />
          
          {/* Nút Xuất Excel */}
          <button 
            onClick={handleExportExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded shadow transition flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Xuất Excel
          </button>
        </div>
      </div>

      {/* BẢNG DỮ LIỆU */}
      <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nhân viên</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Check In</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Check Out</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Bằng chứng (Ảnh)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">Không có dữ liệu trong tháng này.</td></tr>
              ) : (
                filteredData.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{record.full_name}</div>
                      <div className="text-xs text-gray-500">{record.employee_code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{record.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-blue-600">
                      {formatTime(record.checkInTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-600">
                      {formatTime(record.checkOutTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        record.status === 'OnTime' ? 'bg-green-100 text-green-800' :
                        record.status === 'Late' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {record.status === 'OnTime' ? 'Đúng giờ' : record.status === 'Late' ? 'Đi muộn' : 'Vắng mặt'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {/* BẤM VÀO NÚT NÀY ĐỂ XEM ẢNH MẶT */}
                      {(record.verifyImageIn || record.verifyImageOut) ? (
                        <button 
                          onClick={() => setImageModal({
                            isOpen: true, 
                            inUrl: record.verifyImageIn, 
                            outUrl: record.verifyImageOut,
                            name: record.full_name,
                            date: record.date
                          })}
                          className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded text-sm font-medium"
                        >
                          👁️ Xem ảnh
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Không có ảnh</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL HIỂN THỊ ẢNH BẰNG CHỨNG (CHỐNG GIAN LẬN) */}
      {imageModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">
                Bằng chứng chấm công: {imageModal.name} <span className="text-sm font-normal text-gray-500">({imageModal.date})</span>
              </h3>
              <button onClick={() => setImageModal({ ...imageModal, isOpen: false })} className="text-gray-500 hover:text-gray-800 font-bold text-xl">✕</button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ảnh Check-In */}
              <div className="text-center">
                <p className="font-semibold text-gray-700 mb-2">Ảnh Check-In</p>
                {imageModal.inUrl ? (
                  <img src={imageModal.inUrl} alt="Check In" className="w-full h-64 object-cover rounded shadow border" />
                ) : (
                  <div className="w-full h-64 bg-gray-100 flex items-center justify-center rounded border text-gray-400">Không có ảnh</div>
                )}
              </div>

              {/* Ảnh Check-Out */}
              <div className="text-center">
                <p className="font-semibold text-gray-700 mb-2">Ảnh Check-Out</p>
                {imageModal.outUrl ? (
                  <img src={imageModal.outUrl} alt="Check Out" className="w-full h-64 object-cover rounded shadow border" />
                ) : (
                  <div className="w-full h-64 bg-gray-100 flex items-center justify-center rounded border text-gray-400">Chưa Check-out</div>
                )}
              </div>
            </div>
            <div className="p-4 bg-yellow-50 border-t border-yellow-100 text-sm text-yellow-800">
              <strong>Mẹo kiểm tra:</strong> Hãy chú ý xem ảnh có phải chụp lại từ màn hình điện thoại hoặc giấy in không (hiện tượng bóng phản chiếu, pixel hóa).
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManagement;