/**
 * Vietnam Timezone Utilities for Frontend
 * Handles time formatting and calculations in Vietnam timezone (UTC+7)
 */

// Vietnam timezone is UTC+7 (no daylight saving)
const VIETNAM_TIMEZONE_OFFSET = 7; // hours ahead of UTC

/**
 * Get current time in Vietnam timezone
 * @returns {Date}
 */
const getVietnamNow = () => {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcTime + VIETNAM_TIMEZONE_OFFSET * 3600000);
};

/**
 * Convert timestamp (ms) to Vietnam timezone date
 * @param {number} timestamp - Milliseconds since epoch
 * @returns {Date}
 */
const timestampToVietnamDate = (timestamp) => {
  if (!timestamp || typeof timestamp !== 'number') return null;
  const date = new Date(timestamp);
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utcTime + VIETNAM_TIMEZONE_OFFSET * 3600000);
};

/**
 * Format date as YYYY-MM-DD in Vietnam timezone
 * @param {Date|number} date - Date object or timestamp
 * @returns {string}
 */
const formatDateVN = (date) => {
  const d = typeof date === 'number' ? timestampToVietnamDate(date) : date;
  if (!d) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Format time as HH:MM in Vietnam timezone
 * @param {Date|number} date - Date object or timestamp
 * @returns {string}
 */
const formatTimeVN = (date) => {
  const d = typeof date === 'number' ? timestampToVietnamDate(date) : date;
  if (!d) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

/**
 * Format full datetime as "DD/MM/YYYY HH:MM" in Vietnamese format
 * @param {Date|number} date - Date object or timestamp
 * @returns {string}
 */
const formatFullDateTimeVN = (date) => {
  const d = typeof date === 'number' ? timestampToVietnamDate(date) : date;
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

/**
 * Format as "HH:MM, DD/MM" in Vietnamese format (compact)
 * @param {Date|number} date - Date object or timestamp
 * @returns {string}
 */
const formatCompactVN = (date) => {
  const d = typeof date === 'number' ? timestampToVietnamDate(date) : date;
  if (!d) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${hh}:${mm}, ${dd}/${m}`;
};

/**
 * Convert HH:MM string to minutes since midnight
 * @param {string} timeStr - Time in HH:MM format
 * @returns {number} - Minutes since midnight (0-1440)
 */
const timeStrToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/**
 * Convert minutes since midnight to HH:MM string
 * @param {number} minutes - Minutes since midnight
 * @returns {string}
 */
const minutesToTimeStr = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Get minutes since midnight for current time in Vietnam
 * @returns {number}
 */
const getVietnamMinutesSinceMidnight = () => {
  const now = getVietnamNow();
  return now.getHours() * 60 + now.getMinutes();
};

/**
 * Check if current time is within grace period
 * @param {string} gracePeriodEnd - End time in HH:MM (e.g., "10:45")
 * @returns {boolean}
 */
const isWithinGracePeriod = (gracePeriodEnd) => {
  const nowMin = getVietnamMinutesSinceMidnight();
  const endMin = timeStrToMinutes(gracePeriodEnd);
  return nowMin <= endMin;
};

/**
 * Calculate minutes remaining until deadline
 * @param {string} deadline - Time in HH:MM
 * @returns {number} - Negative if deadline passed, positive if still time
 */
const minutesUntilDeadline = (deadline) => {
  const nowMin = getVietnamMinutesSinceMidnight();
  const deadlineMin = timeStrToMinutes(deadline);
  return deadlineMin - nowMin;
};

/**
 * Format grace period display message
 * @param {string} startTime - Start time HH:MM
 * @param {string} gracePeriodEnd - Grace period end HH:MM
 * @param {string} fullDeadline - Full deadline HH:MM
 * @returns {string}
 */
const formatGracePeriodMessage = (startTime, gracePeriodEnd, fullDeadline) => {
  const minUntilGrace = minutesUntilDeadline(gracePeriodEnd);
  const minUntilDeadline = minutesUntilDeadline(fullDeadline);

  if (minUntilDeadline < 0) {
    return `Quá hạn check-in (từ ${startTime} đến ${fullDeadline})`;
  }

  if (minUntilGrace >= 0) {
    return `✓ Đúng giờ - Còn ${minUntilGrace} phút grace period (đến ${gracePeriodEnd})`;
  }

  if (minUntilDeadline >= 0) {
    return `⚠️ Đi trễ - Còn ${minUntilDeadline} phút để check-in (đến ${fullDeadline})`;
  }

  return 'Quá hạn check-in';
};

/**
 * Calculate late minutes from original start time
 * @param {number} checkInTime - Check-in timestamp (ms)
 * @param {number} originalStartTime - Original start timestamp (ms)
 * @returns {number}
 */
const calculateLateMinutes = (checkInTime, originalStartTime) => {
  if (!checkInTime || !originalStartTime) return 0;
  const diff = checkInTime - originalStartTime;
  return Math.max(0, Math.floor(diff / 60000));
};

/**
 * Get status text with color coding
 * @param {string} status - Status: OnTime/Late/Early/Complete/Missing
 * @returns {object} - { text, color, icon }
 */
const getStatusDisplay = (status) => {
  const displays = {
    OnTime: { text: 'Đúng giờ', color: 'green', icon: '✓' },
    Late: { text: 'Đi trễ', color: 'orange', icon: '⚠️' },
    Early: { text: 'Về sớm', color: 'blue', icon: 'ℹ️' },
    Complete: { text: 'Hoàn tất', color: 'green', icon: '✓' },
    Missing: { text: 'Không có', color: 'red', icon: '✕' },
    Absent: { text: 'Vắng', color: 'red', icon: '✕' },
  };
  return displays[status] || { text: status, color: 'gray', icon: '?' };
};

/**
 * Get daily status (Valid/Invalid) with reason
 * @param {object} attendance - Attendance record
 * @param {object} settings - Settings with grace periods
 * @returns {object} - { isValid, reasons, color }
 */
const getDailyStatus = (attendance = {}, settings = {}) => {
  const reasons = [];
  
  // Check check-in
  if (!attendance.checkInTime) {
    reasons.push('Không check-in');
  } else if (attendance.status === 'Late') {
    reasons.push(`Đi trễ ${attendance.lateMinutes || 0} phút`);
  }

  // Check check-out
  if (!attendance.checkOutTime) {
    reasons.push('Không check-out');
    reasons.push('Không đủ công vì không check-out ra');
  } else if (attendance.checkOutStatus === 'Early') {
    reasons.push(`Về sớm ${attendance.earlyCheckoutMinutes || 0} phút`);
  }

  // Check exception
  if (attendance.hasException) {
    reasons.push('Có ngoại lệ');
  }

  const isValid = reasons.length === 0 && 

                  attendance.status === 'OnTime' && 
                  attendance.checkOutStatus === 'OnTime';
                  attendance.checkInTime &&
                  attendance.checkOutTime &&
                  attendance.status === 'OnTime' && 
                  (attendance.checkOutStatus === 'OnTime' || attendance.checkOutStatus === 'Overtime');

  return {
    isValid,
    text: isValid ? 'Đủ công' : 'Không đủ công',
    reasons,
    color: isValid ? 'green' : 'red',
  };
};

export {
  VIETNAM_TIMEZONE_OFFSET,
  getVietnamNow,
  timestampToVietnamDate,
  formatDateVN,
  formatTimeVN,
  formatFullDateTimeVN,
  formatCompactVN,
  timeStrToMinutes,
  minutesToTimeStr,
  getVietnamMinutesSinceMidnight,
  isWithinGracePeriod,
  minutesUntilDeadline,
  formatGracePeriodMessage,
  calculateLateMinutes,
  getStatusDisplay,
  getDailyStatus,
};
