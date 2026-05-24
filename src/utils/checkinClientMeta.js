/** Fingerprint thiết bị đơn giản (không lưu PII) */
export const getDeviceFingerprint = () => {
  const parts = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `fp_${Math.abs(hash)}`;
};

/** Lấy GPS — trả null nếu từ chối hoặc không hỗ trợ */
export const getCurrentPosition = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: null, longitude: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => resolve({ latitude: null, longitude: null }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });

export const buildCheckinClientMeta = async (canvas, video) => {
  let brightness = null;
  if (canvas && video?.videoWidth) {
    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0);
      const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let sum = 0;
      let count = 0;
      for (let y = 0; y < height; y += 8) {
        for (let x = 0; x < width; x += 8) {
          const i = (y * width + x) * 4;
          sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          count += 1;
        }
      }
      brightness = count > 0 ? Math.round(sum / count) : null;
    } catch {
      brightness = null;
    }
  }

  const gps = await getCurrentPosition();
  return {
    ...gps,
    deviceFingerprint: getDeviceFingerprint(),
    brightness,
  };
};
