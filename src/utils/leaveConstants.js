export const LEAVE_TYPES = [
  { id: 'annual', label: 'Nghỉ phép năm' },
  { id: 'sick', label: 'Nghỉ ốm' },
  { id: 'personal', label: 'Việc riêng' },
  { id: 'other', label: 'Khác' },
];

export const LEAVE_STATUS = {
  Pending: { label: 'Chờ duyệt', className: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  Approved: { label: 'Đã duyệt', className: 'bg-green-50 text-green-800 border-green-200' },
  Rejected: { label: 'Từ chối', className: 'bg-red-50 text-red-800 border-red-200' },
};

export const leaveTypeLabel = (id) => LEAVE_TYPES.find((t) => t.id === id)?.label || id || '—';

export const leaveStatusLabel = (status) => LEAVE_STATUS[status]?.label || status || '—';

export const leaveStatusClass = (status) =>
  LEAVE_STATUS[status]?.className || 'bg-gray-50 text-gray-700 border-gray-200';

export const formatLeaveDate = (d) => {
  if (!d) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }
  return new Date(d).toLocaleDateString('vi-VN');
};

export const emptyLeaveForm = () => ({
  leaveType: 'annual',
  dateFrom: '',
  dateTo: '',
  reason: '',
});
