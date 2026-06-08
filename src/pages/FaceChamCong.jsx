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
const SUCCESS_RESET_DELAY = 4000;

const FaceChamCong = () => {
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
  const [resultData, setResultData] = useState(null);

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
    setResultData(null);
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

      setStatusMsg('Đang mở camera...');
      const video = await waitForVideoElement(() => videoRef.current);
      streamRef.current = await startCamera(video);

      const first = CHECKIN_LIVENESS_STEPS[0];
      syncPhase('liveness');
      setStatusMsg(first.label);
      setHintMsg(first.hint);
    } catch (error) {
      console.error('[FaceChamCong]', error);
      setStatusMsg(error.message || 'Không thể truy cập camera hoặc tải model.');
      syncPhase('error');
    }
  }, [stopCamera, resetLiveness]);

  const startNewSession = useCallback(async () => {
    await initSession();
  }, [initSession]);

  const performCheckIn = useCallback(async () => {
    if (submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    try {
      const light = checkLighting();
      if (!light.ok) {
        throw new Error(light.message || 'Ánh sáng không đủ. Vui lòng bật đèn và thử lại.');
      }

      syncPhase('capture');
      setStatusMsg('Đang chụp và nhận diện khuôn mặt...');
      setHintMsg('Vui lòng giữ yên');

      const video = videoRef.current;
      const { descriptor } = await extractFaceDescriptor(video);
      const base64Image = captureFrameBase64(video, canvasRef.current);
      const clientMeta = await buildCheckinClientMeta(canvasRef.current, video);
      
      const livenessChallenge = CHECKIN_LIVENESS_STEPS.map((s) => s.id).join(',');

      // For kiosk mode, we use the public endpoint that matches any employee
      const response = await axiosClient.post('/api/attendances/kiosk-checkin', {
        descriptor,
        base64Image,
        livenessPassed: true,
        livenessChallenge,
        ...clientMeta,
      });

      toast.success(response.data.message);
      setStatusMsg(response.data.message);
      setHintMsg('');
      setResultData(response.data);
      syncPhase('done');

      // Auto reset for next person
      setTimeout(() => startNewSession(), SUCCESS_RESET_DELAY);
      
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || 'Lỗi khi chấm công';
      
      toast.error(message);
      setStatusMsg(message);
      setHintMsg('Thử lại từ đầu quy trình');
      syncPhase('error');
      
      // Auto reset on error as well for next person
      setTimeout(() => startNewSession(), SUCCESS_RESET_DELAY);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [initSession, startNewSession, checkLighting]);

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
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-6 text-center text-white">
          <h1 className="text-3xl font-bold mb-2">Hệ Thống Nhận Diện Chấm Công</h1>
          <p className="text-blue-100 text-lg">Chấm công tự động đa nhân viên - Vui lòng thực hiện theo hướng dẫn</p>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
          {/* Camera Section */}
          <div className="flex flex-col">
            <div className="relative overflow-hidden rounded-2xl bg-black aspect-video shadow-inner flex-grow">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-80 sm:w-80 sm:h-96 border-4 border-dashed border-green-400 rounded-[50%] opacity-80" />
              </div>
              
              {phase === 'loading' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-lg font-medium">Đang khởi động hệ thống...</p>
                </div>
              )}
              
              {phase === 'capture' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
                  <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-lg font-medium">Đang phân tích khuôn mặt...</p>
                </div>
              )}

              {phase === 'done' && resultData && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-900/90 text-white p-6 text-center">
                  <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold mb-2">{resultData.fullName}</h2>
                  <p className="text-xl mb-4">{resultData.message}</p>
                  <p className="text-sm text-green-200">Hệ thống sẽ tự động khởi động lại trong giây lát...</p>
                </div>
              )}

              {phase === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/90 text-white p-6 text-center">
                  <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Thất bại</h2>
                  <p className="text-lg mb-4">{statusMsg}</p>
                  <p className="text-sm text-red-200">Hệ thống sẽ tự động khởi động lại trong giây lát...</p>
                </div>
              )}

              {lightWarning && phase === 'liveness' && (
                <div className="absolute top-4 left-4 right-4 px-4 py-3 rounded-xl bg-amber-500/95 text-white text-sm font-semibold text-center shadow-lg">
                  💡 {lightWarning}
                </div>
              )}
              
              {phase === 'liveness' && currentStep && (
                <div className="absolute top-4 left-4 right-4 text-center">
                  <span className="inline-block px-4 py-2 rounded-full bg-black/70 text-white text-sm font-bold shadow-lg">
                    Bước {Math.min(stepIndex + 1, CHECKIN_LIVENESS_STEPS.length)} / {CHECKIN_LIVENESS_STEPS.length}
                    {stepIndex >= CHECKIN_LIVENESS_STEPS.length ? ' — Chuẩn bị chụp' : ''}
                  </span>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Status Bar */}
            <div className="mt-6 p-5 rounded-2xl bg-blue-50 border border-blue-100">
              <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-2">Trạng thái hiện tại</h3>
              <p className={`text-xl font-bold ${phase === 'error' ? 'text-red-600' : phase === 'done' ? 'text-green-600' : 'text-blue-700'}`}>
                {statusMsg}
              </p>
              {hintMsg && phase === 'liveness' && (
                <p className="mt-2 text-md text-slate-600 font-medium">{hintMsg}</p>
              )}
              
              {(phase === 'liveness' || phase === 'capture') && (
                <div className="mt-4 h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar / Instructions */}
          <div className="flex flex-col space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h2 className="font-bold text-lg text-slate-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Hướng dẫn chấm công
              </h2>
              <ul className="space-y-3">
                {CHECKIN_LIVENESS_STEPS.map((s, i) => (
                  <li 
                    key={s.id}
                    className={`flex items-start p-3 rounded-xl transition-colors ${
                      i < stepIndex 
                        ? 'bg-green-50 text-green-800 border border-green-100' 
                        : i === stepIndex && phase === 'liveness'
                          ? 'bg-blue-50 text-blue-800 border-2 border-blue-300 shadow-sm'
                          : 'bg-slate-50 text-slate-500'
                    }`}
                  >
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                      i < stepIndex ? 'bg-green-200 text-green-800' : i === stepIndex && phase === 'liveness' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {i < stepIndex ? '✓' : i + 1}
                    </span>
                    <span className="text-sm font-medium leading-tight pt-0.5">{s.label.replace(/^Bước \d\/\d: /, '')}</span>
                  </li>
                ))}
                <li className={`flex items-start p-3 rounded-xl transition-colors ${
                  stepIndex >= CHECKIN_LIVENESS_STEPS.length && phase === 'liveness'
                    ? 'bg-blue-50 text-blue-800 border-2 border-blue-300 shadow-sm'
                    : phase === 'done' || phase === 'capture'
                      ? 'bg-green-50 text-green-800 border border-green-100'
                      : 'bg-slate-50 text-slate-500'
                }`}>
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                    stepIndex >= CHECKIN_LIVENESS_STEPS.length && phase === 'liveness' ? 'bg-blue-600 text-white' : phase === 'done' || phase === 'capture' ? 'bg-green-200 text-green-800' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {phase === 'done' || phase === 'capture' ? '✓' : '5'}
                  </span>
                  <span className="text-sm font-medium leading-tight pt-0.5">Xác thực hệ thống</span>
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 shadow-sm">
              <h3 className="font-bold text-amber-800 mb-2 flex items-center text-sm">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                Lưu ý quan trọng
              </h3>
              <ul className="list-disc list-inside text-xs text-amber-900 space-y-1.5 ml-1">
                <li>Đảm bảo môi trường đủ sáng</li>
                <li>Không đeo kính râm hoặc khẩu trang</li>
                <li>Hệ thống tự động sẵn sàng cho người tiếp theo sau khi chấm công</li>
              </ul>
            </div>

            {(phase === 'error' || phase === 'done') && !submitting && (
              <button
                type="button"
                onClick={startNewSession}
                className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 shadow-md transition-all active:scale-[0.98]"
              >
                Chấm Công Tiếp Theo Ngay
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceChamCong;
