export const WORK_SHIFTS = [
  { id: 'morning', label: 'Ca sáng', hours: '06:00 – 14:00' },
  { id: 'afternoon', label: 'Ca chiều', hours: '14:00 – 22:00' },
  { id: 'office', label: 'Hành chính', hours: '08:00 – 17:30' },
  { id: 'night', label: 'Ca đêm', hours: '22:40 – 04:30' },
];

export const shiftLabel = (id) => WORK_SHIFTS.find((s) => s.id === id)?.label || id || '—';

export const FACE_DATA_STATUS = {
  none: { label: 'Chưa có dữ liệu', color: 'bg-gray-100 text-gray-700', icon: '○' },
  ready: { label: 'Đã có dữ liệu', color: 'bg-green-100 text-green-800', icon: '●' },
  needs_update: { label: 'Cần cập nhật lại', color: 'bg-amber-100 text-amber-800', icon: '!' },
};

export const qualityBadge = (score) => {
  if (score == null) return { text: '—', className: 'text-gray-400' };
  if (score <= 0.35) return { text: `${(score * 100).toFixed(0)}% · Tốt`, className: 'text-green-600' };
  if (score <= 0.42) return { text: `${(score * 100).toFixed(0)}% · TB`, className: 'text-amber-600' };
  return { text: `${(score * 100).toFixed(0)}% · Thấp`, className: 'text-red-600' };
};
