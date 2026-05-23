import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { toast } from 'react-toastify';
import axiosClient from '../api/axiosClient';
import {
  loadFaceApiModels,
  extractFaceDescriptor,
  compareFaces,
  captureFrameBase64,
  startCamera,
  stopCameraStream,
  waitForVideoElement,
  FACE_MATCH_THRESHOLD,
} from '../services/faceApiService';
import { validatePoseForCapture, getPoseHint } from '../utils/livenessDetection';

const POSES = [
  { key: 'front', label: 'Trực diện (1/5)', hint: 'Nhìn thẳng vào camera' },
  { key: 'left', label: 'Nghiêng trái (2/5)', hint: 'Quay đầu nhẹ sang trái' },
  { key: 'right', label: 'Nghiêng phải (3/5)', hint: 'Quay đầu nhẹ sang phải' },
  { key: 'front2', label: 'Trực diện (4/5)', hint: 'Nhìn thẳng lại' },
  { key: 'left2', label: 'Nghiêng trái (5/5)', hint: 'Quay trái lần nữa' },
];

const poseTypeForKey = (key) => {
  if (key.includes('left')) return 'left';
  if (key.includes('right')) return 'right';
  return 'front';
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const FaceRegistrationModal = ({ employee, onClose, onSuccess }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [initState, setInitState] = useState('loading');
  const [statusMsg, setStatusMsg] = useState('Đang tải Model AI...');
  const [step, setStep] = useState(0);
  const [descriptors, setDescriptors] = useState([]);
  const [base64Image, setBase64Image] = useState(null);
  const [poseIndex, setPoseIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);

  const teardownCamera = useCallback(() => {
    stopCameraStream(streamRef.current);
    stopCameraStream(videoRef.current);
    streamRef.current = null;
  }, []);

  const bootstrap = useCallback(async () => {
    let video;
    try {
      video = await waitForVideoElement(() => videoRef.current);
    } catch (err) {
      setInitState('error');
      setStatusMsg(err.message);
      return;
    }

    teardownCamera();
    setInitState('loading');
    setStep(0);
    setDescriptors([]);
    setPoseIndex(0);

    try {
      setStatusMsg('Đang tải Model AI (lần đầu có thể mất vài giây)...');
      await loadFaceApiModels();

      setStatusMsg('Đang mở camera...');
      streamRef.current = await startCamera(video);

      setStatusMsg('Sẵn sàng! Bấm "Bắt đầu quét" để lấy 5 mẫu khuôn mặt.');
      setInitState('ready');
      setStep(1);
    } catch (err) {
      console.error('[FaceRegistration]', err);
      setInitState('error');
      setStatusMsg(err.message || 'Không thể khởi tạo camera hoặc model.');
    }
  }, [teardownCamera]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await bootstrap();
      if (cancelled) teardownCamera();
    })();

    return () => {
      cancelled = true;
      teardownCamera();
    };
  }, [bootstrap, teardownCamera]);

  const capturePoseSample = async (poseKey, maxAttempts = 50) => {
    const video = videoRef.current;
    if (!video?.videoWidth) {
      throw new Error('Camera chưa sẵn sàng.');
    }

    const poseType = poseTypeForKey(poseKey);

    for (let i = 0; i < maxAttempts; i += 1) {
      const det = await faceapi
        .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (det && validatePoseForCapture(poseType, det)) {
        return Array.from(det.descriptor);
      }
      await wait(200);
    }

    throw new Error(`Không bắt được tư thế "${poseType}". ${getPoseHint(poseType)}`);
  };

  const handleCaptureFaces = async () => {
    if (initState !== 'ready' || isCapturing) return;

    setIsCapturing(true);
    try {
      setStatusMsg('📸 Đang chụp ảnh đại diện...');
      setBase64Image(captureFrameBase64(videoRef.current, canvasRef.current));

      const samples = [];
      for (let i = 0; i < POSES.length; i += 1) {
        const pose = POSES[i];
        setPoseIndex(i);
        setStatusMsg(`⏳ ${pose.label} — ${pose.hint}`);
        await wait(800);
        samples.push(await capturePoseSample(pose.key));
      }

      setDescriptors(samples);
      setStatusMsg('✅ Lấy 5 mẫu thành công! Nhấn "Test nhận diện" để kiểm tra.');
      setStep(2);
    } catch (error) {
      setStatusMsg(`❌ ${error.message}`);
      toast.error(error.message);
      setStep(1);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleTestRecognition = async () => {
    try {
      setStatusMsg('🔍 Đang kiểm tra nhận diện tại chỗ...');
      const { descriptor: currentFace } = await extractFaceDescriptor(videoRef.current);

      let minDistance = 1;
      for (const savedDesc of descriptors) {
        const { distance } = compareFaces(savedDesc, currentFace, FACE_MATCH_THRESHOLD);
        if (distance < minDistance) minDistance = distance;
      }

      if (minDistance < FACE_MATCH_THRESHOLD) {
        setStatusMsg(
          `🎉 Nhận diện OK (độ lệch ${minDistance}). Đang lưu và kích hoạt nhân viên...`
        );
        setStep(3);
        await saveToServer();
      } else {
        setStatusMsg(
          `⚠️ Thất bại (độ lệch ${minDistance}). Không khớp — vui lòng quét lại 5 góc.`
        );
        setStep(1);
        setDescriptors([]);
      }
    } catch (error) {
      setStatusMsg(`❌ Lỗi test: ${error.message}`);
      toast.error(error.message);
    }
  };

  const saveToServer = async () => {
    try {
      await axiosClient.post(`/api/employees/${employee.id}/register-face`, {
        descriptors,
        base64Image,
      });
      toast.success('Lưu khuôn mặt và kích hoạt nhân viên thành công!');
      onSuccess();
      onClose();
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      setStatusMsg(`❌ Lỗi lưu server: ${msg}`);
      setStep(2);
      toast.error(msg);
    }
  };

  const canScan = initState === 'ready' && step === 1 && !isCapturing;

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-2xl text-center">
        <h2 className="text-2xl font-bold mb-2">Đăng ký khuôn mặt</h2>
        <p className="text-gray-600 mb-4">
          Nhân viên:{' '}
          <strong className="text-blue-600">
            {employee.full_name} ({employee.employee_code})
          </strong>
        </p>

        <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover scale-x-[-1]"
          />
          <canvas ref={canvasRef} className="hidden" />
          {initState === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 text-white text-sm">
              Đang khởi động...
            </div>
          )}
          {step === 1 && poseIndex < POSES.length && initState === 'ready' && (
            <div className="absolute bottom-2 left-0 right-0 text-white text-sm bg-black/50 py-1">
              {POSES[poseIndex]?.hint}
            </div>
          )}
        </div>

        <div
          className={`p-3 font-medium rounded-lg mb-6 border min-h-[3rem] ${
            initState === 'error'
              ? 'bg-red-50 text-red-800 border-red-100'
              : 'bg-blue-50 text-blue-800 border-blue-100'
          }`}
        >
          {statusMsg}
        </div>

        <div className="flex justify-center flex-wrap gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 font-medium"
          >
            Hủy
          </button>

          {initState === 'error' && (
            <button
              type="button"
              onClick={bootstrap}
              className="px-6 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 font-medium"
            >
              Thử lại
            </button>
          )}

          {canScan && (
            <button
              type="button"
              onClick={handleCaptureFaces}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium shadow-lg"
            >
              Bắt đầu quét (5 góc)
            </button>
          )}

          {step === 2 && initState === 'ready' && (
            <button
              type="button"
              onClick={handleTestRecognition}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium shadow-lg"
            >
              Test nhận diện
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              disabled
              className="px-6 py-2 bg-gray-400 text-white rounded cursor-not-allowed"
            >
              Đang lưu...
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaceRegistrationModal;
