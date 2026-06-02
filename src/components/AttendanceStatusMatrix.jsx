import React from 'react';
import { getDailyStatus } from '../utils/vietnamTimeUtils';
import './AttendanceStatusMatrix.css';

/**
 * Attendance Status Matrix Component
 * Displays daily attendance summary with Valid/Invalid status
 */
const AttendanceStatusMatrix = ({ attendance = {}, settings = {} }) => {
  if (!attendance || Object.keys(attendance).length === 0) {
    return null;
  }

  const status = getDailyStatus(attendance, settings);

  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--';
    const d = new Date(timestamp);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  return (
    <div className={`status-matrix status-${status.color}`}>
      <div className="matrix-header">
        <h3 className="matrix-title">Trạng thái ca làm việc</h3>
        <div className="matrix-status">
          <span className={`badge badge-${status.color}`}>{status.text}</span>
        </div>
      </div>

      <div className="matrix-body">
        {/* Check-in Section */}
        <div className="check-section">
          <div className="check-label">Check-in</div>
          <div className="check-time">
            {attendance.checkInTime ? (
              <>
                <span className="time">{formatTime(attendance.checkInTime)}</span>
                <span className={`status-badge ${attendance.isLate ? 'late' : 'ontime'}`}>
                  {attendance.isLate ? `Trễ ${attendance.lateMinutes}p` : 'Đúng giờ'}
                </span>
              </>
            ) : (
              <span className="no-data">Chưa check-in</span>
            )}
          </div>
        </div>

        {/* Check-out Section */}
        <div className="check-section">
          <div className="check-label">Check-out</div>
          <div className="check-time">
            {attendance.checkOutTime ? (
              <>
                <span className="time">{formatTime(attendance.checkOutTime)}</span>
                <span
                  className={`status-badge ${
                    attendance.checkOutStatus === 'Overtime'
                      ? 'overtime'
                      : attendance.checkOutStatus === 'Early'
                        ? 'early'
                        : 'ontime'
                  }`}
                >
                  {attendance.checkOutStatus === 'Overtime'
                    ? `OT ${attendance.lateCheckoutMinutes}p`
                    : attendance.checkOutStatus === 'Early'
                      ? `Sớm ${attendance.earlyCheckoutMinutes}p`
                      : 'Đúng giờ'}
                </span>
              </>
            ) : (
              <span className="no-data">Chưa check-out</span>
            )}
          </div>
        </div>

        {/* Worked Minutes */}
        {attendance.workedMinutes > 0 && (
          <div className="worked-section">
            <div className="worked-label">Giờ làm</div>
            <div className="worked-time">
              {Math.floor(attendance.workedMinutes / 60)}h{attendance.workedMinutes % 60}m
            </div>
          </div>
        )}
      </div>

      {/* Status Reasons */}
      {status.reasons && status.reasons.length > 0 && (
        <div className="matrix-reasons">
          <div className="reasons-title">Lý do:</div>
          <ul className="reasons-list">
            {status.reasons.map((reason, idx) => (
              <li key={idx} className="reason-item">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Exception Button */}
      {!status.isValid && attendance.id && (
        <div className="matrix-action">
          <button className="btn-exception">
            Tạo yêu cầu giải trình
          </button>
        </div>
      )}
    </div>
  );
};

export default AttendanceStatusMatrix;
