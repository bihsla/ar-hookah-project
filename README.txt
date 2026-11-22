AR Hookah Smoke Effect - starter project

Requirements:
- PHP 8 or newer (XAMPP is fine)
- Modern Chrome or Edge
- Internet connection for MediaPipe JS/WASM and face landmark model

Run with XAMPP:
1. Copy the "hookah-ar-project" folder into htdocs.
2. Start Apache in XAMPP.
3. Open http://localhost/hookah-ar-project/
4. Press Start camera and allow webcam access.

Important:
- Camera access requires localhost or HTTPS.
- The project uses a browser-based face landmark model. It does not detect actual breathing.
- Demo behavior: hold your mouth open for about 0.65 seconds to simulate inhale, then close it to trigger smoke.
- The virtual hookah is drawn with Canvas and follows the detected mouth.
- PHP stores exhale event counts in data/sessions.json.
- If the MediaPipe GPU delegate fails on your device, change delegate: "GPU" to delegate: "CPU" in script.js.
