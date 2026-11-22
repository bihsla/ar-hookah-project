<?php
session_start();
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AR Hookah Smoke Effect</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="app">
    <header class="topbar">
      <div>
        <p class="eyebrow">CAMERA EFFECT</p>
        <h1>AR Hookah</h1>
      </div>
      <span class="pill" id="status">Camera not started</span>
    </header>

    <section class="stage">
      <video id="camera" autoplay playsinline muted></video>
      <canvas id="overlay"></canvas>
      <div class="welcome" id="welcome">
        <div class="welcome-icon">◉</div>
        <h2>Try the smoke effect</h2>
        <p>Allow camera access, keep your face visible, then open your mouth briefly to inhale and close it to exhale.</p>
        <button id="startBtn">Start camera</button>
      </div>
    </section>

    <section class="controls">
      <div class="instructions">
        <span class="dot"></span>
        <p id="instruction">Press Start camera to begin.</p>
      </div>
      <div class="button-row">
        <button class="secondary" id="smokeBtn" disabled>Test smoke</button>
        <button class="secondary" id="stopBtn" disabled>Stop camera</button>
      </div>
    </section>
    <p class="footnote">Demo effect only. The virtual hookah and smoke are drawn on screen; no real smoke is produced.</p>
  </main>
  <script type="module" src="script.js"></script>
</body>
</html>
