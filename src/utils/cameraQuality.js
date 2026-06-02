/**
 * Kiểm tra độ sáng khung hình camera — cảnh báo khi quá tối hoặc quá chói.
 */

export const BRIGHTNESS_MIN = 55;
export const BRIGHTNESS_MAX = 235;
export const BRIGHTNESS_GOOD_MIN = 70;

const sampleRegion = (width, height) => ({
  x: Math.floor(width * 0.25),
  y: Math.floor(height * 0.15),
  w: Math.floor(width * 0.5),
  h: Math.floor(height * 0.65),
});

/**
 * @returns {{ brightness: number, isDark: boolean, isTooBright: boolean, isGood: boolean, message: string }}
 */
export const analyzeFrameBrightness = (video, canvasOrTemp) => {
  if (!video?.videoWidth || !video?.videoHeight) {
    return {
      brightness: 0,
      isDark: true,
      isTooBright: false,
      isGood: false,
      message: 'Camera chưa sẵn sàng.',
    };
  }

  const canvas = canvasOrTemp;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0);

  const { width, height, data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const region = sampleRegion(width, height);

  let sum = 0;
  let count = 0;
  const step = 4;

  for (let y = region.y; y < region.y + region.h; y += step) {
    for (let x = region.x; x < region.x + region.w; x += step) {
      const i = (y * width + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += lum;
      count += 1;
    }
  }

  const brightness = count > 0 ? sum / count : 0;
  const isDark = brightness < BRIGHTNESS_MIN;
  const isTooBright = brightness > BRIGHTNESS_MAX;
  const isGood = brightness >= BRIGHTNESS_GOOD_MIN && brightness <= BRIGHTNESS_MAX;

  let message = '';
  if (isDark) {
    message = 'Ánh sáng quá yếu — vui lòng bật đèn hoặc di chuyển ra chỗ sáng hơn.';
  } else if (isTooBright) {
    message = 'Ánh sáng quá mạnh — tránh ánh sáng trực tiếp vào mặt.';
  } else if (brightness < BRIGHTNESS_GOOD_MIN) {
    message = 'Ánh sáng hơi yếu — nên bật thêm đèn để nhận diện chính xác hơn.';
  }

  return { brightness: Math.round(brightness), isDark, isTooBright, isGood, message };
};

/** Kiểm tra kích thước mặt trong khung (detection.box). */
export const validateFaceBoxSize = (detection, videoWidth, videoHeight) => {
  if (!detection?.detection?.box) {
    return { ok: false, message: 'Không phát hiện được khuôn mặt.' };
  }

  const { box } = detection.detection;
  const faceAreaRatio = (box.width * box.height) / (videoWidth * videoHeight);
  const minRatio = 0.06;
  const maxRatio = 0.65;

  if (faceAreaRatio < minRatio) {
    return { ok: false, message: 'Mặt quá xa camera — tiến lại gần hơn.' };
  }
  if (faceAreaRatio > maxRatio) {
    return { ok: false, message: 'Mặt quá gần camera — lùi lại một chút.' };
  }

  const score = detection.detection.score ?? 0;
  if (score < 0.55) {
    return { ok: false, message: 'Không rõ khuôn mặt — chỉnh lại ánh sáng hoặc góc nhìn.' };
  }

  return { ok: true, message: '', score, faceAreaRatio };
};
