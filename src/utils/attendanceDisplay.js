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
  return { text: status || '—', className: 'bg-gray-100 text-gray-700' };
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
