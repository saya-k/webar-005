import * as THREE from 'three';
import { GLTFLoader } from 'https://unpkg.com/three@0.161.0/examples/jsm/loaders/GLTFLoader.js';

const targets = [
  'Christmas snowflake',
  '1',
  '2',
  '3',
  '4',
  '5',
];

const els = {
  cameraVideo: document.querySelector('#cameraVideo'),
  canvas: document.querySelector('#threeCanvas'),
  nameGate: document.querySelector('#nameGate'),
  startGate: document.querySelector('#startGate'),
  childNameInput: document.querySelector('#childNameInput'),
  nameError: document.querySelector('#nameError'),
  saveNameButton: document.querySelector('#saveNameButton'),
  nameBadge: document.querySelector('#nameBadge'),
  startButton: document.querySelector('#startButton'),
  scanHud: document.querySelector('#scanHud'),
  targetDebug: document.querySelector('#targetDebug'),
  postcardButton: document.querySelector('#postcardButton'),
  videoOverlay: document.querySelector('#videoOverlay'),
  christmasVideo: document.querySelector('#christmasVideo'),
  completeOverlay: document.querySelector('#completeOverlay'),
  restartButton: document.querySelector('#restartButton'),
};

const state = {
  childName: localStorage.getItem('christmasChildName') || '',
  stream: null,
  started: false,
  experienceStarted: false,
  postcardReady: false,
  santaMode: 'hidden',
  santaTime: 0,
  ttsDone: false,
  speechDeadlineAt: 0,
  speechWatchdog: null,
};

const santaAnchorY = -0.18;

let renderer;
let scene;
let camera;
let santa;
let santaMixer;
let clock;

init();

function init() {
  setupNameFlow();
  setupTargetDebug();
  setupVideoFlow();
  setupThree();
  resize();
  window.addEventListener('resize', resize, { passive: true });
  requestAnimationFrame(tick);

  if (state.childName) {
    showStartGate();
  } else {
    els.nameGate.classList.remove('hidden');
  }
  refreshNameBadge();
}

function setupNameFlow() {
  els.childNameInput.value = state.childName;
  els.saveNameButton.addEventListener('click', saveName);
  els.childNameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') saveName();
  });
  els.nameBadge.addEventListener('click', () => {
    els.nameGate.classList.remove('hidden');
    els.startGate.classList.add('hidden');
    setTimeout(() => els.childNameInput.focus(), 60);
  });
  els.startButton.addEventListener('click', startCameraExperience);
}

function saveName() {
  const cleanName = normalizeName(els.childNameInput.value);
  if (!cleanName) {
    els.nameError.textContent = 'Please enter a child name.';
    return;
  }
  state.childName = cleanName;
  localStorage.setItem('christmasChildName', cleanName);
  els.nameError.textContent = '';
  els.nameGate.classList.add('hidden');
  refreshNameBadge();
  if (!state.started) showStartGate();
}

function showStartGate() {
  els.startGate.classList.remove('hidden');
}

function refreshNameBadge() {
  els.nameBadge.textContent = state.childName ? `Name: ${state.childName}` : 'Set name';
}

function normalizeName(raw) {
  return raw.trim().replace(/\s+/g, ' ').slice(0, 24);
}

async function startCameraExperience() {
  if (!state.childName) {
    els.nameGate.classList.remove('hidden');
    return;
  }
  els.startButton.disabled = true;
  els.startButton.textContent = 'Starting...';
  unlockSpeech();
  await startCamera();
  els.startGate.classList.add('hidden');
  showScanHud();
  state.started = true;
  els.startButton.disabled = false;
  els.startButton.textContent = 'Tap to start';
}

async function startCamera() {
  if (state.stream) return;
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
    els.cameraVideo.srcObject = state.stream;
    await els.cameraVideo.play();
  } catch (error) {
    console.warn('Camera failed, prototype continues with black background.', error);
  }
}

function setupTargetDebug() {
  targets.forEach((targetId) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = targetId === 'Christmas snowflake' ? 'Snow' : targetId;
    button.addEventListener('click', () => onTargetFound(targetId));
    els.targetDebug.appendChild(button);
  });
}

function onTargetFound(targetId) {
  if (state.experienceStarted) return;
  console.log('Simulated target found:', targetId);
  state.experienceStarted = true;
  state.postcardReady = false;
  state.ttsDone = false;
  state.santaMode = 'dance';
  state.santaTime = 0;
  forceHideScanHud();
  els.postcardButton.classList.add('hidden');
  santa.visible = true;

  startSpeechWatchdog(7200);

  speakIntro().then(() => {
    finishSantaSpeechStep();
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
    if (performance.now() >= state.speechDeadlineAt) {
      finishSantaSpeechStep();
    }
  }, 250);
}

function stopSpeechWatchdog() {
  if (state.speechWatchdog) {
    clearInterval(state.speechWatchdog);
    state.speechWatchdog = null;
  }
}
function forceHideScanHud() {
  els.scanHud.classList.add('hidden');
  els.scanHud.style.display = 'none';
}

function showScanHud() {
  els.scanHud.style.display = '';
  els.scanHud.classList.remove('hidden');
}

function finishSantaSpeechStep() {
  if (!state.experienceStarted || state.postcardReady) return;
  stopSpeechWatchdog();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  state.ttsDone = true;
  state.santaMode = 'wave';
  forceHideScanHud();
  showPostcard();
}

function unlockSpeech() {
  if (!('speechSynthesis' in window)) return;
  try {
    const utterance = new SpeechSynthesisUtterance('');
    utterance.volume = 0;
    speechSynthesis.speak(utterance);
    speechSynthesis.cancel();
  } catch {
  }
}

function speakIntro() {
  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      resolve();
    };

    const fallbackTimer = setTimeout(finish, 7200);
    const done = () => {
      clearTimeout(fallbackTimer);
      finish();
    };

    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setTimeout(done, 3800);
      return;
    }

    speechSynthesis.cancel();
    const name = nameForSpeech(state.childName);
    const utterance = new SpeechSynthesisUtterance(`Hey! ${name}. Merry Christmas! Open Santa's postcard!`);
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
      try {
        speechSynthesis.speak(utterance);
      } catch (error) {
        console.warn('TTS failed, continuing flow.', error);
        done();
      }
    }, 500);
  });
}

function nameForSpeech(name) {
  const lower = name.toLowerCase();
  const special = {
    gaga: 'Gah-gah',
    saya: 'Sah-yah',
  };
  return special[lower] || name;
}

function showPostcard() {
  state.postcardReady = true;
  els.postcardButton.classList.remove('hidden');
}

function setupVideoFlow() {
  els.christmasVideo.src = './assets/video/Christmas.mp4';
  els.postcardButton.addEventListener('click', () => {
    if (!state.postcardReady) return;
    els.postcardButton.classList.add('opening');
    setTimeout(playChristmasVideo, 520);
  });
  els.christmasVideo.addEventListener('ended', showCompletion);
  els.restartButton.addEventListener('click', restartExperience);
}

async function playChristmasVideo() {
  els.postcardButton.classList.add('hidden');
  els.postcardButton.classList.remove('opening');
  els.videoOverlay.classList.remove('hidden');
  santa.visible = false;
  els.christmasVideo.loop = false;
  els.christmasVideo.currentTime = 0;
  try {
    await els.christmasVideo.play();
  } catch (error) {
    console.warn('Video autoplay blocked, waiting for tap.', error);
  }
}

function showCompletion() {
  els.videoOverlay.classList.add('hidden');
  els.completeOverlay.classList.remove('hidden');
}

function restartExperience() {
  speechSynthesis?.cancel?.();
  els.completeOverlay.classList.add('hidden');
  els.videoOverlay.classList.add('hidden');
  els.postcardButton.classList.add('hidden');
  els.postcardButton.classList.remove('opening');
  showScanHud();
  els.christmasVideo.pause();
  els.christmasVideo.currentTime = 0;
  santa.visible = false;
  state.experienceStarted = false;
  state.postcardReady = false;
  state.santaMode = 'hidden';
  state.speechDeadlineAt = 0;
  stopSpeechWatchdog();
}

function setupThree() {
  renderer = new THREE.WebGLRenderer({
    canvas: els.canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0.35, 7.8);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x7d8ba0, 2.4);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 4, 5);
  scene.add(key);

  santa = createSanta();
  santa.visible = false;
  santa.position.set(0, santaAnchorY, 0);
  santa.scale.setScalar(0.76);
  scene.add(santa);
  loadRealSanta();

  clock = new THREE.Clock();
}

async function loadRealSanta() {
  const loader = new GLTFLoader();
  loader.load(
    './assets/models/Santa.glb',
    (gltf) => {
      const realSanta = normalizeLoadedSanta(gltf.scene);
      realSanta.visible = santa.visible;
      realSanta.position.copy(santa.position);
      realSanta.rotation.copy(santa.rotation);
      scene.remove(santa);
      santa = realSanta;
      scene.add(santa);

      if (gltf.animations && gltf.animations.length > 0) {
        santaMixer = new THREE.AnimationMixer(gltf.scene);
        const action = santaMixer.clipAction(gltf.animations[0]);
        action.play();
      }
    },
    undefined,
    (error) => {
      console.warn('Failed to load Santa.glb, using procedural placeholder.', error);
    },
  );
}

function normalizeLoadedSanta(model) {
  const root = new THREE.Group();
  model.traverse((child) => {
    if (child.isMesh) {
      child.frustumCulled = false;
      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          material.side = THREE.DoubleSide;
          material.needsUpdate = true;
        });
      }
    }
  });

  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const height = Math.max(size.y, 0.001);
  const targetHeight = 3.25;
  const scale = targetHeight / height;

  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  root.add(model);
  return root;
}

function createSanta() {
  const root = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xc92235, roughness: 0.62 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf6f7f5, roughness: 0.5 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xffcfb5, roughness: 0.72 });
  const brown = new THREE.MeshStandardMaterial({ color: 0x6a3f2d, roughness: 0.78 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1d2429, roughness: 0.4 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd69a18, metalness: 0.25, roughness: 0.3 });

  const body = mesh(new THREE.CapsuleGeometry(0.62, 1.2, 8, 20), red, [0, 0.4, 0]);
  root.add(body);
  root.add(mesh(new THREE.SphereGeometry(0.64, 24, 12), white, [0, -0.18, 0], [1, 0.14, 0.16]));
  root.add(mesh(new THREE.BoxGeometry(1.18, 0.11, 0.12), brown, [0, 0.1, 0.47]));
  root.add(mesh(new THREE.BoxGeometry(0.28, 0.23, 0.16), gold, [0, 0.1, 0.56]));

  const head = mesh(new THREE.SphereGeometry(0.43, 28, 18), skin, [0, 1.28, 0.02]);
  root.add(head);
  root.add(mesh(new THREE.SphereGeometry(0.46, 24, 12), white, [0, 1.02, 0.18], [1, 0.62, 0.45]));
  root.add(mesh(new THREE.SphereGeometry(0.17, 16, 10), white, [-0.16, 1.18, 0.47], [1.5, 0.72, 0.55]));
  root.add(mesh(new THREE.SphereGeometry(0.17, 16, 10), white, [0.16, 1.18, 0.47], [1.5, 0.72, 0.55]));
  root.add(mesh(new THREE.SphereGeometry(0.48, 24, 10), white, [0, 1.52, 0.01], [1.05, 0.28, 1.05]));
  root.add(mesh(new THREE.ConeGeometry(0.38, 0.78, 24), red, [0.02, 1.94, 0], [0.28, 0, -0.22]));
  root.add(mesh(new THREE.SphereGeometry(0.12, 16, 10), white, [-0.16, 2.22, 0.04]));
  root.add(mesh(new THREE.SphereGeometry(0.08, 12, 8), dark, [-0.15, 1.34, 0.39]));
  root.add(mesh(new THREE.SphereGeometry(0.08, 12, 8), dark, [0.15, 1.34, 0.39]));
  root.add(mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.035, 16), dark, [-0.15, 1.35, 0.43], [Math.PI / 2, 0, 0]));
  root.add(mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.035, 16), dark, [0.15, 1.35, 0.43], [Math.PI / 2, 0, 0]));

  const leftArm = limb(red, white, brown);
  leftArm.name = 'leftArm';
  leftArm.position.set(-0.67, 0.72, 0);
  leftArm.rotation.z = -0.32;
  root.add(leftArm);

  const rightArm = limb(red, white, brown);
  rightArm.name = 'rightArm';
  rightArm.position.set(0.67, 0.72, 0);
  rightArm.rotation.z = 0.32;
  root.add(rightArm);

  const leftLeg = leg(red, white, brown);
  leftLeg.name = 'leftLeg';
  leftLeg.position.set(-0.27, -0.52, 0);
  root.add(leftLeg);

  const rightLeg = leg(red, white, brown);
  rightLeg.name = 'rightLeg';
  rightLeg.position.set(0.27, -0.52, 0);
  root.add(rightLeg);

  return root;
}

function limb(red, white, brown) {
  const group = new THREE.Group();
  group.add(mesh(new THREE.CapsuleGeometry(0.16, 0.72, 8, 12), red, [0, -0.26, 0], [0, 0, 0.12]));
  group.add(mesh(new THREE.SphereGeometry(0.18, 16, 10), white, [0, -0.63, 0]));
  group.add(mesh(new THREE.SphereGeometry(0.14, 14, 10), brown, [0, -0.81, 0.02], [1, 0.75, 1]));
  return group;
}

function leg(red, white, brown) {
  const group = new THREE.Group();
  group.add(mesh(new THREE.CapsuleGeometry(0.18, 0.78, 8, 12), red, [0, -0.36, 0]));
  group.add(mesh(new THREE.SphereGeometry(0.19, 16, 10), white, [0, -0.76, 0]));
  group.add(mesh(new THREE.BoxGeometry(0.28, 0.18, 0.42), brown, [0, -0.94, 0.08]));
  return group;
}

function mesh(geometry, material, position, rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.scale.set(...scale);
  return object;
}

function tick() {
  const delta = clock.getDelta();
  if (state.experienceStarted && !state.postcardReady && state.speechDeadlineAt && performance.now() >= state.speechDeadlineAt) {
    finishSantaSpeechStep();
  }
  if (santaMixer) santaMixer.update(delta);
  if (santa?.visible) animateSanta(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function animateSanta(delta) {
  state.santaTime += delta;
  const t = state.santaTime;
  const leftArm = santa.getObjectByName('leftArm');
  const rightArm = santa.getObjectByName('rightArm');
  const leftLeg = santa.getObjectByName('leftLeg');
  const rightLeg = santa.getObjectByName('rightLeg');

  santa.rotation.y = Math.sin(t * 1.6) * 0.16;
  santa.position.y = santaAnchorY + Math.sin(t * 5.2) * 0.035;

  if (!leftArm || !rightArm || !leftLeg || !rightLeg) {
    return;
  }

  if (state.santaMode === 'wave') {
    rightArm.rotation.z = 1.95 + Math.sin(t * 7) * 0.28;
    rightArm.rotation.x = -0.4;
    leftArm.rotation.z = -0.28;
    leftLeg.rotation.x = Math.sin(t * 2.3) * 0.1;
    rightLeg.rotation.x = -Math.sin(t * 2.3) * 0.1;
    return;
  }

  const dance = Math.sin(t * 6);
  leftArm.rotation.z = -0.45 + dance * 0.28;
  rightArm.rotation.z = 0.45 - dance * 0.28;
  leftLeg.rotation.x = -dance * 0.18;
  rightLeg.rotation.x = dance * 0.18;
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer?.setSize(width, height, false);
  if (camera) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}





