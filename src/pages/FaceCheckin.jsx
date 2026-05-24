import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { toast } from 'react-toastify';
import axiosClient from '../api/axiosClient';
import {
  loadFaceApiModels,
  extractFaceDescriptor,
  captureFrameBase64,
  startCamera,
  stopCameraStream,
  waitForVideoElement,
} from '../services/faceApiService';
import {
  CHECKIN_LIVENESS_STEPS,
  createLivenessSessionState,
  processCheckinLivenessStep,
  processCaptureReadyStep,
  advanceLivenessStep,
  isCheckinLivenessComplete,
} from '../utils/livenessDetection';
import { analyzeFrameBrightness } from '../utils/cameraQuality';
import { buildCheckinClientMeta } from '../utils/checkinClientMeta';

const DETECT_INTERVAL_MS = 100;
const DETECT_INTERVAL_BLINK_MS = 40;

const FaceCheckin = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const livenessStateRef = useRef(createLivenessSessionState());
  const phaseRef = useRef('loading');
  const submittingRef = useRef(false);
  const lastDetectAtRef = useRef(0);

  const [phase, setPhase] = useState('loading');
  const [stepIndex, setStepIndex] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Đang tải model và camera...');
  const [hintMsg, setHintMsg] = useState('');
  const [lightWarning, setLightWarning] = useState('');
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [workConfig, setWorkConfig] = useState(null);

  const syncPhase = (next) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    stopCameraStream(streamRef.current);
    stopCameraStream(videoRef.current);
    streamRef.current = null;
  }, []);

  const resetLiveness = useCallback(() => {
    livenessStateRef.current = createLivenessSessionState();
    setStepIndex(0);
    setProgress(0);
    setLightWarning('');
  }, []);

  const checkLighting = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video?.videoWidth || !canvas) return { ok: true };

    const result = analyzeFrameBrightness(video, canvas);
    if (result.isDark || result.isTooBright) {
      setLightWarning(result.message);
      return { ok: false, message: result.message };
    }

    setLightWarning(result.message || '');
    return { ok: true };
  }, []);

  const initSession = useCallback(async () => {
    syncPhase('loading');
    setStatusMsg('Đang tải Model AI...');
    setHintMsg('');
    resetLiveness();
    submittingRef.current = false;
    setSubmitting(false);

    stopCamera();

    try {
      await loadFaceApiModels();

      const configRes = await axiosClient.get('/api/attendances/work-config');
      setWorkConfig(configRes.data);

      if (configRes.data?.isCompleted || configRes.data?.phase === 'completed') {
        syncPhase('done');
        setStatusMsg(
          configRes.data?.message ||
            'Bạn đã hoàn tất chấm công hôm nay. Chờ ngày ca tiếp theo.'
        );
        setHintMsg('');
        return;
      }

      setStatusMsg('Đang mở camera...');
      const video = await waitForVideoElement(() => videoRef.current);
      streamRef.current = await startCamera(video);

      const first = CHECKIN_LIVENESS_STEPS[0];
      syncPhase('liveness');
      setStatusMsg(configRes.data?.message || first.label);
      setHintMsg(first.hint);
    } catch (error) {
      console.error('[FaceCheckin]', error);
      setStatusMsg(error.message || 'Không thể truy cập camera hoặc tải model.');
      syncPhase('error');
    }
  }, [stopCamera, resetLiveness]);

  const startNewSession = useCallback(async () => {
    await initSession();
  }, [initSession]);

  const performCheckIn = useCallback(async () => {
    if (submittingRef.current) return;

    if (workConfig?.isCompleted || workConfig?.phase === 'completed') {
      toast.info('Bạn đã hoàn tất chấm công hôm nay. Quay lại vào ngày ca tiếp theo.');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    try {
      const light = checkLighting();
      if (!light.ok) {
        throw new Error(light.message || 'Ánh sáng không đủ. Vui lòng bật đèn và thử lại.');
      }

      syncPhase('capture');
      setStatusMsg('Đang chụp và xác thực khuôn mặt...');
      setHintMsg('Vui lòng giữ yên');

      const video = videoRef.current;
      const { descriptor } = await extractFaceDescriptor(video);
      const base64Image = captureFrameBase64(video, canvasRef.current);
      const clientMeta = await buildCheckinClientMeta(canvasRef.current, video);
      stopCamera();

      const livenessChallenge = CHECKIN_LIVENESS_STEPS.map((s) => s.id).join(',');

      const response = await axiosClient.post('/api/attendances/checkin', {
        descriptor,
        base64Image,
        livenessPassed: true,
        livenessChallenge,
        ...clientMeta,
      });

      toast.success(response.data.message);
      setStatusMsg(response.data.message);
      setHintMsg('');
      syncPhase('done');

      const configRes = await axiosClient.get('/api/attendances/work-config');
      setWorkConfig(configRes.data);

      if (response.data.action === 'checkIn' && !response.data.alreadyCompleted) {
        setTimeout(() => startNewSession(), 3500);
      }
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || 'Lỗi khi chấm công';
      try {
        await axiosClient.post('/api/attendances/log-attempt', {
          attemptType: error.response?.data?.faceMatchError ? 'face_fail' : 'time_fail',
          message,
          faceDistance: error.response?.data?.distance ?? null,
        });
      } catch {
        // bỏ qua lỗi log
      }
      toast.error(message);
      setStatusMsg(message);
      setHintMsg('Thử lại từ đầu quy trình');
      await initSession();
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [stopCamera, initSession, startNewSession, checkLighting, workConfig]);

  const runLivenessLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video || phaseRef.current !== 'liveness') return;

    const tick = async (now) => {
      if (phaseRef.current !== 'liveness' || submittingRef.current) return;

      try {
        if (!video.videoWidth) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        const light = checkLighting();
        if (!light.ok) {
          setStatusMsg(`💡 ${light.message}`);
          setHintMsg('Bật đèn hoặc di chuyển ra chỗ sáng hơn trước khi tiếp tục');
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        const state = livenessStateRef.current;
        const idx = state.stepIndex ?? 0;
        const livenessDone = idx >= CHECKIN_LIVENESS_STEPS.length;

        const isBlinkStep =
          !livenessDone && CHECKIN_LIVENESS_STEPS[idx]?.id === 'blink';
        const intervalMs = isBlinkStep ? DETECT_INTERVAL_BLINK_MS : DETECT_INTERVAL_MS;

        if (now - lastDetectAtRef.current < intervalMs) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        lastDetectAtRef.current = now;

        const det = await faceapi
          .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.55 }))
          .withFaceLandmarks();

        let result;

        if (livenessDone) {
          result = processCaptureReadyStep(det, state, { mirrorPreview: true, now });
          setStepIndex(CHECKIN_LIVENESS_STEPS.length);
          setProgress(95 + Math.round(result.stepProgress / 20));

          if (result.completed && isCheckinLivenessComplete(state)) {
            await performCheckIn();
            return;
          }
        } else {
          const step = CHECKIN_LIVENESS_STEPS[idx];
          result = processCheckinLivenessStep(step, det, state, {
            mirrorPreview: true,
            now,
          });

          setStepIndex(state.stepIndex ?? idx);
          setProgress(
            result.overallProgress ??
              Math.round(((idx + result.stepProgress / 100) / CHECKIN_LIVENESS_STEPS.length) * 85)
          );
          setHintMsg(step.hint);

          if (result.completed) {
            advanceLivenessStep(state);
            setStepIndex(state.stepIndex ?? idx + 1);

            if (state.stepIndex >= CHECKIN_LIVENESS_STEPS.length) {
              setStatusMsg('Đã xong 4 bước! Nhìn thẳng vào camera để chụp...');
              setHintMsg('Giữ mặt thẳng, không di chuyển');
              setProgress(90);
            } else {
              const next = CHECKIN_LIVENESS_STEPS[state.stepIndex];
              if (next) {
                setStatusMsg(next.label);
                setHintMsg(next.hint);
              }
            }
          }
        }

        setStatusMsg(result.statusText);
      } catch {
        // tiếp tục vòng lặp
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [performCheckIn, checkLighting]);

  useEffect(() => {
    initSession();
    return () => stopCamera();
  }, [initSession, stopCamera]);

  useEffect(() => {
    if (phase === 'liveness') {
      runLivenessLoop();
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, runLivenessLoop]);

  const currentStep =
    stepIndex < CHECKIN_LIVENESS_STEPS.length
      ? CHECKIN_LIVENESS_STEPS[stepIndex]
      : null;

  return (
    <div className="page-shell">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Chấm công bằng khuôn mặt
          </h1>
          <p className="text-gray-600">
            Làm lần lượt 4 bước theo hướng dẫn trên màn hình. Bật đèn đủ sáng trước khi bắt đầu.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6">
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="relative overflow-hidden rounded-2xl bg-black aspect-video">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-36 h-48 sm:w-48 sm:h-64 border-2 border-dashed border-green-400 rounded-[50%] opacity-80" />
              </div>
              {phase === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-sm">
                  Đang khởi động camera &amp; AI...
                </div>
              )}
              {phase === 'capture' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm font-medium">
                  Đang xác thực...
                </div>
              )}
              {lightWarning && phase === 'liveness' && (
                <div className="absolute top-3 left-3 right-3 px-3 py-2 rounded-lg bg-amber-500/95 text-white text-xs font-semibold text-center">
                  💡 {lightWarning}
                </div>
              )}
              {phase === 'liveness' && currentStep && (
                <div className="absolute top-3 left-3 right-3 text-center">
                  <span className="inline-block px-3 py-1 rounded-full bg-black/60 text-white text-xs font-semibold">
                    Bước {Math.min(stepIndex + 1, CHECKIN_LIVENESS_STEPS.length)}/
                    {CHECKIN_LIVENESS_STEPS.length}
                    {stepIndex >= CHECKIN_LIVENESS_STEPS.length ? ' — Chuẩn bị chụp' : ''}
                  </span>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="mt-4 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-medium text-slate-800">Hướng dẫn hiện tại</p>
              <p
                className={`mt-2 text-base font-semibold ${
                  phase === 'error' ? 'text-red-600' : 'text-indigo-700'
                }`}
              >
                {statusMsg}
              </p>
              {hintMsg && phase === 'liveness' && (
                <p className="mt-1 text-sm text-slate-600">{hintMsg}</p>
              )}
              {(phase === 'liveness' || phase === 'capture') && (
                <div className="mt-3 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
              {phase === 'liveness' && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {CHECKIN_LIVENESS_STEPS.map((s, i) => (
                    <li
                      key={s.id}
                      className={`text-xs px-2 py-1 rounded-full ${
                        i < stepIndex
                          ? 'bg-green-100 text-green-800'
                          : i === stepIndex
                            ? 'bg-indigo-100 text-indigo-800 ring-2 ring-indigo-400'
                            : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {i + 1}.{' '}
                      {s.id === 'front'
                        ? 'Thẳng'
                        : s.id === 'blink'
                          ? 'Chớp mắt'
                          : s.id === 'turn_left'
                            ? 'Trái'
                            : 'Phải'}
                    </li>
                  ))}
                  {stepIndex >= CHECKIN_LIVENESS_STEPS.length && (
                    <li className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-800 ring-2 ring-indigo-400">
                      5. Chụp
                    </li>
                  )}
                </ul>
              )}
            </div>

            {(phase === 'done' || phase === 'error') && !submitting && (
              <button
                type="button"
                onClick={startNewSession}
                disabled={workConfig?.isCompleted && phase === 'done'}
                className="mt-4 w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {workConfig?.isCompleted && phase === 'done'
                  ? 'Đã xong ca hôm nay — quay lại ngày mai'
                  : phase === 'error'
                    ? 'Thử lại'
                    : workConfig?.phase === 'checkOut' || workConfig?.record?.checkInTime
                      ? 'Tiếp tục check-out'
                      : 'Chấm công lần nữa'}
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow p-5 border border-slate-200">
              <h2 className="font-bold text-lg mb-3">Ca làm hiện tại</h2>
              {workConfig ? (
                <ul className="text-sm text-slate-700 space-y-2">
                  <li>
                    <span className="text-slate-500">Ngày ca:</span>{' '}
                    <strong>{workConfig.shiftDate}</strong>
                  </li>
                  <li>
                    <span className="text-slate-500">Check-in:</span> từ{' '}
                    <strong>{workConfig.workStartTime}</strong> — trễ vẫn được ghi (ngưỡng đúng
                    giờ: {workConfig.lateThreshold} phút)
                  </li>
                  <li>
                    <span className="text-slate-500">Check-out:</span> bất kỳ lúc nào sau khi đã
                    check-in (ghi sớm/muộn nếu có)
                  </li>
                  <li>
                    <span className="text-slate-500">Giới hạn:</span> mỗi ngày ca chỉ 1 check-in + 1
                    check-out
                  </li>
                  <li className="pt-2 text-indigo-700 font-medium">{workConfig.message}</li>
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Đang tải cấu hình ca...</p>
              )}
            </div>
            <div className="bg-white rounded-2xl shadow p-5 border border-slate-200">
              <h2 className="font-bold text-lg mb-3">Quy trình (4 bước + chụp)</h2>
              <ol className="list-decimal list-inside text-sm text-slate-700 space-y-2">
                {CHECKIN_LIVENESS_STEPS.map((s) => (
                  <li key={s.id}>{s.label.replace(/^Bước \d\/\d: /, '')}</li>
                ))}
                <li>Nhìn thẳng camera — hệ thống tự chụp và so khớp đúng tài khoản của bạn</li>
              </ol>
            </div>
            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 text-sm text-amber-900">
              Bật đèn đủ sáng trước khi chấm công. Trễ vẫn được ghi nhận và tính giờ làm. Sau khi
              check-out xong, chờ ngày ca tiếp theo mới chấm lại. Muốn thử nhiều lần? Dùng trang
              Test chấm công.
            </div>
            {workConfig?.isCompleted && (
              <div className="bg-green-50 rounded-2xl p-5 border border-green-200 text-sm text-green-900">
                ✓ Bạn đã hoàn tất check-in và check-out cho ca {workConfig.shiftDate}.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceCheckin;
