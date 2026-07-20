(function () {
  const targetNames = ['1', '2', '3', '4', '5'];
  const NAME_KEY = 'christmasChildName';
  const STATIC_SANTA_DIAGNOSTIC = false;
  const SANTA_BASE_X = 0.25;
  const SANTA_BASE_Y = 0;

  let scanStatus;
  let loadingOverlay;
  let flowLayer;
  let nameGate;
  let nameInput;
  let nameError;
  let nameBadge;
  let santaCanvas;
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

  let appStarted = false;
  let cameraStarted = false;
  let waitingForCameraReady = false;
  let threeReady = false;
  let renderer;
  let scene;
  let camera;
  let santa;
  let mixer;
  let santaActions = {};
  let unitySantaClips = {};
  let unityAnimationTemp = null;
  let activeUnityClip = null;
  let activeUnityTime = 0;
  let currentSantaAction = null;
  let desiredSantaAction = 'Santa_DanceIdle';
  let clock;

  const state = {
    childName: localStorage.getItem(NAME_KEY) || '',
    experienceStarted: false,
    postcardReady: false,
    videoPlaying: false,
    santaMode: 'hidden',
    santaTime: 0,
    speechWatchdog: null,
    speechDeadlineAt: 0,
    flowToken: 0,
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

      #christmas-santa-canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: none;
        pointer-events: none;
      }

      #christmas-santa-canvas.visible {
        display: block;
      }

      #target-scan-status {
        position: fixed;
        left: 50%;
        bottom: calc(28px + env(safe-area-inset-bottom, 0px));
        z-index: 2147483646;
        transform: translateX(-50%);
        min-width: 190px;
        padding: 10px 16px;
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.68);
        color: #fff;
        font: 700 16px/1.2 "Segoe UI Variable Text", "Aptos", "Segoe UI", Arial, Helvetica, sans-serif;
        text-align: center;
        pointer-events: none;
      }

      #target-scan-status.hidden {
        display: none;
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
        color: #8f2020;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(25px, 6.2vw, 34px);
        font-weight: 700;
        line-height: 1.02;
        letter-spacing: 0;
        -webkit-text-stroke: 1px rgba(255, 255, 255, 0.82);
        paint-order: stroke fill;
        text-shadow:
          0 1px 0 rgba(255, 255, 255, 0.6),
          0 0 8px rgba(255, 255, 255, 0.35);
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
          radial-gradient(circle at 22% 18%, rgba(255, 219, 133, 0.3), transparent 26%),
          radial-gradient(circle at 82% 8%, rgba(255, 255, 255, 0.22), transparent 24%),
          linear-gradient(180deg, #0e5a4a 0%, #10352d 45%, #56151c 100%);
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
          <div class="lag-loading-text">Loading AR...</div>
        </div>
      `;
      document.body.appendChild(loadingOverlay);
    }

    if (!flowLayer) {
      flowLayer = document.createElement('div');
      flowLayer.id = 'christmas-flow-layer';
      flowLayer.innerHTML = `
        <canvas id="christmas-santa-canvas"></canvas>
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

      santaCanvas = document.getElementById('christmas-santa-canvas');
      nameGate = document.getElementById('name-gate');
      nameInput = document.getElementById('child-name-input');
      nameError = document.getElementById('name-error');
      nameBadge = document.getElementById('name-badge');
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
      christmasVideo.addEventListener('ended', showComplete);
      document.getElementById('restart-button').addEventListener('click', restartExperience);
    }

    if (!scanStatus) {
      scanStatus = document.createElement('div');
      scanStatus.id = 'target-scan-status';
      scanStatus.textContent = 'Scan target 1-5';
      document.body.appendChild(scanStatus);
    }

    refreshNameBadge();
    if (!state.childName) showNameGate(false);
  }

  function refreshNameBadge() {
    if (nameBadge) nameBadge.textContent = state.childName ? `Name: ${state.childName}` : 'Set name';
  }

  function showNameGate(focus) {
    if (!nameInput || !nameGate) return;
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
    showScanStatus();
    setScanStatus('Scan target 1-5');
    if (cameraStarted) {
      hideLoadingOverlay();
    } else {
      waitingForCameraReady = true;
      showLoadingOverlay();
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

  function setScanStatus(text) {
    ensureUi();
    scanStatus.textContent = text;
  }

  function hideScanStatus() {
    if (scanStatus) scanStatus.classList.add('hidden');
  }

  function showScanStatus() {
    if (scanStatus) scanStatus.classList.remove('hidden');
  }

  function startApp() {
    if (appStarted) return;
    appStarted = true;
    const script = document.createElement('script');
    script.src = './bundle.js';
    script.onerror = () => setScanStatus('Failed to load app bundle');
    document.body.appendChild(script);
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

  async function configureImageTargets() {
    try {
      installStyles();
      ensureUi();
      await initThree();
      const imageTargetData = await loadImageTargets();
      if (!window.XR8 || !window.XR8.XrController) {
        window.addEventListener('xrloaded', configureImageTargets, { once: true });
        return;
      }

      window.__christmasImageTargetData = imageTargetData;
      window.XR8.XrController.configure({
        disableWorldTracking: true,
        imageTargetData,
        imageTargets: imageTargetData,
      });

      window.XR8.addCameraPipelineModule({
        name: 'christmas-image-target-flow',
        onStart: () => {
          cameraStarted = true;
          waitingForCameraReady = false;
          hideLoadingOverlay();
          showScanStatus();
          setScanStatus(state.childName ? 'Scan target 1-5' : 'Set name first');
        },
        listeners: [
          {
            event: 'reality.imagefound',
            process: ({ detail }) => handleTargetFound(detail && detail.name),
          },
          {
            event: 'reality.imageupdated',
            process: ({ detail }) => {
              if (!state.experienceStarted && detail && detail.name) setScanStatus(`Tracking: ${detail.name}`);
            },
          },
          {
            event: 'reality.imagelost',
            process: () => {
              if (!state.experienceStarted) setScanStatus(state.childName ? 'Scan target 1-5' : 'Set name first');
            },
          },
        ],
      });

      startApp();
    } catch (error) {
      console.error('[Christmas AR] image target configuration failed:', error);
      setScanStatus(`Image target setup failed: ${errorText(error)}`);
      setTimeout(hideLoadingOverlay, 1200);
    }
  }

  async function initThree() {
    if (threeReady) return;
    const THREE = await import('https://esm.sh/three@0.161.0');
    const { GLTFLoader } = await import('https://esm.sh/three@0.161.0/examples/jsm/loaders/GLTFLoader.js?bundle');
    window.__ChristmasTHREE = THREE;

    renderer = new THREE.WebGLRenderer({ canvas: santaCanvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.12, 7.2);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8892a6, 2.25));
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(3, 4, 5);
    scene.add(key);

    santa = new THREE.Group();
    santa.visible = false;
    scene.add(santa);

    const loader = new GLTFLoader();
    loader.load('./assets/MongoScene.glb', (gltf) => {
      const modelRoot = normalizeLoadedSanta(gltf.scene, THREE);
      modelRoot.visible = santa.visible;
      scene.remove(santa);
      santa = modelRoot;
      scene.add(santa);
      santaActions = {};
      currentSantaAction = null;
      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(gltf.scene);
        gltf.animations.forEach((clip) => {
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.clampWhenFinished = false;
          santaActions[clip.name] = action;
          if (clip.name.indexOf('Hip_Hop_Dancing_1') !== -1 || clip.name.indexOf('DanceIdle') !== -1) santaActions.Santa_DanceIdle = action;
          if (clip.name.indexOf('WaveHello') !== -1) santaActions.Santa_WaveHello = action;
        });
        playSantaAction(desiredSantaAction, 0);
      }
    }, undefined, (error) => {
      console.warn('[Christmas AR] Failed to load MongoScene.glb', error);
    });

    clock = new THREE.Clock();
    threeReady = true;
    resizeSantaCanvas();
    window.addEventListener('resize', resizeSantaCanvas, { passive: true });
    requestAnimationFrame(renderSanta);
  }

  function normalizeLoadedSanta(model, THREE) {
    const root = new THREE.Group();
    model.traverse((child) => {
      if (child.isMesh) {
        child.frustumCulled = false;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if (material) {
            material.side = THREE.DoubleSide;
            material.needsUpdate = true;
          }
        });
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const height = Math.max(size.y, 0.001);
    const scale = 1.175 / height;
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -center.y * scale - 0.82, -center.z * scale);
    root.add(model);
    root.position.set(SANTA_BASE_X, SANTA_BASE_Y, 0);
    return root;
  }

  function resizeSantaCanvas() {
    if (!renderer || !camera) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  async function loadSantaAnimationSamples() {
    const response = await fetch('./assets/santa-animation-samples.json?v=unity-anim-1', { cache: 'no-store' });
    if (response.status === 404) {
      return { clips: [] };
    }
    if (!response.ok) throw new Error(`Failed to load Santa animation samples: ${response.status}`);
    return response.json();
  }

  function setupUnitySantaAnimations(samples, santaRoot, THREE) {
    const nodesByName = {};
    santaRoot.traverse((node) => {
      if (node.name) nodesByName[node.name] = node;
    });
    unityAnimationTemp = {
      qa: new THREE.Quaternion(),
      qb: new THREE.Quaternion(),
    };
    unitySantaClips = {};
    (samples.clips || []).forEach((clip) => {
      const tracks = (clip.bones || [])
        .filter((bone) => bone.name !== 'Root')
        .map((bone) => ({ name: bone.name, node: nodesByName[bone.name], frames: bone.frames || [] }))
        .filter((track) => track.node && track.frames.length > 0);
      unitySantaClips[clip.name] = {
        name: clip.name,
        length: Math.max(Number(clip.length) || 0, 0.001),
        times: clip.times || [],
        tracks,
      };
    });
    console.log('[Christmas AR] Unity Santa clips loaded:', Object.keys(unitySantaClips));
  }
  function playSantaAction(name, fadeSeconds = 0.3) {
    desiredSantaAction = name;
    activeUnityClip = null;
    if (!mixer || !santaActions[name]) return;
    const next = santaActions[name];
    if (currentSantaAction === next) return;
    next.enabled = true;
    next.reset();
    next.play();
    if (currentSantaAction && fadeSeconds > 0) {
      currentSantaAction.crossFadeTo(next, fadeSeconds, false);
    } else if (currentSantaAction) {
      currentSantaAction.stop();
    }
    currentSantaAction = next;
  }

  function renderSanta() {
    if (renderer && scene && camera) {
      const delta = clock ? clock.getDelta() : 0.016;
      if (mixer) mixer.update(delta);
      updateUnitySantaAnimation(delta);
      animateSanta(delta);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(renderSanta);
  }

  function updateUnitySantaAnimation(delta) {
    if (!activeUnityClip || !santa || !santa.visible) return;
    activeUnityTime = (activeUnityTime + delta) % activeUnityClip.length;
    applyUnitySantaAnimation(activeUnityClip, activeUnityTime);
  }

  function applyUnitySantaAnimation(clip, time) {
    const times = clip.times;
    if (!times || times.length === 0 || !unityAnimationTemp) return;
    let nextIndex = times.findIndex((sampleTime) => sampleTime >= time);
    if (nextIndex < 0) nextIndex = 0;
    const prevIndex = nextIndex === 0 ? Math.max(times.length - 1, 0) : nextIndex - 1;
    const prevTime = times[prevIndex] || 0;
    const nextTime = times[nextIndex] || 0;
    const span = nextIndex === 0 ? Math.max((clip.length - prevTime) + nextTime, 0.0001) : Math.max(nextTime - prevTime, 0.0001);
    const elapsed = nextIndex === 0 ? (time >= prevTime ? time - prevTime : (clip.length - prevTime) + time) : time - prevTime;
    const alpha = Math.max(0, Math.min(1, elapsed / span));

    clip.tracks.forEach((track) => {
      const a = track.frames[prevIndex] || track.frames[0];
      const b = track.frames[nextIndex] || track.frames[0];
      if (!a || !b) return;
      if (track.name === 'Hips') {
        track.node.position.set(
          lerp(a.p.x, b.p.x, alpha),
          lerp(a.p.y, b.p.y, alpha),
          lerp(a.p.z, b.p.z, alpha),
        );
      }
      unityAnimationTemp.qa.set(a.r.x, a.r.y, a.r.z, a.r.w);
      unityAnimationTemp.qb.set(b.r.x, b.r.y, b.r.z, b.r.w);
      track.node.quaternion.slerpQuaternions(unityAnimationTemp.qa, unityAnimationTemp.qb, alpha);
    });
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function animateSanta(delta) {
    if (!santa || !santa.visible) return;
    if (!STATIC_SANTA_DIAGNOSTIC) return;
    if (santaActions && Object.keys(santaActions).length > 0) return;
    state.santaTime += delta;
    const t = state.santaTime;
    santa.rotation.y = Math.sin(t * 1.5) * 0.12;
    santa.position.y = SANTA_BASE_Y + Math.sin(t * 4.6) * 0.025;
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
    state.santaMode = 'hidden';
    state.santaTime = 0;
    hideScanStatus();
    postcardButton.classList.add('hidden');
    postcardButton.classList.remove('opening', 'lottie-done', 'lottie-visible');
    resetPostcardLottie();
    resetIntroLottie();
    videoOverlay.classList.add('hidden');
    completeOverlay.classList.add('hidden');
    santaCanvas.classList.remove('visible');
    if (santa) santa.visible = false;

    speakIntro();

    playIntroLottieOnce().then(() => {
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
    state.santaMode = 'hidden';
    santaCanvas.classList.remove('visible');
    if (santa) santa.visible = false;
    postcardButton.classList.remove('hidden');
    playPostcardLottieReverseOnce();
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

  function playPostcardLottieReverseOnce() {
    if (postcardLottiePlayed) return;
    postcardLottiePlayed = true;
    ensurePostcardLottie().then((animation) => {
      const endFrame = Math.max(0, Math.floor(animation.totalFrames || 144) - 1);
      const finish = () => {
        animation.removeEventListener('complete', finish);
        animation.pause();
        postcardButton.classList.add('lottie-done');
      };
      animation.loop = false;
      animation.setDirection(-1);
      animation.goToAndStop(endFrame, true);
      requestAnimationFrame(() => {
        if (postcardButton) postcardButton.classList.add('lottie-visible');
        animation.addEventListener('complete', finish);
        animation.play();
      });
    }).catch((error) => {
      console.warn('[Christmas AR] postcard lottie failed:', error);
      if (postcardButton) postcardButton.classList.add('lottie-visible', 'lottie-done');
    });
  }

  function resetPostcardLottie() {
    postcardLottiePlayed = false;
    if (postcardButton) postcardButton.classList.remove('lottie-done', 'lottie-visible');
    if (!postcardLottieAnimation) return;
    const endFrame = Math.max(0, Math.floor(postcardLottieAnimation.totalFrames || 144) - 1);
    postcardLottieAnimation.setDirection(-1);
    postcardLottieAnimation.goToAndStop(endFrame, true);
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

  function playIntroLottieOnce() {
    if (introLottiePlayed) return Promise.resolve();
    introLottiePlayed = true;
    if (introLottieOverlay) introLottieOverlay.classList.remove('hidden');
    return ensureIntroLottie().then((animation) => new Promise((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
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
      setTimeout(finish, 5200);
    })).catch((error) => {
      console.warn('[Christmas AR] intro lottie failed:', error);
      if (introLottieOverlay) introLottieOverlay.classList.add('hidden');
    });
  }

  function resetIntroLottie() {
    introLottiePlayed = false;
    if (introLottieOverlay) introLottieOverlay.classList.add('hidden');
    if (!introLottieAnimation) return;
    introLottieAnimation.stop();
    introLottieAnimation.goToAndStop(0, true);
  }

  function playCompleteHeaderLottie() {
    if (!completeLottieContainer) return;
    loadLottieRuntime().then((lottie) => {
      if (completeLottieAnimation) {
        completeLottieAnimation.goToAndPlay(0, true);
        return;
      }
      completeLottieAnimation = lottie.loadAnimation({
        container: completeLottieContainer,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: './assets/merry-christmas-header.json?v=completion-header-lottie-20260720',
      });
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

  function openPostcard() {
    if (!state.postcardReady || state.videoPlaying) return;
    state.videoPlaying = true;
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch {}
    postcardButton.classList.add('opening');
    setTimeout(async () => {
      postcardButton.classList.add('hidden');
      santaCanvas.classList.remove('visible');
      if (santa) santa.visible = false;
      videoOverlay.classList.remove('hidden');
      christmasVideo.loop = false;
      christmasVideo.currentTime = 0;
      try {
        await christmasVideo.play();
      } catch (error) {
        console.warn('[Christmas AR] video play blocked:', error);
      }
    }, 280);
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
    postcardButton.classList.remove('opening', 'lottie-done', 'lottie-visible');
    resetPostcardLottie();
    resetIntroLottie();
    stopCompleteHeaderLottie();
    santaCanvas.classList.remove('visible');
    if (santa) santa.visible = false;
    state.experienceStarted = false;
    state.postcardReady = false;
    state.videoPlaying = false;
    state.santaMode = 'hidden';
    showScanStatus();
    setScanStatus('Scan target 1-5');
  }

  installStyles();
  ensureUi();
  setTimeout(() => {
    if (!waitingForCameraReady) hideLoadingOverlay();
  }, 9000);
  if (!state.childName) {
    hideLoadingOverlay();
    showScanStatus();
    setScanStatus('Set name first');
  }

  if (window.XR8) configureImageTargets();
  else window.addEventListener('xrloaded', configureImageTargets, { once: true });
})();









