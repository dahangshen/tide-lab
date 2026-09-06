import {
  TIDE_BASE_AMPLITUDE,
  clamp,
  formatKm,
  makeDefaultState,
  moonDistanceKm,
  norm360,
  visualAmplitude,
} from "./model.js";
import { ThreeView } from "./three-view.js";
import { TopView } from "./top-view.js";

const $ = (id) => document.getElementById(id);

function createIcon(name, size = 18) {
  const lib = window.lucide;
  const iconNode = lib?.icons?.[name];
  if (!lib?.createElement || !iconNode) {
    return null;
  }
  return lib.createElement(iconNode, {
    width: size,
    height: size,
    "aria-hidden": "true",
    focusable: "false",
  });
}

function replaceIcon(element, name, size = 18) {
  if (element.dataset.activeIcon === name) {
    return;
  }
  element.querySelectorAll("svg").forEach((svg) => svg.remove());
  const svg = createIcon(name, size);
  if (svg) {
    element.append(svg);
  }
  element.dataset.activeIcon = name;
}

function injectIcons() {
  document.querySelectorAll("[data-icon]").forEach((element) => {
    const name = element.dataset.icon;
    const svg = createIcon(name, element.matches(".icon-btn") ? 17 : 18);
    if (svg) {
      element.append(svg);
    }
  });
}

let state = makeDefaultState();

const view3dEl = $("view3d");
const viewTopEl = $("viewTop");
const topCanvas = $("topCanvas");
const sceneLabels = $("sceneLabels");
const sceneView = new ThreeView(view3dEl);
const topView = new TopView(topCanvas);

const controls = {
  speed: $("speedRange"),
  moonAngle: $("moonAngleRange"),
  moonDistance: $("moonDistanceRange"),
  tideStrength: $("tideStrengthRange"),
  waveStrength: $("waveStrengthRange"),
  earthSpin: $("earthSpinToggle"),
  moonOrbit: $("moonOrbitToggle"),
  showOcean: $("showOceanToggle"),
  showBulge: $("showBulgeToggle"),
  showLowRing: $("showLowRingToggle"),
};

const outputs = {
  speed: $("speedOutput"),
  moonAngle: $("moonAngleOutput"),
  moonDistance: $("moonDistanceOutput"),
  tideStrength: $("tideStrengthOutput"),
  waveStrength: $("waveStrengthOutput"),
  earth: $("earthReadout"),
  moon: $("moonReadout"),
  near: $("nearTide"),
  far: $("farTide"),
  low: $("lowTide"),
};

let moonAngleRangeActive = false;
let lastTime = performance.now();

function syncUi() {
  controls.speed.value = String(state.simSpeed);
  if (!moonAngleRangeActive) {
    controls.moonAngle.value = String(state.moonAngleDeg);
  }
  controls.moonDistance.value = String(state.moonDistance);
  controls.tideStrength.value = String(state.tideStrength);
  controls.waveStrength.value = String(state.waveStrength);
  controls.earthSpin.checked = state.earthSpin;
  controls.moonOrbit.checked = state.moonOrbit;
  controls.showOcean.checked = state.showOcean;
  controls.showBulge.checked = state.showBulges;
  controls.showLowRing.checked = state.showLowRing;

  outputs.speed.textContent = `${state.simSpeed.toFixed(1)}x`;
  outputs.moonAngle.textContent = `${Math.round(state.moonAngleDeg)}°`;
  outputs.moonDistance.textContent = `${formatKm(moonDistanceKm(state.moonDistance))} km`;
  outputs.tideStrength.textContent = `${state.tideStrength.toFixed(2)}x`;
  outputs.waveStrength.textContent = `${state.waveStrength.toFixed(2)}x`;

  const amplitude = visualAmplitude(state);
  const ratio = amplitude / TIDE_BASE_AMPLITUDE;
  outputs.near.textContent = `+${ratio.toFixed(2)}`;
  outputs.far.textContent = `+${ratio.toFixed(2)}`;
  outputs.low.textContent = `-${(ratio * 0.5).toFixed(2)}`;
  outputs.earth.textContent = `${Math.round(state.earthRotationDeg)}°`;
  outputs.moon.textContent = `${Math.round(state.moonAngleDeg)}°`;

  const playingButton = $("playToggle");
  playingButton.classList.toggle("playing", state.playing);
  replaceIcon(playingButton, state.playing ? "Pause" : "Play", 17);
}

function setMode(mode) {
  const next = mode === "top" ? "top" : "3d";
  state.mode = next;
  view3dEl.classList.toggle("active", next === "3d");
  viewTopEl.classList.toggle("active", next === "top");
  sceneLabels.style.display = next === "3d" ? "block" : "none";
  document.querySelectorAll("[data-mode]").forEach((button) => {
    const active = button.dataset.mode === next;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  sceneView.setVisible(next === "3d");
  topView.setVisible(next === "top");
}

function reset() {
  state = makeDefaultState();
  setMode("3d");
  syncUi();
  lastTime = performance.now();
}

function bindEvents() {
  document.querySelectorAll(".seg-btn").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

  $("playToggle").addEventListener("click", () => {
    state.playing = !state.playing;
    syncUi();
  });

  $("resetBtn").addEventListener("click", reset);
  $("panelToggle").addEventListener("click", () => {
    $("controlPanel").classList.toggle("open");
  });

  const rangeHandlers = {
    speedRange: (value) => (state.simSpeed = value),
    moonAngleRange: (value) => (state.moonAngleDeg = norm360(value)),
    moonDistanceRange: (value) => (state.moonDistance = value),
    tideStrengthRange: (value) => (state.tideStrength = value),
    waveStrengthRange: (value) => (state.waveStrength = value),
  };

  Object.entries(rangeHandlers).forEach(([id, handler]) => {
    const input = $(id);
    input.addEventListener("input", () => {
      handler(Number(input.value));
      syncUi();
    });
  });

  const checkboxHandlers = {
    earthSpinToggle: "earthSpin",
    moonOrbitToggle: "moonOrbit",
    showOceanToggle: "showOcean",
    showBulgeToggle: "showBulges",
    showLowRingToggle: "showLowRing",
  };

  Object.entries(checkboxHandlers).forEach(([id, key]) => {
    const input = $(id);
    input.addEventListener("change", () => {
      state = { ...state, [key]: input.checked };
      syncUi();
    });
  });

  controls.moonAngle.addEventListener("pointerdown", () => {
    moonAngleRangeActive = true;
  });
  ["pointerup", "pointercancel", "blur"].forEach((eventName) => {
    controls.moonAngle.addEventListener(eventName, () => {
      moonAngleRangeActive = false;
    });
  });

  topView.setChangeHandler((change) => {
    state = { ...state, ...change };
    syncUi();
  });

  window.addEventListener("resize", () => {
    sceneView.resize();
    topView.resize();
  });
}

function updateSceneLabels() {
  const active = state.mode === "3d" && state.showLabels;
  sceneLabels.style.display = active ? "block" : "none";
  if (!active) {
    return;
  }
  const anchors = sceneView.anchor(state);
  sceneLabels.querySelectorAll("[data-tag]").forEach((tag) => {
    const key = tag.dataset.tag;
    const point = anchors[key];
    const projected = sceneView.project(point);
    tag.style.display = projected.visible ? "block" : "none";
    tag.style.left = `${projected.x}px`;
    tag.style.top = `${projected.y}px`;
  });
}

function frame(now) {
  const dt = clamp((now - lastTime) / 1000, 0, 0.12);
  lastTime = now;

  if (state.playing) {
    const k = dt * state.simSpeed;
    if (state.earthSpin) {
      state.earthRotationDeg = norm360(state.earthRotationDeg + k * 16);
    }
    if (state.moonOrbit) {
      state.moonAngleDeg = norm360(state.moonAngleDeg + k * 3.2);
    }
  }
  state.elapsed += dt;

  syncUi();
  if (state.mode === "3d") {
    sceneView.update(state);
    updateSceneLabels();
  } else {
    topView.render(state);
  }

  requestAnimationFrame(frame);
}

injectIcons();
bindEvents();
setMode("3d");
syncUi();
requestAnimationFrame(frame);
