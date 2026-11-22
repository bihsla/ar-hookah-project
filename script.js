import {
  FaceLandmarker,
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const video = document.getElementById("camera");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");

const status = document.getElementById("status");
const instruction = document.getElementById("instruction");

let faceTracker, handTracker;
let stream;
let running = false;
let inhaling = false;
let inhaleTime = 0;
let smoke = [];
let lastTime = -1;

async function setup() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );

  faceTracker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numFaces: 1
  });

  handTracker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numHands: 1
  });
}

function resize() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}

window.addEventListener("resize", resize);

function pos(p) {
  return {
    x: (1 - p.x) * canvas.width,
    y: p.y * canvas.height
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

async function startCamera() {
  try {
    status.textContent = "Loading tracking…";

    await setup();

    stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });

    video.srcObject = stream;
    await video.play();

    running = true;
    document.getElementById("welcome").classList.add("hidden");
    document.getElementById("stopBtn").disabled = false;
    document.getElementById("smokeBtn").disabled = false;

    resize();
    status.textContent = "Camera active";

    requestAnimationFrame(loop);
  } catch (error) {
    console.error(error);
    status.textContent = "Camera error";
  }
}

function stopCamera() {
  running = false;

  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }

  video.srcObject = null;
  smoke = [];

  document.getElementById("welcome").classList.remove("hidden");
  document.getElementById("startBtn").disabled = false;
  document.getElementById("stopBtn").disabled = true;
  document.getElementById("smokeBtn").disabled = true;
}

document.getElementById("startBtn").onclick = startCamera;
document.getElementById("stopBtn").onclick = stopCamera;

document.getElementById("smokeBtn").onclick = () => {
  createSmoke(canvas.width / 2, canvas.height / 2, 2);
};

function drawHookah(pipe) {
  const x = canvas.width * 0.85;
  const y = canvas.height * 0.85;

  ctx.lineCap = "round";

  ctx.fillStyle = "#b99add";
  ctx.beginPath();
  ctx.ellipse(x, y, 38, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#d6baff";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(x, y - 15);
  ctx.lineTo(x, canvas.height * 0.58);
  ctx.stroke();

  ctx.strokeStyle = "#292033";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(x, canvas.height * 0.6);
  ctx.quadraticCurveTo(
    canvas.width * 0.65,
    canvas.height * 0.7,
    pipe.x,
    pipe.y
  );
  ctx.stroke();

  ctx.strokeStyle = "#c8a7ff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, canvas.height * 0.6);
  ctx.quadraticCurveTo(
    canvas.width * 0.65,
    canvas.height * 0.7,
    pipe.x,
    pipe.y
  );
  ctx.stroke();

  ctx.fillStyle = "#eee4ff";
  ctx.beginPath();
  ctx.roundRect(pipe.x - 30, pipe.y - 6, 40, 12, 6);
  ctx.fill();
}

function createSmoke(x, y, strength = 1) {
  for (let i = 0; i < 220 * strength; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4;

    smoke.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size: 10 + Math.random() * 25,
      alpha: 0.25,
      life: 130,
      age: 0
    });
  }
}

function drawSmoke() {
  for (let i = smoke.length - 1; i >= 0; i--) {
    const p = smoke[i];

    p.x += p.vx;
    p.y += p.vy;

    p.vx *= 0.99;
    p.vy *= 0.99;

    p.size += 0.2;
    p.age++;

    const opacity = p.alpha * (1 - p.age / p.life);

    ctx.fillStyle = `rgba(240,240,245,${opacity})`;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();

    if (p.age >= p.life) {
      smoke.splice(i, 1);
    }
  }
}

function loop() {
  if (!running) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (video.currentTime !== lastTime) {
    lastTime = video.currentTime;

    const now = performance.now();

    const face = faceTracker.detectForVideo(video, now);
    const hand = handTracker.detectForVideo(video, now);

    if (face.faceLandmarks.length && hand.landmarks.length) {
      const f = face.faceLandmarks[0];
      const h = hand.landmarks[0];

      const mouthTop = pos(f[13]);
      const mouthBottom = pos(f[14]);
      const mouthLeft = pos(f[61]);
      const mouthRight = pos(f[291]);

      const mouth = {
        x: (mouthLeft.x + mouthRight.x) / 2,
        y: (mouthTop.y + mouthBottom.y) / 2
      };

      const thumb = pos(h[4]);
      const index = pos(h[8]);

      const pipe = {
        x: (thumb.x + index.x) / 2,
        y: (thumb.y + index.y) / 2
      };

      const pinch = distance(thumb, index) < 55;
      const nearMouth = distance(pipe, mouth) < 110;

      const mouthOpen =
        distance(mouthTop, mouthBottom) > 12;

      drawHookah(pipe);

      if (pinch && nearMouth) {
        if (!inhaleTime) inhaleTime = now;

        if (now - inhaleTime > 700) {
          inhaling = true;
          status.textContent = "Inhaling";
          instruction.textContent =
            "Pull the pipe away and open your mouth!";
        }
      }

      if (!nearMouth && inhaling && mouthOpen) {
        inhaling = false;
        inhaleTime = 0;

        createSmoke(mouth.x, mouth.y, 2.5);

        status.textContent = "BIG SMOKE!";
        instruction.textContent =
          "Smoke released! Bring the pipe back to inhale.";
      }

      if (!pinch || !nearMouth) {
        if (!inhaling) inhaleTime = 0;
      }
    }
  }

  drawSmoke();

  requestAnimationFrame(loop);
}
