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

  advanceLivenessStep,

  isCheckinLivenessComplete,

} from '../utils/livenessDetection';



const DETECT_INTERVAL_MS = 100;

const DETECT_INTERVAL_BLINK_MS = 50;

const SETTLE_FRAMES = 3;



const FaceCheckin = () => {

  const videoRef = useRef(null);

  const canvasRef = useRef(null);

  const streamRef = useRef(null);

  const rafRef = useRef(null);

  const livenessStateRef = useRef(createLivenessSessionState());

  const phaseRef = useRef('loading');

  const submittingRef = useRef(false);

  const lastDetectAtRef = useRef(0);

  const settleFramesRef = useRef(0);



  const [phase, setPhase] = useState('loading');

  const [stepIndex, setStepIndex] = useState(0);

  const [statusMsg, setStatusMsg] = useState('Đang tải model và camera...');

  const [hintMsg, setHintMsg] = useState('');

  const [progress, setProgress] = useState(0);

  const [submitting, setSubmitting] = useState(false);



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

    settleFramesRef.current = 0;

    setStepIndex(0);

    setProgress(0);

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

    submittingRef.current = true;

    setSubmitting(true);



    if (rafRef.current) cancelAnimationFrame(rafRef.current);



    try {

      syncPhase('capture');

      setStatusMsg('Đang chụp và xác thực khuôn mặt...');

      setHintMsg('Vui lòng giữ yên');



      const video = videoRef.current;

      const { descriptor } = await extractFaceDescriptor(video);

      const base64Image = captureFrameBase64(video, canvasRef.current);

      stopCamera();

      const date = new Date().toISOString().slice(0, 10);



      const livenessChallenge = CHECKIN_LIVENESS_STEPS.map((s) => s.id).join(',');



      const response = await axiosClient.post('/api/attendances/checkin', {

        descriptor,

        base64Image,

        date,

        livenessPassed: true,

        livenessChallenge,

      });



      toast.success(response.data.message);

      setStatusMsg(response.data.message);

      setHintMsg('');

      syncPhase('done');



      if (response.data.action === 'checkIn') {

        setTimeout(() => startNewSession(), 4000);

      }

    } catch (error) {

      const message =

        error.response?.data?.message || error.message || 'Lỗi khi chấm công';

      toast.error(message);

      setStatusMsg(message);

      setHintMsg('Thử lại từ đầu quy trình');

      await initSession();

    } finally {

      submittingRef.current = false;

      setSubmitting(false);

    }

  }, [stopCamera, initSession, startNewSession]);



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



        const state = livenessStateRef.current;

        const idx = state.stepIndex ?? 0;

        const isBlinkStep = idx < CHECKIN_LIVENESS_STEPS.length && CHECKIN_LIVENESS_STEPS[idx]?.id === 'blink';

        const intervalMs = isBlinkStep ? DETECT_INTERVAL_BLINK_MS : DETECT_INTERVAL_MS;



        if (idx >= CHECKIN_LIVENESS_STEPS.length) {

          settleFramesRef.current += 1;

          setStepIndex(CHECKIN_LIVENESS_STEPS.length);

          setStatusMsg('Hoàn tất kiểm tra — đang chụp ảnh...');

          setHintMsg(`Giữ mặt trong khung (${settleFramesRef.current}/${SETTLE_FRAMES})`);

          setProgress(100);



          if (settleFramesRef.current >= SETTLE_FRAMES) {

            await performCheckIn();

            return;

          }

          rafRef.current = requestAnimationFrame(tick);

          return;

        }



        if (now - lastDetectAtRef.current < intervalMs) {

          rafRef.current = requestAnimationFrame(tick);

          return;

        }

        lastDetectAtRef.current = now;



        const step = CHECKIN_LIVENESS_STEPS[idx];

        const det = await faceapi

          .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))

          .withFaceLandmarks();



        const result = processCheckinLivenessStep(step, det, state, {

          mirrorPreview: true,

          now,

        });



        setStepIndex(state.stepIndex ?? idx);

        setProgress(result.overallProgress ?? Math.round(((idx + result.stepProgress / 100) / CHECKIN_LIVENESS_STEPS.length) * 100));

        setStatusMsg(result.statusText);

        setHintMsg(step.hint);



        if (result.completed) {

          advanceLivenessStep(state);

          settleFramesRef.current = 0;

          setStepIndex(state.stepIndex ?? idx + 1);



          if (isCheckinLivenessComplete(state)) {

            setStatusMsg('Đã xong 4 bước! Đang chuẩn bị chụp ảnh...');

            setHintMsg('Giữ mặt trong khung xanh');

            setProgress(100);

          } else {

            const next = CHECKIN_LIVENESS_STEPS[state.stepIndex];

            if (next) {

              setStatusMsg(next.label);

              setHintMsg(next.hint);

            }

          }

        }

      } catch {

        // tiếp tục vòng lặp

      }



      rafRef.current = requestAnimationFrame(tick);

    };



    rafRef.current = requestAnimationFrame(tick);

  }, [performCheckIn]);



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



  const currentStep = CHECKIN_LIVENESS_STEPS[stepIndex];



  return (

    <div className="p-6 bg-gray-50 min-h-screen">

      <div className="max-w-4xl mx-auto">

        <div className="mb-6">

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Chấm công bằng khuôn mặt</h1>

          <p className="text-gray-600">

            Làm lần lượt 4 bước theo hướng dẫn trên màn hình. Hệ thống chỉ ghi nhận khi hoàn tất

            toàn bộ.

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

                <div className="w-48 h-64 border-2 border-dashed border-green-400 rounded-[50%] opacity-80" />

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

              {phase === 'liveness' && currentStep && (

                <div className="absolute top-3 left-3 right-3 text-center">

                  <span className="inline-block px-3 py-1 rounded-full bg-black/60 text-white text-xs font-semibold">

                    Bước {Math.min(stepIndex + 1, CHECKIN_LIVENESS_STEPS.length)}/

                    {CHECKIN_LIVENESS_STEPS.length}

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

                      {i + 1}. {s.id === 'front' ? 'Thẳng' : s.id === 'blink' ? 'Chớp mắt' : s.id === 'turn_left' ? 'Trái' : 'Phải'}

                    </li>

                  ))}

                </ul>

              )}

            </div>



            {(phase === 'done' || phase === 'error') && !submitting && (

              <button

                type="button"

                onClick={startNewSession}

                className="mt-4 w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"

              >

                {phase === 'error' ? 'Thử lại' : 'Chấm công lần nữa'}

              </button>

            )}

          </div>



          <div className="space-y-4">

            <div className="bg-white rounded-2xl shadow p-5 border border-slate-200">

              <h2 className="font-bold text-lg mb-3">Quy trình (4 bước)</h2>

              <ol className="list-decimal list-inside text-sm text-slate-700 space-y-2">

                {CHECKIN_LIVENESS_STEPS.map((s) => (

                  <li key={s.id}>{s.label.replace(/^Bước \d\/\d: /, '')}</li>

                ))}

                <li>Hệ thống tự chụp và so khớp đúng tài khoản của bạn</li>

              </ol>

            </div>

            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 text-sm text-amber-900">

              Không dùng ảnh in hay video. Mỗi bước cần giữ tư thế vài giây. Nhận diện sai sẽ

              không đăng xuất — chỉ báo lỗi để thử lại.

            </div>

          </div>

        </div>

      </div>

    </div>

  );

};



export default FaceCheckin;

