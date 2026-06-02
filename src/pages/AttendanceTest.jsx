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
import { formatDateTime, testResultLabel } from '../utils/attendanceDisplay';

const DETECT_INTERVAL_MS = 100;
const DETECT_INTERVAL_BLINK_MS = 40;

const AttendanceTest = () => {
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
  const [statusMsg, setStatusMsg] = useState('Đang tải...');
  const [hintMsg, setHintMsg] = useState('');
  const [lightWarning, setLightWarning] = useState('');
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [testLogs, setTestLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const syncPhase = (next) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const loadTestLogs = useCallback(async () => {
    try {
      setLoadingLogs(true);
      const res = await axiosClient.get('/api/attendances/test/me');
      setTestLogs(res.data || []);
    } catch {
      setTestLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

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
      setStatusMsg('Đang mở camera...');
      const video = await waitForVideoElement(() => videoRef.current);
      streamRef.current = await startCamera(video);
      const first = CHECKIN_LIVENESS_STEPS[0];
      syncPhase('liveness');
      setStatusMsg(first.label);
      setHintMsg(first.hint);
    } catch (error) {
      setStatusMsg(error.message || 'Không thể mở camera.');
      syncPhase('error');
    }
  }, [stopCamera, resetLiveness]);

  const runTest = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    try {
      const light = checkLighting();
      if (!light.ok) {
        throw new Error(light.message || 'Ánh sáng không đủ.');
      }

      syncPhase('capture');
      setStatusMsg('Đang xác thực khuôn mặt (test)...');

      const video = videoRef.current;
      const { descriptor } = await extractFaceDescriptor(video);
      const base64Image = captureFrameBase64(video, canvasRef.current);
      const clientMeta = await buildCheckinClientMeta(canvasRef.current, video);
      stopCamera();

      const livenessChallenge = CHECKIN_LIVENESS_STEPS.map((s) => s.id).join(',');

      const response = await axiosClient.post('/api/attendances/test', {
        descriptor,
        base64Image,
        livenessPassed: true,
        livenessChallenge,
        ...clientMeta,
      });

      toast.success(response.data.message);
      setStatusMsg(response.data.message);
      syncPhase('done');
      await loadTestLogs();
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || 'Test thất bại';
      toast.error(message);
      setStatusMsg(message);
      setHintMsg('Có thể thử lại ngay — không giới hạn số lần test');
      syncPhase('error');
      await loadTestLogs();
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [stopCamera, checkLighting, loadTestLogs]);

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
            await runTest();
            return;
          }
        } else {
          const step = CHECKIN_LIVENESS_STEPS[idx];
          result = processCheckinLivenessStep(step, det, state, { mirrorPreview: true, now });
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
              setStatusMsg('Đã xong 4 bước! Nhìn thẳng camera để test...');
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
        // tiếp tục
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [runTest, checkLighting]);

  useEffect(() => {
    loadTestLogs();
    initSession();
    return () => stopCamera();
  }, [initSession, stopCamera, loadTestLogs]);

  useEffect(() => {
    if (phase === 'liveness') runLivenessLoop();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, runLivenessLoop]);

  const successCount = testLogs.filter((t) => t.success).length;
  const failCount = testLogs.length - successCount;
  const spoofCount = testLogs.filter(
    (t) => !t.success && (t.possibleSpoof || t.failureReason === 'other_closer')
  ).length;

  return (
    <div className="page-shell">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Test chấm công (thử nghiệm)
          </h1>
          <p className="text-gray-600">
            Thử nhiều lần tùy ý — không ghi vào chấm công chính thức. Hệ thống kiểm tra liveness,
            so khớp khuôn mặt và ghi lại từng lượt (thành công / thất bại / nghi giả mạo).
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
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
                <div className="w-36 h-48 sm:w-48 sm:h-64 border-2 border-dashed border-purple-400 rounded-[50%] opacity-80" />
              </div>
              {phase === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-sm">
                  Đang khởi động...
                </div>
              )}
              {lightWarning && phase === 'liveness' && (
                <div className="absolute top-3 left-3 right-3 px-3 py-2 rounded-lg bg-amber-500/95 text-white text-xs text-center">
                  💡 {lightWarning}
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="mt-4 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-medium text-slate-800">Trạng thái</p>
              <p
                className={`mt-2 text-base font-semibold ${
                  phase === 'error' ? 'text-red-600' : 'text-purple-700'
                }`}
              >
                {statusMsg}
              </p>
              {hintMsg && <p className="mt-1 text-sm text-slate-600">{hintMsg}</p>}
              {(phase === 'liveness' || phase === 'capture') && (
                <div className="mt-3 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>

            {(phase === 'done' || phase === 'error') && !submitting && (
              <button
                type="button"
                onClick={initSession}
                className="mt-4 w-full py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700"
              >
                Chạy test lần nữa
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow p-5 border border-slate-200">
              <h2 className="font-bold text-lg mb-3">Thống kê test</h2>
              <ul className="text-sm space-y-2">
                <li>
                  Tổng lượt: <strong>{testLogs.length}</strong>
                </li>
                <li className="text-green-700">
                  Thành công: <strong>{successCount}</strong>
                </li>
                <li className="text-red-700">
                  Thất bại: <strong>{failCount}</strong>
                </li>
                <li className="text-amber-700">
                  Nghi giả mạo: <strong>{spoofCount}</strong>
                </li>
              </ul>
            </div>

            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200 text-sm text-purple-900">
              Test không thay thế chấm công thật. Mỗi ngày chỉ được 1 lần check-in và 1 lần
              check-out tại trang Chấm công chính.
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b flex flex-wrap justify-between items-center gap-2">
            <h2 className="font-bold text-lg">Lịch sử test gần đây</h2>
            <button
              type="button"
              onClick={loadTestLogs}
              className="text-sm text-purple-600 hover:underline"
            >
              Làm mới
            </button>
          </div>
          {loadingLogs ? (
            <p className="p-6 text-center text-gray-500">Đang tải...</p>
          ) : testLogs.length === 0 ? (
            <p className="p-6 text-center text-gray-500">Chưa có lượt test nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Thời gian
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Kết quả
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Chi tiết
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Khoảng cách mặt
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Liveness
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {testLogs.map((row) => {
                    const label = testResultLabel(row);
                    return (
                      <tr key={row.id}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatDateTime(row.timestamp)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${label.className}`}
                          >
                            {label.text}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-xs">
                          <p>{row.message}</p>
                          {row.warnings?.length > 0 && (
                            <ul className="mt-1 text-xs text-amber-700 list-disc list-inside">
                              {row.warnings.map((w) => (
                                <li key={w}>{w}</li>
                              ))}
                            </ul>
                          )}
                          {row.spoofSuspect && (
                            <p className="text-xs text-amber-600 mt-1">Ánh sáng thấp</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs">
                          {row.faceDistance != null ? row.faceDistance.toFixed(4) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.livenessPassed ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-red-600">✗</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceTest;
