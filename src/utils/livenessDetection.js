/**

 * Liveness detection dựa trên faceLandmark68Net (EAR chớp mắt, yaw quay đầu).

 */



const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);



const eyeAspectRatio = (eyePoints) => {

  const p2_p6 = dist(eyePoints[1], eyePoints[5]);

  const p3_p5 = dist(eyePoints[2], eyePoints[4]);

  const p1_p4 = dist(eyePoints[0], eyePoints[3]);

  if (p1_p4 === 0) return 0;

  return (p2_p6 + p3_p5) / (2.0 * p1_p4);

};



export const getHeadYaw = (landmarks) => {

  const nose = landmarks.getNose()[3];

  const jaw = landmarks.getJawOutline();

  const left = jaw[0];

  const right = jaw[16];

  const faceWidth = right.x - left.x;

  if (faceWidth === 0) return 0;

  const centerX = (left.x + right.x) / 2;

  return (nose.x - centerX) / (faceWidth / 2);

};



/** Video hiển thị mirror (scale-x-[-1]) — đảo yaw để hướng dẫn khớp màn hình */

export const getDisplayYaw = (landmarks, mirrorPreview = true) => {

  const yaw = getHeadYaw(landmarks);

  return mirrorPreview ? -yaw : yaw;

};



export const CHALLENGES = {

  BLINK: 'blink',

  TURN_LEFT: 'turn_left',

  TURN_RIGHT: 'turn_right',

  FRONT: 'front',

};



/** Các bước liveness cố định khi chấm công — text đổi tuần tự */

export const CHECKIN_LIVENESS_STEPS = [

  {

    id: CHALLENGES.FRONT,

    label: 'Bước 1/4: Nhìn thẳng vào camera',

    hint: 'Giữ mặt trong khung viền xanh, nhìn thẳng',

    holdFrames: 12,

  },

  {

    id: CHALLENGES.TURN_LEFT,

    label: 'Bước 2/4: Quay mặt sang TRÁI màn hình',

    hint: 'Quay từ từ — mũi lệch về phía trái trên màn hình',

    holdFrames: 10,

  },

  {

    id: CHALLENGES.TURN_RIGHT,

    label: 'Bước 3/4: Quay mặt sang PHẢI màn hình',

    hint: 'Quay từ từ — mũi lệch về phía phải trên màn hình',

    holdFrames: 10,

  },

  {

    id: CHALLENGES.BLINK,

    label: 'Bước 4/4: Chớp mắt 2 lần',

    hint: 'Chớp mắt tự nhiên, không che mặt',

    holdFrames: 0,

  },

];



export const CHALLENGE_LABELS = {

  [CHALLENGES.BLINK]: 'Vui lòng chớp mắt 2 lần',

  [CHALLENGES.TURN_LEFT]: 'Vui lòng quay đầu nhẹ sang trái màn hình',

  [CHALLENGES.TURN_RIGHT]: 'Vui lòng quay đầu nhẹ sang phải màn hình',

  [CHALLENGES.FRONT]: 'Nhìn thẳng vào camera',

};



export const pickRandomChallenge = () => {

  const list = [CHALLENGES.BLINK, CHALLENGES.TURN_LEFT, CHALLENGES.TURN_RIGHT];

  return list[Math.floor(Math.random() * list.length)];

};



export const createLivenessSessionState = () => ({

  blinkCount: 0,

  blinkPhase: 'open',

  holdFrames: 0,

  stepIndex: 0,

  /** EAR cao nhất gần đây — dùng so sánh tương đối khi chớp */

  earBaseline: 0,

  lastBlinkAt: 0,

  closedSince: 0,

});



const YAW_TURN = 0.16;

const YAW_FRONT_MAX = 0.12;



const isPoseSatisfied = (stepId, yaw, state) => {

  if (stepId === CHALLENGES.FRONT) {

    return Math.abs(yaw) <= YAW_FRONT_MAX;

  }

  if (stepId === CHALLENGES.TURN_LEFT) {

    return yaw < -YAW_TURN;

  }

  if (stepId === CHALLENGES.TURN_RIGHT) {

    return yaw > YAW_TURN;

  }

  if (stepId === CHALLENGES.BLINK) {

    return (state.blinkCount || 0) >= 2;

  }

  return false;

};



/**
 * Phát hiện chớp mắt: kết hợp ngưỡng tuyệt đối + sụt EAR so với baseline gần đây.
 * Tránh bỏ lỡ nháy mắt nhanh khi chỉ lấy mẫu ~50–120ms/lần.
 */
const updateBlinkState = (leftEAR, rightEAR, state, now = Date.now()) => {
  const avgEAR = (leftEAR + rightEAR) / 2;
  const minEAR = Math.min(leftEAR, rightEAR);

  const EAR_CLOSED_MAX = 0.23;
  const EAR_OPEN_MIN = 0.21;
  const RELATIVE_DROP = 0.72;
  const RELATIVE_RECOVER = 0.85;
  const MIN_BLINK_GAP_MS = 280;
  const CLOSED_TIMEOUT_MS = 600;

  if (!state.blinkPhase) state.blinkPhase = 'open';

  if (avgEAR > (state.earBaseline || 0)) {
    state.earBaseline = avgEAR * 0.35 + (state.earBaseline || avgEAR) * 0.65;
  } else if (!state.earBaseline) {
    state.earBaseline = avgEAR;
  }

  const baseline = Math.max(state.earBaseline, 0.15);
  const relativeLow = minEAR / baseline < RELATIVE_DROP;
  const absoluteClosed = minEAR < EAR_CLOSED_MAX || avgEAR < EAR_CLOSED_MAX;
  const eyesClosed = relativeLow || absoluteClosed;

  const relativeOpen = avgEAR / baseline > RELATIVE_RECOVER;
  const absoluteOpen = avgEAR > EAR_OPEN_MIN && minEAR > EAR_OPEN_MIN;
  const eyesOpen = relativeOpen || absoluteOpen;

  if (state.blinkPhase === 'closed' && now - (state.closedSince || now) > CLOSED_TIMEOUT_MS) {
    state.blinkPhase = 'open';
    state.closedSince = 0;
  }

  if (state.blinkPhase === 'open' && eyesClosed) {
    state.blinkPhase = 'closed';
    state.closedSince = now;
  } else if (
    state.blinkPhase === 'closed' &&
    eyesOpen &&
    now - (state.lastBlinkAt || 0) >= MIN_BLINK_GAP_MS
  ) {
    state.blinkCount = (state.blinkCount || 0) + 1;
    state.blinkPhase = 'open';
    state.lastBlinkAt = now;
    state.closedSince = 0;
    state.earBaseline = avgEAR;
  }
};



/**

 * Xử lý một bước trong chuỗi chấm công.

 * @returns {{ completed: boolean, stepProgress: number, statusText: string }}

 */

export const processCheckinLivenessStep = (step, detection, state, options = {}) => {

  const mirrorPreview = options.mirrorPreview !== false;

  const stepIndex = state.stepIndex ?? 0;

  const total = CHECKIN_LIVENESS_STEPS.length;



  if (!detection?.landmarks) {

    return {

      completed: false,

      stepProgress: 0,

      statusText: `${step.label} — Đưa mặt vào khung hình`,

    };

  }



  const lm = detection.landmarks;

  const yaw = getDisplayYaw(lm, mirrorPreview);



  if (step.id === CHALLENGES.BLINK) {

    const leftEAR = eyeAspectRatio(lm.getLeftEye());

    const rightEAR = eyeAspectRatio(lm.getRightEye());

    updateBlinkState(leftEAR, rightEAR, state, options.now ?? Date.now());

    const blinkCount = state.blinkCount || 0;

    const stepProgress = Math.min(100, Math.round((blinkCount / 2) * 100));

    const completed = blinkCount >= 2;

    return {

      completed,

      stepProgress,

      statusText: completed

        ? `${step.label} — Hoàn thành!`

        : `${step.label} — Đã chớp ${blinkCount}/2 lần`,

    };

  }



  const satisfied = isPoseSatisfied(step.id, yaw, state);

  const holdTarget = step.holdFrames || 8;



  if (satisfied) {

    state.holdFrames = (state.holdFrames || 0) + 1;

  } else {

    state.holdFrames = 0;

  }



  const stepProgress = Math.min(100, Math.round((state.holdFrames / holdTarget) * 100));

  const completed = state.holdFrames >= holdTarget;



  let hint = step.hint;

  if (!satisfied && step.id === CHALLENGES.TURN_LEFT) {

    hint = 'Tiếp tục quay sang trái màn hình...';

  } else if (!satisfied && step.id === CHALLENGES.TURN_RIGHT) {

    hint = 'Tiếp tục quay sang phải màn hình...';

  } else if (satisfied && !completed) {

    hint = 'Giữ nguyên tư thế...';

  }



  const overallPct = Math.round(((stepIndex + stepProgress / 100) / total) * 100);



  return {

    completed,

    stepProgress,

    overallProgress: overallPct,

    statusText: completed ? `${step.label} — OK` : `${step.label} — ${hint}`,

  };

};



export const advanceLivenessStep = (state) => {

  state.stepIndex = (state.stepIndex ?? 0) + 1;

  state.holdFrames = 0;

  state.blinkCount = 0;

  state.blinkPhase = 'open';

  state.earBaseline = 0;

  state.lastBlinkAt = 0;

  state.closedSince = 0;

};



export const isCheckinLivenessComplete = (state) =>

  (state.stepIndex ?? 0) >= CHECKIN_LIVENESS_STEPS.length;



/**

 * Theo dõi liveness từ detection có landmarks (một thử thách đơn — legacy).

 * @returns {boolean} true khi hoàn thành thử thách

 */

export const updateLivenessProgress = (challenge, detection, state) => {

  if (!detection?.landmarks) return false;



  const lm = detection.landmarks;

  const leftEAR = eyeAspectRatio(lm.getLeftEye());

  const rightEAR = eyeAspectRatio(lm.getRightEye());

  const avgEAR = (leftEAR + rightEAR) / 2;

  const yaw = getDisplayYaw(lm, true);



  if (challenge === CHALLENGES.BLINK) {

    updateBlinkState(leftEAR, rightEAR, state);

    return (state.blinkCount || 0) >= 2;

  }



  if (challenge === CHALLENGES.TURN_LEFT) {

    return yaw < -YAW_TURN;

  }



  if (challenge === CHALLENGES.TURN_RIGHT) {

    return yaw > YAW_TURN;

  }



  return false;

};



export const getPoseHint = (challenge) => {

  if (challenge === CHALLENGES.TURN_LEFT || challenge === 'left') {

    return 'Quay mặt sang trái trên màn hình (nhìn vai trái trong khung)';

  }

  if (challenge === CHALLENGES.TURN_RIGHT || challenge === 'right') {

    return 'Quay mặt sang phải trên màn hình (nhìn vai phải trong khung)';

  }

  if (challenge === 'front' || challenge === CHALLENGES.FRONT) {

    return 'Nhìn thẳng vào camera, giữ yên 1–2 giây';

  }

  return 'Nhìn thẳng, chớp mắt tự nhiên';

};



/** Kiểm tra góc mặt khi đăng ký mẫu */

export const validatePoseForCapture = (poseType, detection) => {

  if (!detection?.landmarks) return false;

  const yaw = getDisplayYaw(detection.landmarks, true);



  if (poseType === 'front') return Math.abs(yaw) < 0.18;

  if (poseType === 'left') return yaw < -0.12;

  if (poseType === 'right') return yaw > 0.12;

  return false;

};


