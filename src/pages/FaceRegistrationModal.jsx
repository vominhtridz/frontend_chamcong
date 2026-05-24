import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { toast } from 'react-toastify';
import axiosClient from '../api/axiosClient';
import {
  loadFaceApiModels,
  extractFaceDescriptor,
  matchBestFromSamples,
  captureFrameBase64,
  startCamera,
  stopCameraStream,
  waitForVideoElement,
  FACE_MATCH_THRESHOLD,
} from '../services/faceApiService';
import { validatePoseForCapture, getPoseHint } from '../utils/livenessDetection';
import { analyzeFrameBrightness, validateFaceBoxSize } from '../utils/cameraQuality';

const POSES = [
  { key: 'front', label: 'Trực diện (1/5)', hint: 'Nhìn thẳng vào camera' },
  { key: 'left', label: 'Nghiêng trái (2/5)', hint: 'Quay đầu nhẹ sang trái' },
  { key: 'right', label: 'Nghiêng phải (3/5)', hint: 'Quay đầu nhẹ sang phải' },
  { key: 'front2', label: 'Trực diện (4/5)', hint: 'Nhìn thẳng lại' },
  { key: 'left2', label: 'Nghiêng trái (5/5)', hint: 'Quay trái lần nữa' },
];

const TEST_ROUNDS = 2;

const poseTypeForKey = (key) => {
  if (key.includes('left')) return 'left';
  if (key.includes('right')) return 'right';
  return 'front';
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const FaceRegistrationModal = ({ employee, onClose, onSuccess, reRegister = false }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const brightnessTimerRef = useRef(null);

  const [initState, setInitState] = useState('loading');
  const [statusMsg, setStatusMsg] = useState('Đang tải Model AI...');
  const [lightWarning, setLightWarning] = useState('');
  const [step, setStep] = useState(0);
  const [descriptors, setDescriptors] = useState([]);
  const [base64Image, setBase64Image] = useState(null);
  const [poseIndex, setPoseIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [testRound, setTestRound] = useState(0);
  const [bestTestDistance, setBestTestDistance] = useState(null);

  const teardownCamera = useCallback(() => {
    if (brightnessTimerRef.current) {
      clearInterval(brightnessTimerRef.current);
      brightnessTimerRef.current = null;
    }
    stopCameraStream(streamRef.current);
    stopCameraStream(videoRef.current);
    streamRef.current = null;
  }, []);

  const checkLighting = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video?.videoWidth || !canvas) return { ok: false, message: 'Camera chưa sẵn sàng.' };

    const result = analyzeFrameBrightness(video, canvas);
    if (result.isDark) {
      setLightWarning(result.message);
      return { ok: false, message: result.message };
    }
    if (result.isTooBright) {
      setLightWarning(result.message);
      return { ok: false, message: result.message };
    }

    setLightWarning(result.message || '');
    return { ok: true, message: '' };
  }, []);

  const startBrightnessMonitor = useCallback(() => {
    if (brightnessTimerRef.current) clearInterval(brightnessTimerRef.current);
    brightnessTimerRef.current = setInterval(() => {
      checkLighting();
    }, 800);
  }, [checkLighting]);

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
    setTestRound(0);
    setLightWarning('');

    try {
      setStatusMsg('Đang tải Model AI (lần đầu có thể mất vài giây)...');
      await loadFaceApiModels();

      setStatusMsg('Đang mở camera...');
      streamRef.current = await startCamera(video);

      startBrightnessMonitor();
      setStatusMsg(
        'Sẵn sàng! Bật đèn đủ sáng, rồi bấm "Bắt đầu quét" để lấy 5 mẫu khuôn mặt.'
      );
      setInitState('ready');
      setStep(1);
    } catch (err) {
      console.error('[FaceRegistration]', err);
      setInitState('error');
      setStatusMsg(err.message || 'Không thể khởi tạo camera hoặc model.');
    }
  }, [teardownCamera, startBrightnessMonitor]);

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

  const waitForGoodLighting = async (maxWaitMs = 30000) => {
    const started = Date.now();
    while (Date.now() - started < maxWaitMs) {
      const light = checkLighting();
      if (light.ok) return;
      setStatusMsg(`💡 ${light.message}`);
      await wait(600);
    }
    throw new Error('Ánh sáng quá yếu. Vui lòng bật đèn rồi thử lại.');
  };

  const capturePoseSample = async (poseKey, maxAttempts = 60) => {
    const video = videoRef.current;
    if (!video?.videoWidth) {
      throw new Error('Camera chưa sẵn sàng.');
    }

    const poseType = poseTypeForKey(poseKey);

    for (let i = 0; i < maxAttempts; i += 1) {
      const light = checkLighting();
      if (!light.ok && i % 5 === 0) {
        setStatusMsg(`💡 ${light.message}`);
      }

      const det = await faceapi
        .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.55 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (det) {
        const boxCheck = validateFaceBoxSize(det, video.videoWidth, video.videoHeight);
        if (!boxCheck.ok) {
          if (i % 4 === 0) setStatusMsg(boxCheck.message);
          await wait(200);
          continue;
        }

        if (validatePoseForCapture(poseType, det)) {
          return Array.from(det.descriptor);
        }
      }

      await wait(200);
    }

    throw new Error(`Không bắt được tư thế "${poseType}". ${getPoseHint(poseType)}`);
  };

  const handleCaptureFaces = async () => {
    if (initState !== 'ready' || isCapturing) return;

    setIsCapturing(true);
    try {
      await waitForGoodLighting();

      setStatusMsg('📸 Đang chụp ảnh đại diện...');
      setBase64Image(captureFrameBase64(videoRef.current, canvasRef.current));

      const samples = [];
      for (let i = 0; i < POSES.length; i += 1) {
        const pose = POSES[i];
        setPoseIndex(i);
        setStatusMsg(`⏳ ${pose.label} — ${pose.hint}`);
        await wait(800);

        const light = checkLighting();
        if (!light.ok) {
          throw new Error(light.message);
        }

        samples.push(await capturePoseSample(pose.key));
      }

      setDescriptors(samples);
      setTestRound(0);
      setBestTestDistance(null);
      setStatusMsg(
        `✅ Lấy 5 mẫu thành công! Nhấn "Test nhận diện" — cần ${TEST_ROUNDS} lần test OK liên tiếp.`
      );
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
      const light = checkLighting();
      if (!light.ok) {
        setStatusMsg(`💡 ${light.message}`);
        toast.warn(light.message);
        return;
      }

      const round = testRound + 1;
      setStatusMsg(`🔍 Test nhận diện lần ${round}/${TEST_ROUNDS}...`);

      const { descriptor: currentFace } = await extractFaceDescriptor(videoRef.current);
      const { distance, isMatch } = matchBestFromSamples(descriptors, currentFace, FACE_MATCH_THRESHOLD);

      if (!isMatch) {
        setStatusMsg(
          `⚠️ Test ${round} thất bại (độ lệch ${distance}). Không khớp — vui lòng quét lại 5 góc với ánh sáng tốt hơn.`
        );
        setStep(1);
        setDescriptors([]);
        setTestRound(0);
        setBestTestDistance(null);
        return;
      }

      const newBest = bestTestDistance == null ? distance : Math.min(bestTestDistance, distance);
      setBestTestDistance(newBest);

      if (round >= TEST_ROUNDS) {
        setStatusMsg(
          `🎉 Nhận diện OK ${TEST_ROUNDS}/${TEST_ROUNDS} (độ lệch ${distance}). Đang lưu vector...`
        );
        setStep(3);
        await saveToServer(newBest);
      } else {
        setTestRound(round);
        setStatusMsg(
          `✅ Test ${round}/${TEST_ROUNDS} OK (độ lệch ${distance}). Nhìn thẳng camera và bấm test lần ${round + 1}.`
        );
      }
    } catch (error) {
      setStatusMsg(`❌ Lỗi test: ${error.message}`);
      toast.error(error.message);
    }
  };

  const saveToServer = async (finalBestDistance = bestTestDistance) => {
    try {
      await axiosClient.post(`/api/employees/${employee.id}/register-face`, {
        descriptors,
        base64Image,
        qualityMetrics: {
          bestDistance: finalBestDistance,
          testRounds: TEST_ROUNDS,
        },
      });
      toast.success(
        reRegister
          ? 'Cập nhật embedding vector thành công!'
          : 'Trích xuất embedding và kích hoạt nhân viên thành công!'
      );
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
        <h2 className="text-2xl font-bold mb-2">
          {reRegister ? 'Trích xuất lại Embeddings' : 'Đăng ký & trích xuất Embeddings'}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Quét 5 góc mặt → AI chuyển thành vector 128 chiều lưu vào database
        </p>
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
          {lightWarning && initState === 'ready' && (
            <div className="absolute top-2 left-2 right-2 px-3 py-2 rounded-lg bg-amber-500/95 text-white text-xs font-medium">
              💡 {lightWarning}
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
              Test nhận diện {testRound > 0 ? `(${testRound}/${TEST_ROUNDS})` : ''}
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
