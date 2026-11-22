import { FaceLandmarker, FilesetResolver } from
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const video = document.querySelector("#camera");
const canvas = document.querySelector("#overlay");
const ctx = canvas.getContext("2d");
const statusEl = document.querySelector("#status");
const instructionEl = document.querySelector("#instruction");
const welcome = document.querySelector("#welcome");
const startBtn = document.querySelector("#startBtn");
const stopBtn = document.querySelector("#stopBtn");
const smokeBtn = document.querySelector("#smokeBtn");

let stream = null;
let faceLandmarker = null;
let running = false;
let lastVideoTime = -1;
let inhaleStartedAt = 0;
let inhaling = false;
let smokeParticles = [];
let lastSmokeAt = 0;
let sessionCount = 0;

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resizeCanvas);

async function setupFaceLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );
  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: false
  });
}

async function startCamera() {
  try {
    startBtn.disabled = true;
    statusEl.textContent = "Starting camera…";
    if (!faceLandmarker) await setupFaceLandmarker();

    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    video.srcObject = stream;
    await video.play();

    running = true;
    welcome.classList.add("hidden");
    stopBtn.disabled = false;
    smokeBtn.disabled = false;
    statusEl.textContent = "Camera active";
    instructionEl.textContent = "Open your mouth for a moment to inhale, then close it to exhale.";
    resizeCanvas();
    requestAnimationFrame(renderLoop);
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Camera unavailable";
    instructionEl.textContent =
      "Camera or face tracking failed. Allow camera access and use localhost or HTTPS.";
    startBtn.disabled = false;
  }
}

function stopCamera() {
  running = false;
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
  video.srcObject = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  smokeParticles = [];
  inhaling = false;
  inhaleStartedAt = 0;
  welcome.classList.remove("hidden");
  startBtn.disabled = false;
  stopBtn.disabled = true;
  smokeBtn.disabled = true;
  statusEl.textContent = "Camera stopped";
  instructionEl.textContent = "Press Start camera to begin.";
}

startBtn.addEventListener("click", startCamera);
stopBtn.addEventListener("click", stopCamera);
smokeBtn.addEventListener("click", () => {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  createSmoke(w * 0.5, h * 0.48);
});

function point(landmarks, index, width, height) {
  const p = landmarks[index];
  return { x: (1 - p.x) * width, y: p.y * height };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function drawHookah(mouth, width, height) {
  const baseX = width * 0.83;
  const baseY = height * 0.84;
  const neckX = width * 0.82;
  const neckY = height * 0.55;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Hookah base and stem
  const baseGrad = ctx.createLinearGradient(baseX - 38, baseY - 8, baseX + 38, baseY + 28);
  baseGrad.addColorStop(0, "#d9c7f4");
  baseGrad.addColorStop(.45, "#7c5da8");
  baseGrad.addColorStop(1, "#382b4b");
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.ellipse(baseX, baseY, 43, 23, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#d9c7f4";
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(neckX, baseY - 12);
  ctx.lineTo(neckX, neckY + 25);
  ctx.stroke();

  ctx.strokeStyle = "#5b4776";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(neckX, baseY - 12);
  ctx.lineTo(neckX, neckY + 25);
  ctx.stroke();

  // Bowl
  ctx.fillStyle = "#b99adf";
  ctx.beginPath();
  ctx.ellipse(neckX, neckY + 20, 23, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(neckX - 16, neckY - 2, 32, 20);

  // Hose curves from the stem to the person's mouth
  ctx.strokeStyle = "#201a2b";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(neckX + 5, neckY + 32);
  ctx.bezierCurveTo(width * 0.98, height * 0.58, width * 0.97, mouth.y + 30, mouth.x + 8, mouth.y + 9);
  ctx.stroke();

  ctx.strokeStyle = "#c8a7ff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(neckX + 5, neckY + 32);
  ctx.bezierCurveTo(width * 0.98, height * 0.58, width * 0.97, mouth.y + 30, mouth.x + 8, mouth.y + 9);
  ctx.stroke();

  // Mouthpiece
  ctx.fillStyle = "#f1e8ff";
  ctx.beginPath();
  ctx.roundRect(mouth.x - 13, mouth.y + 2, 30, 10, 5);
  ctx.fill();

  ctx.restore();
}

function createSmoke(x, y) {
  const amount = 28;
  for (let i = 0; i < amount; i++) {
    smokeParticles.push({
      x: x + (Math.random() - .5) * 18,
      y: y + (Math.random() - .5) * 12,
      vx: (Math.random() - .5) * 0.8,
      vy: -0.7 - Math.random() * 1.6,
      radius: 7 + Math.random() * 15,
      alpha: 0.22 + Math.random() * 0.22,
      life: 70 + Math.random() * 45,
      age: 0
    });
  }
}

function drawSmoke() {
  for (let i = smokeParticles.length - 1; i >= 0; i--) {
    const p = smokeParticles[i];
    p.age++;
    p.x += p.vx;
    p.y += p.vy;
    p.vx += (Math.random() - .5) * 0.06;
    p.radius += 0.09;

    const fade = Math.max(0, 1 - p.age / p.life);
    ctx.fillStyle = `rgba(235,232,242,${p.alpha * fade})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.radius * 0.8, p.radius, Math.random() * 0.4, 0, Math.PI * 2);
    ctx.fill();

    if (p.age >= p.life) smokeParticles.splice(i, 1);
  }
}

function renderLoop() {
  if (!running) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);

  if (video.currentTime !== lastVideoTime && video.readyState >= 2) {
    lastVideoTime = video.currentTime;
    const result = faceLandmarker.detectForVideo(video, performance.now());

    if (result.faceLandmarks && result.faceLandmarks.length) {
      const landmarks = result.faceLandmarks[0];
      const mouthTop = point(landmarks, 13, width, height);
      const mouthBottom = point(landmarks, 14, width, height);
      const mouthLeft = point(landmarks, 61, width, height);
      const mouthRight = point(landmarks, 291, width, height);
      const faceTop = point(landmarks, 10, width, height);
      const chin = point(landmarks, 152, width, height);

      const mouth = {
        x: (mouthLeft.x + mouthRight.x) / 2,
        y: (mouthTop.y + mouthBottom.y) / 2
      };
      const mouthOpening = distance(mouthTop, mouthBottom) / Math.max(1, distance(faceTop, chin));

      drawHookah(mouth, width, height);

      // Hold mouth open to inhale; closing it after the inhale triggers exhale.
      if (mouthOpening > 0.035) {
        if (!inhaleStartedAt) inhaleStartedAt = performance.now();
        if (!inhaling && performance.now() - inhaleStartedAt > 650) {
          inhaling = true;
          statusEl.textContent = "Inhaling…";
          instructionEl.textContent = "Inhale detected. Close your mouth to exhale smoke.";
        }
      } else {
        inhaleStartedAt = 0;
        if (inhaling) {
          inhaling = false;
          sessionCount++;
          createSmoke(mouth.x, mouth.y);
          statusEl.textContent = "Exhaling";
          instructionEl.textContent = "Smoke effect triggered! Open your mouth again to repeat.";
          fetch("backend/save_session.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "exhale", count: sessionCount })
          }).catch(() => {});
        } else {
          statusEl.textContent = "Face detected";
        }
      }
    } else {
      statusEl.textContent = "Looking for face…";
    }
  }

  drawSmoke();
  requestAnimationFrame(renderLoop);
}
