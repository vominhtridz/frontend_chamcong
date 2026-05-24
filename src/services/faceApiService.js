import * as faceapi from 'face-api.js';

const MODEL_URL = `${import.meta.env.BASE_URL}models`.replace(/\/?$/, '/');
const FACE_MATCH_THRESHOLD = 0.4;

let modelsLoadPromise = null;

const isSecureContextForCamera = () =>
  window.isSecureContext ||
  window.location.hostname === 'https://backend-chamcong.onrender.com' ||
  window.location.hostname === '127.0.0.1';

export const loadFaceApiModels = async () => {
  if (modelsLoadPromise) return modelsLoadPromise;

  modelsLoadPromise = (async () => {
    try {
      const probe = await fetch(`${MODEL_URL}ssd_mobilenetv1_model-weights_manifest.json`);
      if (!probe.ok) {
        throw new Error(
          `Không tìm thấy file model (HTTP ${probe.status}). Chạy: npm run download-models trong thư mục frontend.`
        );
      }

      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
    } catch (error) {
      modelsLoadPromise = null;
      const detail = error?.message || String(error);
      throw new Error(`Không thể tải Model AI: ${detail}`);
    }
  })();

  return modelsLoadPromise;
};

export const waitForVideoReady = (video, timeoutMs = 15000) =>
  new Promise((resolve, reject) => {
    if (!video) {
      reject(new Error('Phần tử video chưa sẵn sàng.'));
      return;
    }

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
      resolve(video);
      return;
    }

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Camera quá lâu không phản hồi. Thử bấm "Thử lại".'));
    }, timeoutMs);

    const onReady = () => {
      if (video.videoWidth > 0) {
        cleanup();
        resolve(video);
      }
    };

    const onError = () => {
      cleanup();
      reject(new Error('Không phát được luồng video từ camera.'));
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      video.removeEventListener('loadedmetadata', onReady);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('error', onError);
    };

    video.addEventListener('loadedmetadata', onReady);
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('error', onError);
  });

/** Đợi ref video gắn vào DOM (modal / route mới mount). */
export const waitForVideoElement = (getVideo, maxWaitMs = 3000) =>
  new Promise((resolve, reject) => {
    const started = Date.now();

    const tick = () => {
      const video = getVideo();
      if (video) {
        resolve(video);
        return;
      }
      if (Date.now() - started > maxWaitMs) {
        reject(new Error('Không gắn được camera vào giao diện. Đóng cửa sổ và mở lại.'));
        return;
      }
      requestAnimationFrame(tick);
    };

    tick();
  });

export const startCamera = async (video, options = {}) => {
  if (!video) {
    throw new Error('Phần tử video chưa được gắn vào DOM.');
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      'Trình duyệt không hỗ trợ camera. Hãy dùng Chrome/Edge/Firefox bản mới.'
    );
  }

  if (!isSecureContextForCamera()) {
    throw new Error(
      'Camera chỉ hoạt động trên HTTPS hoặc localhost. Truy cập qua http://localhost:5173'
    );
  }

  const constraints = {
    audio: false,
    video: {
      facingMode: options.facingMode ?? 'user',
      width: { ideal: options.width ?? 640 },
      height: { ideal: options.height ?? 480 },
    },
  };

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    const name = err?.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      throw new Error('Bạn đã từ chối quyền camera. Bật lại trong cài đặt trình duyệt.');
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      throw new Error('Không tìm thấy webcam trên máy.');
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      throw new Error('Camera đang được ứng dụng khác sử dụng. Đóng app khác rồi thử lại.');
    }
    throw new Error(`Không mở được camera: ${err?.message || name}`);
  }

  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;

  try {
    await video.play();
  } catch {
    // Một số trình duyệt vẫn phát được sau loadedmetadata
  }

  await waitForVideoReady(video);
  return stream;
};

export const stopCameraStream = (streamOrVideo) => {
  const stream =
    streamOrVideo?.getTracks != null
      ? streamOrVideo
      : streamOrVideo?.srcObject;

  if (stream?.getTracks) {
    stream.getTracks().forEach((track) => track.stop());
  }

  if (streamOrVideo?.srcObject) {
    streamOrVideo.srcObject = null;
  }
};

export const extractFaceDescriptor = async (imageVideoElement) => {
  if (!imageVideoElement?.videoWidth && !imageVideoElement?.naturalWidth) {
    throw new Error('Camera chưa sẵn sàng. Đợi vài giây rồi thử lại.');
  }

  const detection = await faceapi
    .detectSingleFace(
      imageVideoElement,
      new faceapi.SsdMobilenetv1Options({ minConfidence: 0.55 })
    )
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    throw new Error('Không tìm thấy khuôn mặt. Vui lòng nhìn thẳng vào camera!');
  }

  return {
    descriptor: Array.from(detection.descriptor),
    detection,
  };
};

export const compareFaces = (descriptor1, descriptor2, threshold = FACE_MATCH_THRESHOLD) => {
  if (!descriptor1 || !descriptor2 || descriptor1.length !== 128 || descriptor2.length !== 128) {
    throw new Error('Dữ liệu khuôn mặt không hợp lệ (phải là mảng 128 số).');
  }

  const desc1 = new Float32Array(descriptor1);
  const desc2 = new Float32Array(descriptor2);
  const distance = faceapi.euclideanDistance(desc1, desc2);

  return {
    isMatch: distance < threshold,
    distance: Number(distance.toFixed(4)),
  };
};

/** So khớp probe với nhiều mẫu — trả về khoảng cách nhỏ nhất */
export const matchBestFromSamples = (samples, probe, threshold = FACE_MATCH_THRESHOLD) => {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error('Chưa có mẫu khuôn mặt để so khớp.');
  }

  let minDistance = Infinity;
  let bestIndex = -1;

  samples.forEach((sample, index) => {
    const { distance } = compareFaces(sample, probe, threshold);
    if (distance < minDistance) {
      minDistance = distance;
      bestIndex = index;
    }
  });

  return {
    isMatch: minDistance < threshold,
    distance: Number(minDistance.toFixed(4)),
    bestIndex,
  };
};

export const captureFrameBase64 = (video, canvas) => {
  if (!video?.videoWidth || !video?.videoHeight) {
    throw new Error('Camera chưa sẵn sàng.');
  }
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
};

export { FACE_MATCH_THRESHOLD, MODEL_URL };
