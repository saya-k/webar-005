(function () {
  const targetNames = ['1', '2', '3', '4', '5'];
  const NAME_KEY = 'christmasChildName';
  const PC_TEST_MODE = new URLSearchParams(window.location.search).get('pcTest') === '1';

  let scanStatus;
  let scanGuide;
  let loadingOverlay;
  let flowLayer;
  let nameGate;
  let nameInput;
  let nameError;
  let nameBadge;
  let postcardButton;
  let postcardLottieContainer;
  let postcardLottieAnimation;
  let introLottieOverlay;
  let introLottieContainer;
  let introLottieAnimation;
  let introLottiePlayed = false;
  let lottieRuntimePromise;
  let postcardLottiePlayed = false;
  let videoOverlay;
  let christmasVideo;
  let completeOverlay;
  let completeLottieContainer;
  let completeLottieAnimation;
  let loadingText;
  let cameraRetryButton;
  let pcTestButton;
  let pcTestPanel;
  let arCanvas;
  let xrPipelineStarted = false;
  let arCanvasResizeInstalled = false;

  let appStarted = false;
  let cameraPermissionGranted = false;
  let cameraPermissionInFlight = false;
  let cameraStarted = false;
  let waitingForCameraReady = false;
  let bootRequested = false;
  let cameraWaitToken = 0;
  let xrLoadTimer = 0;
  let cameraDebugStatus = '';
  const state = {
    childName: localStorage.getItem(NAME_KEY) || '',
    experienceStarted: false,
    postcardReady: false,
    videoPlaying: false,
    speechWatchdog: null,
    speechDeadlineAt: 0,
    flowToken: 0,
    pcTestActive: false,
  };

  function installStyles() {
    if (document.getElementById('christmas-target-config-style')) return;
    const style = document.createElement('style');
    style.id = 'christmas-target-config-style';
    style.textContent = `
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #000;
        font-family: Arial, Helvetica, sans-serif;
        touch-action: none;
      }

      canvas {
        touch-action: none;
      }

      #xr-camera-canvas {
        position: fixed;
        left: 0;
        top: 0;
        display: block;
        width: 100vw;
        height: 100vh;
        max-width: none;
        max-height: none;
        z-index: 0;
        background: #000;
      }

      #lag-loading-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: grid;
        place-items: center;
        background: #fff;
        color: #183a8f;
      }

      #lag-loading-overlay.hidden {
        display: none;
      }

      .lag-loading-card {
        display: grid;
        justify-items: center;
        gap: 18px;
      }

      .lag-loading-card img {
        width: min(46vw, 220px);
        height: auto;
        display: block;
      }

      .lag-loading-text {
        color: #183a8f;
        font-size: 18px;
        font-weight: 700;
        text-align: center;
      }

      #camera-permission-retry {
        display: none;
        border: 0;
        border-radius: 999px;
        padding: 13px 24px;
        background: #183a8f;
        color: #fff;
        font: 800 16px/1 Arial, Helvetica, sans-serif;
      }

      #camera-permission-retry.visible, #pc-test-mode-button.visible {
        display: inline-flex;
      }

      #pc-test-mode-button {
        display: none;
        border: 1px solid #183a8f;
        border-radius: 999px;
        padding: 12px 22px;
        background: #fff;
        color: #183a8f;
        font: 800 15px/1 Arial, Helvetica, sans-serif;
      }

      #pc-test-panel {
        position: fixed;
        inset: 0;
        z-index: 2147483644;
        display: grid;
        place-items: center;
        padding: 24px;
        background: rgba(0, 0, 0, 0.72);
        color: #202020;
        pointer-events: auto;
      }

      #pc-test-panel.hidden {
        display: none;
      }

      .pc-test-card {
        width: min(calc(100vw - 32px), 420px);
        border-radius: 20px;
        padding: 24px;
        background: rgba(255, 255, 255, 0.96);
        box-shadow: 0 18px 70px rgba(0, 0, 0, 0.35);
      }

      .pc-test-card h2 {
        margin: 0 0 10px;
        font-size: 24px;
        line-height: 1.15;
      }

      .pc-test-card p {
        margin: 0 0 18px;
        color: #555;
        font-size: 15px;
      }

      .pc-test-targets {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 8px;
      }

      .pc-test-targets button {
        min-height: 44px;
        border: 0;
        border-radius: 12px;
        background: #183a8f;
        color: #fff;
        font: 800 16px/1 Arial, Helvetica, sans-serif;
      }

      #christmas-flow-layer {
        position: fixed;
        inset: 0;
        z-index: 2147483000;
        pointer-events: auto;
        overflow: hidden;
      }

      #christmas-flow-layer.passthrough {
        pointer-events: none;
      }

      #target-scan-status {
        position: fixed;
        left: 50%;
        bottom: calc(58px + env(safe-area-inset-bottom, 0px));
        z-index: 2147483646;
        transform: translateX(-50%);
        width: min(76vw, 340px);
        padding: 0;
        background: transparent;
        color: #fff;
        font: 500 24px/1.15 "Segoe UI Variable Text", "Aptos", "Segoe UI", Arial, Helvetica, sans-serif;
        text-align: center;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
        pointer-events: none;
      }

      #target-scan-status.hidden {
        display: none;
      }

      #target-scan-status.scanning-loading::after {
        content: "";
        animation: scan-status-dots 1.2s steps(4, end) infinite;
      }

      #scan-guide {
        position: fixed;
        inset: 0;
        z-index: 2147483642;
        pointer-events: none;
      }

      #scan-guide.hidden {
        display: none;
      }

      .scan-corner {
        position: absolute;
        width: min(9vw, 38px);
        height: min(9vw, 38px);
        border-color: rgba(174, 211, 255, 0.96);
        color: rgba(174, 211, 255, 0.96);
        filter: drop-shadow(0 0 5px rgba(84, 148, 230, 0.26));
      }

      .scan-corner.tl {
        left: 7vw;
        top: 18vh;
        border-left: 4px solid rgba(174, 211, 255, 0.96);
        border-top: 4px solid rgba(174, 211, 255, 0.96);
        border-radius: 12px 0 0 0;
      }

      .scan-corner.tr {
        right: 7vw;
        top: 18vh;
        border-right: 4px solid rgba(174, 211, 255, 0.96);
        border-top: 4px solid rgba(174, 211, 255, 0.96);
        border-radius: 0 12px 0 0;
      }

      .scan-corner.bl {
        left: 7vw;
        bottom: 25vh;
        border-left: 4px solid rgba(174, 211, 255, 0.96);
        border-bottom: 4px solid rgba(174, 211, 255, 0.96);
        border-radius: 0 0 0 12px;
      }

      .scan-corner.br {
        right: 7vw;
        bottom: 25vh;
        border-right: 4px solid rgba(174, 211, 255, 0.96);
        border-bottom: 4px solid rgba(174, 211, 255, 0.96);
        border-radius: 0 0 12px 0;
      }

      .scan-line {
        position: absolute;
        left: 13vw;
        right: 13vw;
        top: 45vh;
        height: 3px;
        border-radius: 999px;
        background: linear-gradient(90deg, rgba(64, 173, 210, 0.7), rgba(26, 190, 140, 0.92), rgba(64, 173, 210, 0.7));
        box-shadow: 0 0 12px rgba(26, 190, 140, 0.28);
        transform-origin: center center;
        animation: scan-line-unity 4.5s linear infinite;
      }

      .scan-guide-text {
        position: absolute;
        left: 50%;
        top: 63vh;
        transform: translateX(-50%);
        width: min(80vw, 460px);
        color: #fff;
        font: 500 15px/1.25 "Segoe UI Variable Text", "Aptos", "Segoe UI", Arial, Helvetica, sans-serif;
        text-align: center;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
      }

      .scan-version {
        position: absolute;
        left: 50%;
        bottom: calc(30px + env(safe-area-inset-bottom, 0px));
        transform: translateX(-50%);
        color: rgba(255, 255, 255, 0.86);
        font: 700 11px/1 "Segoe UI Variable Text", "Aptos", "Segoe UI", Arial, Helvetica, sans-serif;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
      }

      @keyframes scan-line-unity {
        0% { opacity: 0.72; transform: translateY(-23vh) scaleX(0.88); }
        8.889% { opacity: 1; transform: translateY(-23vh) scaleX(1); }
        43.333% { opacity: 1; transform: translateY(22vh) scaleX(1); }
        52.963% { opacity: 0.72; transform: translateY(23vh) scaleX(0.88); }
        61.111% { opacity: 1; transform: translateY(23vh) scaleX(1); }
        93.333% { opacity: 1; transform: translateY(-23vh) scaleX(1); }
        100% { opacity: 0.72; transform: translateY(-23vh) scaleX(0.88); }
      }

      @keyframes scan-status-dots {
        0% { content: ""; }
        25% { content: "."; }
        50% { content: ".."; }
        75%, 100% { content: "..."; }
      }

      #name-badge {
        position: fixed;
        top: calc(18px + env(safe-area-inset-top, 0px));
        right: 18px;
        z-index: 2147483646;
        padding: 12px 18px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.45);
        background: rgba(0, 0, 0, 0.62);
        color: #fff;
        font: 800 16px/1 "Segoe UI Variable Text", "Aptos", "Segoe UI", Arial, Helvetica, sans-serif;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
        pointer-events: auto;
      }

      #name-gate {
        position: fixed;
        inset: 0;
        z-index: 2147483645;
        display: grid;
        place-items: center;
        padding: 24px;
        background: rgba(0, 0, 0, 0.72);
        color: #fff;
        pointer-events: auto;
      }

      #name-gate.hidden {
        display: none;
      }

      .name-card {
        box-sizing: border-box;
        width: min(calc(100vw - 32px), 420px);
        max-height: calc(100dvh - 32px);
        overflow: auto;
        border-radius: 20px;
        padding: 24px;
        background: rgba(255, 255, 255, 0.96);
        color: #202020;
        box-shadow: 0 18px 70px rgba(0, 0, 0, 0.35);
      }

      .name-card h1 {
        margin: 0 0 10px;
        font-size: 26px;
        line-height: 1.15;
      }

      .name-card p {
        margin: 0 0 18px;
        color: #555;
        font-size: 15px;
      }

      .name-card input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #c8c8c8;
        border-radius: 14px;
        padding: 14px 16px;
        font-size: 20px;
        outline: none;
      }

      .name-card button {
        width: 100%;
        margin-top: 14px;
        border: 0;
        border-radius: 14px;
        padding: 14px 16px;
        background: #183a8f;
        color: #fff;
        font: 800 18px/1 "Segoe UI Variable Text", "Aptos", "Segoe UI", Arial, Helvetica, sans-serif;
      }

      .name-error {
        min-height: 18px;
        margin-top: 8px;
        color: #b3261e;
        font-size: 13px;
      }

      #intro-lottie-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483643;
        display: grid;
        place-items: center;
        pointer-events: none;
      }

      #intro-lottie-overlay.hidden {
        display: none;
      }

      #intro-lottie {
        width: min(108vw, 540px);
        height: min(108vw, 540px);
        filter: drop-shadow(0 16px 26px rgba(82, 22, 18, 0.22));
      }

      #intro-lottie svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      #postcard-button {
        position: fixed;
        left: 50%;
        bottom: calc(298px + env(safe-area-inset-bottom, 0px));
        z-index: 2147483644;
        transform: translate3d(-50%, 0, 0);
        width: min(84vw, 430px);
        min-height: 120px;
        border: 0;
        border-radius: 22px;
        background: transparent;
        color: #8d1f20;
        font: 800 20px/1.1 "Segoe UI Variable Display", "Aptos Display", "Segoe UI", Arial, Helvetica, sans-serif;
        box-shadow: none;
        pointer-events: auto;
        overflow: visible;
        display: grid;
        place-items: center;
        padding: 0;
      }

      #postcard-button.hidden { display: none; }
      #postcard-button:not(.hidden) {
        animation: postcard-fly-in 0.9s cubic-bezier(0.18, 0.92, 0.26, 1.08) both,
          postcard-float 3.6s ease-in-out 0.9s infinite;
      }
      #postcard-button.opening {
        pointer-events: none;
        animation: postcard-open 0.58s cubic-bezier(0.2, 0.85, 0.2, 1) forwards;
      }
      #postcard-button.lottie-done {
        animation: none;
        transform: translate3d(-50%, 0, 0);
      }

      #postcard-button.lottie-intro-fade .postcard-lottie,
      #postcard-button.lottie-intro-fade .postcard-copy {
        animation: postcard-opacity-in 1s ease-out both;
      }

      .postcard-lottie {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 336%;
        height: 534%;
        z-index: 0;
        transform: translate(-50%, -50%);
        filter: drop-shadow(0 12px 18px rgba(94, 31, 17, 0.22));
        opacity: 0;
        transition: opacity 0.08s linear;
        pointer-events: none;
      }

      #postcard-button.lottie-visible .postcard-lottie {
        opacity: 1;
      }

      .postcard-lottie svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      .postcard-hitbox {
        position: absolute;
        left: 50%;
        top: 80%;
        width: 336%;
        height: 534%;
        z-index: 3;
        transform: translate(-50%, -50%);
        pointer-events: auto;
        background: transparent;
      }

      .postcard-copy {
        position: absolute;
        left: 50%;
        top: 50%;
        z-index: 1;
        width: 336%;
        height: 534%;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        min-width: 0;
        padding: 0;
        opacity: 0;
        transform: translate(-50%, -50%);
        transition: opacity 0.28s ease;
        pointer-events: none;
      }

      #postcard-button.lottie-done .postcard-copy {
        opacity: 1;
        transform: translate(-50%, -50%);
      }

      #postcard-button.lottie-playing .postcard-copy {
        opacity: 0;
      }

      .postcard-eyebrow {
        display: block;
        margin-bottom: 6px;
        color: #7d5032;
        font-size: 11px;
        line-height: 1;
        letter-spacing: 1.8px;
        text-transform: uppercase;
      }

      .postcard-title {
        position: absolute;
        left: 50%;
        top: 66%;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.42em;
        width: min(72vw, 360px);
        color: #fff;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(25px, 6.2vw, 34px);
        font-weight: 700;
        line-height: 1.16;
        letter-spacing: 0;
        -webkit-text-stroke: 1.7px rgba(0, 0, 0, 0.96);
        paint-order: stroke fill;
        text-shadow:
          0 2px 0 rgba(0, 0, 0, 0.72),
          0 0 10px rgba(0, 0, 0, 0.45);
      }

      @keyframes postcard-fly-in {
        from { transform: translate3d(34vw, -34vh, 0) scale(0.62) rotate(12deg); opacity: 0; }
        62% { opacity: 1; }
        to { transform: translate3d(-50%, 0, 0) scale(1) rotate(0deg); opacity: 1; }
      }

      @keyframes postcard-float {
        0%, 100% { transform: translate3d(-50%, 0, 0); }
        50% { transform: translate3d(-50%, -8px, 0); }
      }

      @keyframes postcard-open {
        to { transform: translate3d(-50%, -34px, 0) scale(1.08) rotateX(34deg); opacity: 0; }
      }

      @keyframes postcard-opacity-in {
        from { opacity: 0.3; }
        to { opacity: 1; }
      }

      #christmas-video-overlay, #complete-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483645;
        display: grid;
        place-items: center;
        background: #000;
        pointer-events: auto;
      }

      #christmas-video-overlay.hidden, #complete-overlay.hidden {
        display: none;
      }

      #christmas-video {
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #000;
      }

      #complete-overlay {
        background:
          radial-gradient(circle at 26% 18%, rgba(255, 255, 255, 0.92), transparent 30%),
          radial-gradient(circle at 80% 12%, rgba(255, 248, 220, 0.78), transparent 32%),
          linear-gradient(180deg, #f8fffb 0%, #fff8e8 52%, #fff0ed 100%);
      }

      .complete-card {
        position: relative;
        width: min(88vw, 480px);
        padding: 18px 18px 24px;
        border-radius: 24px;
        background: transparent;
        color: #8b1f1f;
        text-align: center;
        display: grid;
        justify-items: center;
        gap: 22px;
      }

      .complete-header-lottie {
        position: relative;
        z-index: 1;
        width: min(86vw, 460px);
        height: min(42vw, 230px);
        transform: scale(2);
        transform-origin: center center;
        pointer-events: none;
      }

      .complete-header-lottie svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      .complete-card button {
        position: relative;
        z-index: 1;
        border: 0;
        border-radius: 999px;
        padding: 15px 30px;
        background: linear-gradient(135deg, #183a8f, #2d79c7);
        color: #fff;
        font: 900 18px/1 "Segoe UI Variable Text", "Aptos", "Segoe UI", Arial, Helvetica, sans-serif;
        box-shadow: 0 12px 28px rgba(24, 58, 143, 0.28);
      }

    `;
    document.head.appendChild(style);
  }

  function ensureUi() {
    if (!loadingOverlay) {
      loadingOverlay = document.createElement('div');
      loadingOverlay.id = 'lag-loading-overlay';
      loadingOverlay.innerHTML = `
        <div class="lag-loading-card">
          <img src="./assets/lag-logo.jpg" alt="LAG" />
          <div id="lag-loading-text" class="lag-loading-text">Requesting camera access...</div>
          <button id="camera-permission-retry" type="button">Allow camera</button>
          <button id="pc-test-mode-button" type="button">PC test mode</button>
        </div>
      `;
      document.body.appendChild(loadingOverlay);
      loadingText = document.getElementById('lag-loading-text');
      cameraRetryButton = document.getElementById('camera-permission-retry');
      pcTestButton = document.getElementById('pc-test-mode-button');
      cameraRetryButton.addEventListener('click', () => requestCameraPermissionGate(true));
      pcTestButton.addEventListener('click', enterPcTestMode);
    }

    if (!flowLayer) {
      flowLayer = document.createElement('div');
      flowLayer.id = 'christmas-flow-layer';
      flowLayer.innerHTML = `
        <button id="name-badge" type="button"></button>
        <div id="name-gate" class="hidden">
          <div class="name-card">
            <h1>Enter child name</h1>
            <p>Santa will say this name before the greeting.</p>
            <input id="child-name-input" type="text" maxlength="24" autocomplete="given-name" placeholder="Child name" />
            <div id="name-error" class="name-error"></div>
            <button id="save-name-button" type="button">Start scanning</button>
          </div>
        </div>
        <div id="pc-test-panel" class="hidden">
          <div class="pc-test-card">
            <h2>PC test mode</h2>
            <p>Choose a test target to run the Christmas flow without a camera.</p>
            <div class="pc-test-targets">
              <button type="button" data-pc-test-target="1">1</button>
              <button type="button" data-pc-test-target="2">2</button>
              <button type="button" data-pc-test-target="3">3</button>
              <button type="button" data-pc-test-target="4">4</button>
              <button type="button" data-pc-test-target="5">5</button>
            </div>
          </div>
        </div>
        <button id="postcard-button" class="hidden" type="button" aria-label="Open Santa's postcard">
          <span id="postcard-lottie" class="postcard-lottie" aria-hidden="true"></span>
          <span class="postcard-hitbox" aria-hidden="true"></span>
          <span class="postcard-copy">
            <span class="postcard-title">
              <span>Open your</span>
              <span>Christmas postcard</span>
            </span>
          </span>
        </button>
        <div id="intro-lottie-overlay" class="hidden" aria-hidden="true">
          <div id="intro-lottie"></div>
        </div>
        <div id="christmas-video-overlay" class="hidden">
          <video id="christmas-video" src="./assets/Christmas.mp4" playsinline webkit-playsinline preload="auto"></video>
        </div>
        <div id="complete-overlay" class="hidden">
          <div class="complete-card">
            <div id="complete-header-lottie" class="complete-header-lottie" aria-hidden="true"></div>
            <button id="restart-button" type="button">Scan another postcard</button>
          </div>
        </div>
      `;
      document.body.appendChild(flowLayer);

      nameGate = document.getElementById('name-gate');
      nameInput = document.getElementById('child-name-input');
      nameError = document.getElementById('name-error');
      nameBadge = document.getElementById('name-badge');
      pcTestPanel = document.getElementById('pc-test-panel');
      postcardButton = document.getElementById('postcard-button');
      postcardLottieContainer = document.getElementById('postcard-lottie');
      introLottieOverlay = document.getElementById('intro-lottie-overlay');
      introLottieContainer = document.getElementById('intro-lottie');
      videoOverlay = document.getElementById('christmas-video-overlay');
      christmasVideo = document.getElementById('christmas-video');
      completeOverlay = document.getElementById('complete-overlay');
      completeLottieContainer = document.getElementById('complete-header-lottie');

      document.getElementById('save-name-button').addEventListener('click', saveName);
      nameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') saveName();
      });
      nameBadge.addEventListener('click', () => showNameGate(true));
      postcardButton.addEventListener('click', openPostcard);
      pcTestPanel.addEventListener('click', (event) => {
        const button = event.target.closest('[data-pc-test-target]');
        if (!button) return;
        startPcTestTarget(button.dataset.pcTestTarget);
      });
      christmasVideo.addEventListener('ended', showComplete);
      document.getElementById('restart-button').addEventListener('click', restartExperience);
      preloadPostcardLottie();
      ensureCompleteHeaderLottie().catch((error) => {
        console.warn('[Christmas AR] complete lottie preload failed:', error);
      });
    }

    if (!scanStatus) {
      scanStatus = document.createElement('div');
      scanStatus.id = 'target-scan-status';
      scanStatus.textContent = 'Scanning';
      scanStatus.classList.add('scanning-loading');
      document.body.appendChild(scanStatus);
    }

    if (!scanGuide) {
      scanGuide = document.createElement('div');
      scanGuide.id = 'scan-guide';
      scanGuide.innerHTML =         '<div class="scan-corner tl"></div>' +
        '<div class="scan-corner tr"></div>' +
        '<div class="scan-corner bl"></div>' +
        '<div class="scan-corner br"></div>' +
        '<div class="scan-line"></div>' +
        '<div class="scan-guide-text">Place the object inside the frame.</div>' +
        '<div class="scan-version">1.0.26</div>';
      document.body.appendChild(scanGuide);
    }

    refreshNameBadge();
    if (!state.childName && cameraPermissionGranted && cameraStarted) showNameGate(false);
  }

  function refreshNameBadge() {
    if (nameBadge) nameBadge.textContent = state.childName ? `Name: ${state.childName}` : 'Set name';
  }

  function showNameGate(focus) {
    if (!nameInput || !nameGate) return;
    hideLoadingOverlay();
    hideScanStatus();
    nameInput.value = state.childName;
    nameGate.classList.remove('hidden');
    if (focus) setTimeout(() => nameInput.focus(), 80);
  }

  function saveName() {
    const clean = normalizeName(nameInput.value);
    if (!clean) {
      nameError.textContent = 'Please enter a child name.';
      return;
    }
    state.childName = clean;
    localStorage.setItem(NAME_KEY, clean);
    nameError.textContent = '';
    nameGate.classList.add('hidden');
    refreshNameBadge();
    unlockSpeech();
    if (state.pcTestActive) {
      hideLoadingOverlay();
      hideScanStatus();
      showPcTestPanel();
      return;
    }
    waitForCameraReady();
    if (cameraPermissionGranted) bootAr();
    else requestCameraPermissionGate(true);
    if (cameraStarted) {
      waitingForCameraReady = false;
      hideLoadingOverlay();
      showScanStatus();
      setScanStatus('Scanning...');
    }
  }

  function normalizeName(raw) {
    return String(raw || '').trim().replace(/\s+/g, ' ').slice(0, 24);
  }

  function hideLoadingOverlay() {
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
  }

  function showLoadingOverlay() {
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
  }

  function setLoadingMessage(text) {
    ensureUi();
    if (loadingText) loadingText.textContent = text;
  }

  function setCameraDebugStatus(status) {
    cameraDebugStatus = status || cameraDebugStatus;
    if (cameraDebugStatus) setLoadingMessage(`AR camera status: ${cameraDebugStatus}`);
  }

  function setCameraRetryVisible(visible) {
    ensureUi();
    if (cameraRetryButton) cameraRetryButton.classList.toggle('visible', Boolean(visible));
  }

  function setPcTestButtonVisible(visible) {
    ensureUi();
    if (pcTestButton) pcTestButton.classList.toggle('visible', PC_TEST_MODE && Boolean(visible));
  }

  function showPcTestPanel() {
    if (!PC_TEST_MODE || !pcTestPanel) return;
    hideLoadingOverlay();
    hideScanStatus();
    if (nameGate) nameGate.classList.add('hidden');
    pcTestPanel.classList.remove('hidden');
  }

  function hidePcTestPanel() {
    if (pcTestPanel) pcTestPanel.classList.add('hidden');
  }

  function enterPcTestMode() {
    if (!PC_TEST_MODE) return;
    state.pcTestActive = true;
    cameraPermissionGranted = false;
    cameraPermissionInFlight = false;
    waitingForCameraReady = false;
    setPcTestButtonVisible(false);
    setCameraRetryVisible(false);
    if (!state.childName) showNameGate(true);
    else showPcTestPanel();
  }

  function startPcTestTarget(targetName) {
    if (!PC_TEST_MODE || !state.pcTestActive) return;
    if (!targetNames.includes(String(targetName))) return;
    hidePcTestPanel();
    startChristmasFlow(targetName);
  }

  function cameraErrorText(error) {
    if (!error) return 'Camera access is required.';
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') return 'Camera permission is required. Tap Allow camera and choose Allow.';
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') return 'No camera was found on this device.';
    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') return 'The camera is busy. Close other camera apps and try again.';
    return 'Camera access failed. Tap Allow camera to try again.';
  }

  async function requestIosMotionPermission() {
    const requesters = [window.DeviceMotionEvent, window.DeviceOrientationEvent]
      .filter((api) => api && typeof api.requestPermission === 'function');
    for (const api of requesters) {
      const result = await api.requestPermission();
      if (result !== 'granted') throw new Error('motion permission denied');
    }
  }

  async function requestCameraPermissionGate(fromUserGesture) {
    ensureUi();
    if (!fromUserGesture && !cameraPermissionGranted) {
      showLoadingOverlay();
      hideScanStatus();
      setLoadingMessage('Tap to start AR camera');
      if (cameraRetryButton) cameraRetryButton.textContent = 'Tap to start AR';
      setCameraRetryVisible(true);
      setPcTestButtonVisible(true);
      return;
    }
    if (cameraPermissionGranted) {
      waitForCameraReady();
      bootAr();
      return;
    }
    if (cameraPermissionInFlight) return;
    cameraPermissionInFlight = true;
    showLoadingOverlay();
    hideScanStatus();
    setCameraRetryVisible(false);
    setPcTestButtonVisible(false);
    if (cameraRetryButton) cameraRetryButton.textContent = 'Allow camera';
    setLoadingMessage('Requesting camera access...');
    try {
      await requestIosMotionPermission();
      cameraPermissionGranted = true;
      setCameraRetryVisible(false);
      setPcTestButtonVisible(false);
      setLoadingMessage('Starting AR camera... v1.0.26');
      waitForCameraReady();
      bootAr();
    } catch (error) {
      console.warn('[Christmas AR] camera permission gate failed:', error);
      cameraPermissionGranted = false;
      setLoadingMessage(cameraErrorText(error));
      if (cameraRetryButton) cameraRetryButton.textContent = 'Try again';
      setCameraRetryVisible(true);
      setPcTestButtonVisible(true);
    } finally {
      cameraPermissionInFlight = false;
    }
  }

  function waitForCameraReady() {
    waitingForCameraReady = true;
    showLoadingOverlay();
    const token = ++cameraWaitToken;
    setTimeout(() => {
      if (!waitingForCameraReady || token !== cameraWaitToken) return;
      if (!cameraStarted) {
        waitingForCameraReady = false;
        setLoadingMessage('AR camera did not start. Open in Safari and tap Try again.');
        if (cameraRetryButton) cameraRetryButton.textContent = 'Try again';
        setCameraRetryVisible(true);
        setPcTestButtonVisible(true);
        return;
      }
      waitingForCameraReady = false;
      hideLoadingOverlay();
      showScanStatus();
      setScanStatus('Scanning...');
    }, 9000);
  }

  function setScanStatus(text) {
    ensureUi();
    const value = String(text || '');
    const isScanning = /^Scanning/i.test(value);
    scanStatus.classList.toggle('scanning-loading', isScanning);
    scanStatus.textContent = isScanning ? 'Scanning' : value;
  }

  function hideScanStatus() {
    if (scanStatus) scanStatus.classList.add('hidden');
    if (scanGuide) scanGuide.classList.add('hidden');
  }

  function showScanStatus() {
    if (scanStatus) scanStatus.classList.remove('hidden');
    if (scanGuide) scanGuide.classList.remove('hidden');
  }

  function getViewportSize() {
    const viewport = window.visualViewport;
    return {
      width: Math.max(1, Math.round(viewport ? viewport.width : window.innerWidth)),
      height: Math.max(1, Math.round(viewport ? viewport.height : window.innerHeight)),
    };
  }

  function syncArCanvasSize() {
    if (!arCanvas) return;
    const size = getViewportSize();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(size.width * dpr);
    const pixelHeight = Math.round(size.height * dpr);
    if (arCanvas.width !== pixelWidth) arCanvas.width = pixelWidth;
    if (arCanvas.height !== pixelHeight) arCanvas.height = pixelHeight;
    arCanvas.style.width = `${size.width}px`;
    arCanvas.style.height = `${size.height}px`;
  }

  function installArCanvasResizeHandler() {
    if (arCanvasResizeInstalled) return;
    arCanvasResizeInstalled = true;
    window.addEventListener('resize', syncArCanvasSize);
    window.addEventListener('orientationchange', () => setTimeout(syncArCanvasSize, 250));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', syncArCanvasSize);
  }

  function ensureArCanvas() {
    if (!arCanvas) {
      arCanvas = document.createElement('canvas');
      arCanvas.id = 'xr-camera-canvas';
      document.body.insertBefore(arCanvas, document.body.firstChild);
      installArCanvasResizeHandler();
    }
    syncArCanvasSize();
    return arCanvas;
  }

  function startApp() {
    if (appStarted || xrPipelineStarted) return;
    appStarted = true;
    xrPipelineStarted = true;
    try {
      const canvas = ensureArCanvas();
      syncArCanvasSize();
      if (window.XR8.GlTextureRenderer && window.XR8.GlTextureRenderer.pipelineModule) {
        window.XR8.addCameraPipelineModule(window.XR8.GlTextureRenderer.pipelineModule());
      }
      window.XR8.addCameraPipelineModule(window.XR8.XrController.pipelineModule());
      const runConfig = { canvas };
      if (window.XR8.XrConfig && window.XR8.XrConfig.device) {
        runConfig.allowedDevices = window.XR8.XrConfig.device().ANY;
      }
      window.XR8.run(runConfig);
    } catch (error) {
      console.error('[Christmas AR] direct XR startup failed:', error);
      appStarted = false;
      xrPipelineStarted = false;
      setLoadingMessage(`AR startup failed: ${errorText(error)}`);
      if (cameraRetryButton) cameraRetryButton.textContent = 'Try again';
      setCameraRetryVisible(true);
      setPcTestButtonVisible(true);
      hideScanStatus();
    }
  }

  function errorText(error) {
    if (!error) return 'Unknown error';
    if (error.stack) return error.stack.split('\n').slice(0, 2).join(' ');
    if (error.message) return error.message;
    return String(error);
  }

  async function loadImageTargets() {
    const targets = await Promise.all(
      targetNames.map(async (name) => {
        const response = await fetch(`./image-targets/${name}.json`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Failed to load image target ${name}: ${response.status}`);
        return response.json();
      }),
    );
    return targets;
  }

  function waitForXrController() {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const tick = () => {
        if (window.XR8 && window.XR8.XrController && window.XR8.XrController.configure) {
          resolve();
          return;
        }
        if (Date.now() - startedAt > 12000) {
          reject(new Error('XR8.XrController unavailable after slam preload'));
          return;
        }
        setTimeout(tick, 100);
      };
      tick();
    });
  }
  async function configureImageTargets() {
    bootRequested = true;
    try {
      installStyles();
      ensureUi();
      const imageTargetData = await loadImageTargets();
      await waitForXrController();

      window.__christmasImageTargetData = imageTargetData;
      window.XR8.XrController.configure({
        disableWorldTracking: true,
        imageTargetData,
        imageTargets: targetNames,
      });

      window.XR8.addCameraPipelineModule({
        name: 'christmas-image-target-flow',
        onCameraStatusChange: ({ status }) => {
          console.log('[Christmas AR] camera status:', status);
          setCameraDebugStatus(status);
          if (status === 'hasVideo') {
            cameraStarted = true;
            waitingForCameraReady = false;
            hideLoadingOverlay();
          } else if (status === 'failed') {
            waitingForCameraReady = false;
            setLoadingMessage('AR camera failed. Check Safari camera permission and tap Try again.');
            if (cameraRetryButton) cameraRetryButton.textContent = 'Try again';
            setCameraRetryVisible(true);
            setPcTestButtonVisible(true);
          }
        },
        onStart: () => {
          cameraStarted = true;
          waitingForCameraReady = false;
          hideLoadingOverlay();
          if (state.childName) {
            showScanStatus();
            setScanStatus('Scanning...');
          } else {
            hideScanStatus();
            showNameGate(false);
          }
        },
        listeners: [
          {
            event: 'reality.imagefound',
            process: ({ detail }) => handleTargetFound(detail && detail.name),
          },
          {
            event: 'reality.imageupdated',
            process: ({ detail }) => {
              if (!state.experienceStarted) setScanStatus('Scanning...');
            },
          },
          {
            event: 'reality.imagelost',
            process: () => {
              if (!state.experienceStarted) setScanStatus(state.childName ? 'Scanning...' : 'Set name first');
            },
          },
        ],
      });

      startApp();
    } catch (error) {
      console.error('[Christmas AR] image target configuration failed:', error);
      bootRequested = false;
      setLoadingMessage(`AR setup failed: ${errorText(error)}`);
      setCameraRetryVisible(true);
      setPcTestButtonVisible(true);
      hideScanStatus();
    }
  }

  function bootAr() {
    if (bootRequested || appStarted) return;
    bootRequested = true;
    if (window.XR8) {
      configureImageTargets();
      return;
    }
    setLoadingMessage('Loading AR engine...');
    window.addEventListener('xrloaded', configureImageTargets, { once: true });
    clearTimeout(xrLoadTimer);
    xrLoadTimer = setTimeout(() => {
      if (window.XR8 || appStarted || cameraStarted) return;
      bootRequested = false;
      waitingForCameraReady = false;
      setLoadingMessage('AR engine failed to load. Check network/VPN, then tap Try again.');
      if (cameraRetryButton) cameraRetryButton.textContent = 'Try again';
      setCameraRetryVisible(true);
      setPcTestButtonVisible(true);
    }, 12000);
  }

  function handleTargetFound(targetName) {
    if (!targetNames.includes(String(targetName))) return;
    if (!state.childName) {
      setScanStatus('Set name first');
      showNameGate(true);
      return;
    }
    if (state.experienceStarted) return;
    startChristmasFlow(targetName);
  }

  function startChristmasFlow(targetName) {
    console.log('[Christmas AR] start flow:', targetName);
    const flowToken = ++state.flowToken;
    state.experienceStarted = true;
    state.postcardReady = false;
    state.videoPlaying = false;
    hideScanStatus();
    hidePcTestPanel();
    preloadPostcardLottie();
    postcardButton.classList.add('hidden');
    postcardButton.classList.remove('opening', 'lottie-done', 'lottie-visible', 'lottie-playing', 'lottie-intro-fade');
    resetPostcardLottie();
    resetIntroLottie();
    videoOverlay.classList.add('hidden');
    completeOverlay.classList.add('hidden');
    speakIntro();

    playIntroLottieOnce(() => {
      if (!state.experienceStarted || state.flowToken !== flowToken) return;
      finishSpeechStep({ cancelSpeech: false });
    });
  }

  function startSpeechWatchdog(timeoutMs) {
    stopSpeechWatchdog();
    state.speechDeadlineAt = performance.now() + timeoutMs;
    state.speechWatchdog = window.setInterval(() => {
      if (!state.experienceStarted || state.postcardReady) {
        stopSpeechWatchdog();
        return;
      }
      if (performance.now() >= state.speechDeadlineAt) finishSpeechStep();
    }, 250);
  }

  function stopSpeechWatchdog() {
    if (state.speechWatchdog) {
      clearInterval(state.speechWatchdog);
      state.speechWatchdog = null;
    }
  }

  function finishSpeechStep({ cancelSpeech = true } = {}) {
    if (!state.experienceStarted || state.postcardReady) return;
    stopSpeechWatchdog();
    if (cancelSpeech) {
      try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch {}
    }
    state.postcardReady = true;
    postcardButton.classList.remove('hidden');
    showPostcardLottieFirstFrame();
  }

  function loadLottieRuntime() {
    if (window.lottie) return Promise.resolve(window.lottie);
    if (lottieRuntimePromise) return lottieRuntimePromise;
    lottieRuntimePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = './assets/lottie.min.js';
      script.async = true;
      script.onload = () => {
        if (window.lottie) resolve(window.lottie);
        else reject(new Error('lottie runtime missing'));
      };
      script.onerror = () => reject(new Error('lottie runtime failed'));
      document.head.appendChild(script);
    });
    return lottieRuntimePromise;
  }

  function preloadPostcardLottie() {
    ensurePostcardLottie().then((animation) => {
      animation.loop = false;
      animation.setDirection(1);
      animation.goToAndStop(0, true);
    }).catch((error) => {
      console.warn('[Christmas AR] postcard lottie preload failed:', error);
    });
  }

  function ensurePostcardLottie() {
    if (postcardLottieAnimation) return Promise.resolve(postcardLottieAnimation);
    if (!postcardLottieContainer) return Promise.reject(new Error('postcard lottie container missing'));
    return loadLottieRuntime().then((lottie) => new Promise((resolve, reject) => {
      postcardLottieAnimation = lottie.loadAnimation({
        container: postcardLottieContainer,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        path: './assets/postcard-envelope.json',
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid meet',
        },
      });
      const done = () => resolve(postcardLottieAnimation);
      const failed = () => reject(new Error('postcard lottie data failed'));
      postcardLottieAnimation.addEventListener('DOMLoaded', done);
      postcardLottieAnimation.addEventListener('data_failed', failed);
      setTimeout(done, 1800);
    }));
  }

  function showPostcardLottieFirstFrame() {
    postcardLottiePlayed = false;
    ensurePostcardLottie().then((animation) => {
      animation.loop = false;
      animation.setDirection(1);
      animation.goToAndStop(0, true);
      if (postcardButton) postcardButton.classList.remove('lottie-playing');
      if (postcardButton) postcardButton.classList.add('lottie-visible', 'lottie-done', 'lottie-intro-fade');
      setTimeout(() => {
        if (postcardButton) postcardButton.classList.remove('lottie-intro-fade');
      }, 1020);
    }).catch((error) => {
      console.warn('[Christmas AR] postcard lottie failed:', error);
      if (postcardButton) postcardButton.classList.add('lottie-visible', 'lottie-done');
    });
  }

  function playPostcardLottieForward() {
    if (postcardLottiePlayed) return Promise.resolve();
    postcardLottiePlayed = true;
    return ensurePostcardLottie().then((animation) => new Promise((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        animation.removeEventListener('complete', finish);
        animation.pause();
        resolve();
      };
      animation.loop = false;
      animation.setDirection(1);
      animation.goToAndStop(0, true);
      if (postcardButton) postcardButton.classList.remove('lottie-intro-fade');
      if (postcardButton) postcardButton.classList.add('lottie-visible', 'lottie-done', 'lottie-playing');
      animation.addEventListener('complete', finish);
      requestAnimationFrame(() => animation.play());
      const frameRate = Number(animation.frameRate || 0);
      const totalFrames = Number(animation.totalFrames || 0);
      const totalMs = frameRate > 0 && totalFrames > 0
        ? Math.round((totalFrames / frameRate) * 1000)
        : 1800;
      setTimeout(finish, totalMs + 180);
    })).catch((error) => {
      console.warn('[Christmas AR] postcard lottie play failed:', error);
    });
  }

  function resetPostcardLottie() {
    postcardLottiePlayed = false;
    if (postcardButton) postcardButton.classList.remove('lottie-done', 'lottie-visible', 'lottie-playing', 'lottie-intro-fade');
    if (!postcardLottieAnimation) return;
    postcardLottieAnimation.setDirection(1);
    postcardLottieAnimation.goToAndStop(0, true);
  }

  function ensureIntroLottie() {
    if (introLottieAnimation) return Promise.resolve(introLottieAnimation);
    if (!introLottieContainer) return Promise.reject(new Error('intro lottie container missing'));
    return loadLottieRuntime().then((lottie) => new Promise((resolve, reject) => {
      introLottieAnimation = lottie.loadAnimation({
        container: introLottieContainer,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        path: './assets/gingerbread-socks-intro.json',
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid meet',
        },
      });
      const done = () => resolve(introLottieAnimation);
      const failed = () => reject(new Error('intro lottie data failed'));
      introLottieAnimation.addEventListener('DOMLoaded', done);
      introLottieAnimation.addEventListener('data_failed', failed);
      setTimeout(done, 1800);
    }));
  }

  function playIntroLottieOnce(onRevealPostcard) {
    const revealPostcard = (() => {
      let revealed = false;
      return () => {
        if (revealed) return;
        revealed = true;
        if (typeof onRevealPostcard === 'function') onRevealPostcard();
      };
    })();

    if (introLottiePlayed) {
      setTimeout(revealPostcard, 0);
      return Promise.resolve();
    }
    introLottiePlayed = true;
    if (introLottieOverlay) introLottieOverlay.classList.remove('hidden');
    return ensureIntroLottie().then((animation) => new Promise((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        revealPostcard();
        animation.removeEventListener('complete', finish);
        animation.pause();
        if (introLottieOverlay) introLottieOverlay.classList.add('hidden');
        resolve();
      };
      animation.loop = false;
      animation.setDirection(1);
      animation.goToAndStop(0, true);
      animation.addEventListener('complete', finish);
      requestAnimationFrame(() => animation.play());
      const frameRate = Number(animation.frameRate || 0);
      const totalFrames = Number(animation.totalFrames || 0);
      const totalMs = frameRate > 0 && totalFrames > 0
        ? Math.round((totalFrames / frameRate) * 1000)
        : 5200;
      setTimeout(finish, totalMs + 120);
    })).catch((error) => {
      console.warn('[Christmas AR] intro lottie failed:', error);
      if (introLottieOverlay) introLottieOverlay.classList.add('hidden');
      revealPostcard();
    });
  }

  function resetIntroLottie() {
    introLottiePlayed = false;
    if (introLottieOverlay) introLottieOverlay.classList.add('hidden');
    if (!introLottieAnimation) return;
    introLottieAnimation.stop();
    introLottieAnimation.goToAndStop(0, true);
  }

  function ensureCompleteHeaderLottie() {
    if (!completeLottieContainer) return Promise.resolve(null);
    if (completeLottieAnimation) return Promise.resolve(completeLottieAnimation);
    return loadLottieRuntime().then((lottie) => new Promise((resolve, reject) => {
      completeLottieAnimation = lottie.loadAnimation({
        container: completeLottieContainer,
        renderer: 'svg',
        loop: true,
        autoplay: false,
        path: './assets/merry-christmas-header.json?v=completion-header-lottie-20260720',
      });
      let settled = false;
      let readyTimer;
      const ready = () => {
        if (settled) return;
        settled = true;
        clearTimeout(readyTimer);
        completeLottieAnimation.removeEventListener('DOMLoaded', ready);
        completeLottieAnimation.removeEventListener('data_failed', failed);
        completeLottieAnimation.goToAndStop(0, true);
        resolve(completeLottieAnimation);
      };
      const failed = () => {
        if (settled) return;
        settled = true;
        clearTimeout(readyTimer);
        completeLottieAnimation.removeEventListener('DOMLoaded', ready);
        completeLottieAnimation.removeEventListener('data_failed', failed);
        reject(new Error('complete lottie data failed'));
      };
      completeLottieAnimation.addEventListener('DOMLoaded', ready);
      completeLottieAnimation.addEventListener('data_failed', failed);
      readyTimer = setTimeout(ready, 1800);
    }));
  }

  function playCompleteHeaderLottie() {
    ensureCompleteHeaderLottie().then((animation) => {
      if (!animation) return;
      animation.loop = true;
      animation.goToAndPlay(0, true);
    }).catch((error) => {
      console.warn('[Christmas AR] complete lottie failed:', error);
    });
  }

  function stopCompleteHeaderLottie() {
    if (!completeLottieAnimation) return;
    completeLottieAnimation.stop();
    completeLottieAnimation.goToAndStop(0, true);
  }

  function unlockSpeech() {
    if (!('speechSynthesis' in window)) return;
    try {
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0;
      speechSynthesis.speak(utterance);
      speechSynthesis.cancel();
    } catch {}
  }

  function speakIntro() {
    return new Promise((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        resolve();
      };
      const fallbackTimer = setTimeout(finish, 7600);
      const done = () => {
        clearTimeout(fallbackTimer);
        finish();
      };

      if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
        setTimeout(done, 3800);
        return;
      }

      try { speechSynthesis.cancel(); } catch {}
      const utterance = new SpeechSynthesisUtterance(`Hey! ${nameForSpeech(state.childName)}. Merry Christmas! Open Santa's postcard!`);
      utterance.lang = 'en-US';
      utterance.rate = 0.82;
      utterance.pitch = 0.84;
      utterance.volume = 1;
      const voices = speechSynthesis.getVoices ? speechSynthesis.getVoices() : [];
      const voice = voices.find((item) => item.lang && item.lang.toLowerCase().startsWith('en')) || voices[0];
      if (voice) utterance.voice = voice;
      utterance.onend = done;
      utterance.onerror = done;
      setTimeout(() => {
        try { speechSynthesis.speak(utterance); } catch { done(); }
      }, 500);
    });
  }

  function nameForSpeech(name) {
    const raw = normalizeName(name);
    const lower = raw.toLowerCase();
    const special = {
      gaga: 'Gah-gah',
      saya: 'Sah-yah',
    };
    if (special[lower]) return special[lower];
    if (/^[a-z]{2,}$/i.test(raw)) return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    return raw;
  }

  async function openPostcard() {
    if (!state.postcardReady || state.videoPlaying) return;
    state.videoPlaying = true;
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch {}
    postcardButton.classList.remove('opening');
    await playPostcardLottieForward();
    postcardButton.classList.add('hidden');
    videoOverlay.classList.remove('hidden');
    christmasVideo.loop = false;
    christmasVideo.currentTime = 0;
    try {
      await christmasVideo.play();
    } catch (error) {
      console.warn('[Christmas AR] video play blocked:', error);
    }
  }

  function showComplete() {
    videoOverlay.classList.add('hidden');
    completeOverlay.classList.remove('hidden');
    playCompleteHeaderLottie();
  }

  function restartExperience() {
    state.flowToken += 1;
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch {}
    stopSpeechWatchdog();
    christmasVideo.pause();
    christmasVideo.currentTime = 0;
    completeOverlay.classList.add('hidden');
    videoOverlay.classList.add('hidden');
    postcardButton.classList.add('hidden');
    postcardButton.classList.remove('opening', 'lottie-done', 'lottie-visible', 'lottie-playing', 'lottie-intro-fade');
    resetPostcardLottie();
    resetIntroLottie();
    stopCompleteHeaderLottie();
    state.experienceStarted = false;
    state.postcardReady = false;
    state.videoPlaying = false;
    if (state.pcTestActive) {
      showPcTestPanel();
      return;
    }
    showScanStatus();
    setScanStatus('Scanning...');
  }

  installStyles();
  ensureUi();
  showLoadingOverlay();
  hideScanStatus();
  requestCameraPermissionGate(false);
})();


