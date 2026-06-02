export const statusLabel = (status) => {
  if (status === 'Complete') {
    return { text: 'Hoàn tất', className: 'bg-green-100 text-green-800' };
  }
  if (status === 'CheckedIn') {
    return { text: 'Đã vào ca', className: 'bg-blue-100 text-blue-800' };
  }
  if (status === 'OnTime') {
    return { text: 'Đúng giờ', className: 'bg-green-100 text-green-800' };
  }
  if (status === 'Late') {
    return { text: 'Đi muộn', className: 'bg-orange-100 text-orange-800' };
  }
  if (status === 'Early') {
    return { text: 'Về sớm', className: 'bg-amber-100 text-amber-800' };
  }
  return { text: status || '—', className: 'bg-gray-100 text-gray-700' };
};

export const checkOutStatusLabel = (status) => {
  if (status === 'OnTime') return { text: 'Ra đúng giờ', className: 'bg-green-100 text-green-800' };
  if (status === 'Late') return { text: 'Ra trễ', className: 'bg-orange-100 text-orange-800' };
  if (status === 'Early') return { text: 'Ra sớm', className: 'bg-amber-100 text-amber-800' };
  return { text: status || '—', className: 'bg-gray-100 text-gray-700' };
};

export const formatMinutes = (mins) => {
  if (mins == null || mins === 0) return '—';
  if (mins < 60) return `${mins} phút`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}g ${m}p` : `${h} giờ`;
};

export const testResultLabel = (row) => {
  if (row.success) {
    return {
      text: row.possibleSpoof ? 'Thành công (cảnh báo)' : 'Thành công',
      className: row.possibleSpoof
        ? 'bg-amber-100 text-amber-800'
        : 'bg-green-100 text-green-800',
    };
  }
  const reasonMap = {
    liveness_fail: 'Liveness thất bại',
    face_fail: 'Khuôn mặt sai',
    self_no_match: 'Không khớp hồ sơ',
    other_closer: 'Nghi giả mạo',
    ambiguous: 'Không xác định',
    invalid_descriptor: 'Dữ liệu lỗi',
  };
  return {
    text: reasonMap[row.failureReason] || 'Thất bại',
    className: 'bg-red-100 text-red-800',
  };
};

export const formatTime = (timestamp) => {
  if (!timestamp) return '--:--';
  return new Date(timestamp).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateTime = (timestamp) => {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
