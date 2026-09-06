import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  DEG,
  clamp,
  moonDirection,
  tideCoefficient,
  visualAmplitude,
  waterSurfaceRadius,
  waterWaveHeight,
} from "./model.js";
import { makeEarthCanvas, makeGlowCanvas, makeMoonCanvas } from "./planet-texture.js";

const LOW_COLOR = [17, 103, 126];
const MID_COLOR = [78, 191, 202];
const HIGH_COLOR = [226, 250, 248];

function mixColor(out, a, b, t) {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
}

export class ThreeView {
  constructor(container) {
    this.container = container;
    this.visible = true;
    this.canvas = document.createElement("canvas");
    container.prepend(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#07130f");

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 400);
    this.camera.position.set(6.2, 4.4, 7.6);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3.1;
    this.controls.maxDistance = 22;
    this.controls.enablePan = false;

    this.buildLights();
    this.buildStars();
    this.buildEarth();
    this.buildMoon();
    this.buildWater();
    this.buildMarkers();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
  }

  buildLights() {
    this.scene.add(new THREE.AmbientLight(0x2b5149, 1.15));
    const key = new THREE.DirectionalLight(0xfff0d6, 3);
    key.position.set(5, 7, 8);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x79d9e4, 0.75);
    fill.position.set(-6, -2, -5);
    this.scene.add(fill);
    const hemi = new THREE.HemisphereLight(0xbaf7ec, 0x8b6046, 0.75);
    this.scene.add(hemi);
  }

  buildStars() {
    const count = 1400;
    const positions = new Float32Array(count * 3);
    const rand = mulberry32(20260906);
    for (let i = 0; i < count; i += 1) {
      const u = rand() * 2 - 1;
      const theta = rand() * Math.PI * 2;
      const r = 105 + rand() * 15;
      const s = Math.sqrt(1 - u * u);
      positions[i * 3] = s * Math.cos(theta) * r;
      positions[i * 3 + 1] = u * r;
      positions[i * 3 + 2] = s * Math.sin(theta) * r;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xc4f0e7,
      size: 0.08,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    this.scene.add(new THREE.Points(geometry, material));
  }

  buildEarth() {
    const earthCanvas = makeEarthCanvas(2048);
    const texture = new THREE.CanvasTexture(earthCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.84,
      metalness: 0.03,
    });
    this.earth = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 72), material);
    this.scene.add(this.earth);

    const axisMaterial = new THREE.LineBasicMaterial({
      color: 0x72c9c1,
      transparent: true,
      opacity: 0.3,
    });
    const axisGeometry = new THREE.BufferGeometry();
    axisGeometry.setAttribute("position", new THREE.Float32BufferAttribute([0, -1.55, 0, 0, 1.55, 0], 3));
    this.scene.add(new THREE.Line(axisGeometry, axisMaterial));

    const glowTexture = new THREE.CanvasTexture(makeGlowCanvas(256, "124, 212, 218"));
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0x7ddbe6,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });
    const glow = new THREE.Sprite(glowMaterial);
    glow.scale.setScalar(4.6);
    this.scene.add(glow);
  }

  buildMoon() {
    const moonCanvas = makeMoonCanvas(1024);
    const texture = new THREE.CanvasTexture(moonCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xd8d4c9,
      roughness: 0.92,
      metalness: 0,
    });
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 64, 48), material);
    this.moon.position.set(5, 0, 0);
    this.scene.add(this.moon);

    const glowTexture = new THREE.CanvasTexture(makeGlowCanvas(192, "255, 225, 169"));
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xf7e0a9,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
    });
    const glow = new THREE.Sprite(glowMaterial);
    glow.scale.setScalar(2.3);
    this.moon.add(glow);

    const orbitPositions = new Float32Array(512 * 3);
    this.orbitGeometry = new THREE.BufferGeometry();
    this.orbitGeometry.setAttribute("position", new THREE.BufferAttribute(orbitPositions, 3));
    this.orbit = new THREE.Line(
      this.orbitGeometry,
      new THREE.LineBasicMaterial({
        color: 0x79cdc1,
        transparent: true,
        opacity: 0.34,
      }),
    );
    this.scene.add(this.orbit);

    this.moonLinkGeometry = new THREE.BufferGeometry();
    this.moonLinkGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3),
    );
    this.moonLink = new THREE.Line(
      this.moonLinkGeometry,
      new THREE.LineBasicMaterial({
        color: 0xf5bd6b,
        transparent: true,
        opacity: 0.18,
      }),
    );
    this.scene.add(this.moonLink);
  }

  buildWater() {
    this.waterGeometry = new THREE.SphereGeometry(1, 140, 96);
    this.waterBasePositions = this.waterGeometry.attributes.position.array.slice();
    const vertexCount = this.waterGeometry.attributes.position.count;
    const colors = new Float32Array(vertexCount * 3);
    this.waterGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.water = new THREE.Mesh(
      this.waterGeometry,
      new THREE.MeshPhongMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
        side: THREE.FrontSide,
        shininess: 58,
        specular: 0x9edfd7,
      }),
    );
    this.scene.add(this.water);
  }

  buildMarkers() {
    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xffd166 });
    const pointGeometry = new THREE.SphereGeometry(0.045, 16, 12);
    this.nearMarker = new THREE.Mesh(pointGeometry, pointMaterial);
    this.farMarker = new THREE.Mesh(pointGeometry, pointMaterial.clone());
    this.nearMarker.position.set(1.1, 0, 0);
    this.farMarker.position.set(-1.1, 0, 0);
    this.scene.add(this.nearMarker);
    this.scene.add(this.farMarker);

    this.lowRingGeometry = new THREE.TorusGeometry(1.05, 0.008, 12, 140);
    this.lowRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xdfa4f5,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });
    this.lowRing = new THREE.Mesh(this.lowRingGeometry, this.lowRingMaterial);
    this.scene.add(this.lowRing);

    this.nearGlowMaterial = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(makeGlowCanvas(128, "255, 224, 158")),
      color: 0xffd166,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    const nearGlow = new THREE.Sprite(this.nearGlowMaterial);
    nearGlow.scale.setScalar(0.5);
    this.nearMarker.add(nearGlow);

    const farGlowMaterial = this.nearGlowMaterial.clone();
    const farGlow = new THREE.Sprite(farGlowMaterial);
    farGlow.scale.setScalar(0.5);
    this.farMarker.add(farGlow);
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) {
      return;
    }
    this.renderer.setSize(rect.width, rect.height, false);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
  }

  setVisible(visible) {
    this.visible = visible;
    this.canvas.style.display = visible ? "block" : "none";
    if (visible) {
      this.resize();
    }
  }

  update(state) {
    this.state = state;
    if (!this.visible) {
      return;
    }
    this.earth.rotation.y = state.earthRotationDeg * DEG;

    const dir = moonDirection(state.moonAngleDeg);
    const radius = state.moonDistance;
    this.moon.position.set(dir.x * radius, 0, dir.z * radius);
    this.moon.rotation.y += 0.0008;

    const orbitCount = 256;
    const orbitArray = this.orbitGeometry.attributes.position.array;
    for (let i = 0; i < orbitCount; i += 1) {
      const a = (i / orbitCount) * Math.PI * 2;
      orbitArray[i * 3] = Math.cos(a) * radius;
      orbitArray[i * 3 + 1] = 0;
      orbitArray[i * 3 + 2] = Math.sin(a) * radius;
    }
    this.orbitGeometry.attributes.position.needsUpdate = true;

    const linkArray = this.moonLinkGeometry.attributes.position.array;
    linkArray[3] = dir.x * radius;
    linkArray[4] = 0;
    linkArray[5] = dir.z * radius;
    this.moonLinkGeometry.attributes.position.needsUpdate = true;

    this.water.visible = state.showOcean;
    this.updateWater(state);

    const amplitude = visualAmplitude(state);
    const nearRadius = waterSurfaceRadius(1, amplitude);
    const lowRadius = waterSurfaceRadius(-0.5, amplitude);
    const farRadius = nearRadius;

    this.nearMarker.visible = state.showBulges;
    this.farMarker.visible = state.showBulges;
    this.lowRing.visible = state.showLowRing;
    this.nearMarker.position.set(dir.x * nearRadius, 0, dir.z * nearRadius);
    this.farMarker.position.set(-dir.x * farRadius, 0, -dir.z * farRadius);
    this.lowRing.scale.setScalar(lowRadius / 1.05);
    this.lowRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(dir.x, dir.y, dir.z));

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  updateWater(state) {
    const positions = this.waterGeometry.attributes.position.array;
    const colors = this.waterGeometry.attributes.color.array;
    const count = positions.length / 3;
    const amp = visualAmplitude(state);
    const angle = state.moonAngleDeg * DEG;
    const cosMoon = Math.cos(angle);
    const sinMoon = Math.sin(angle);
    const colorTmp = [0, 0, 0];
    const shimmerTime = state.elapsed ?? 0;
    const lowSurface = waterSurfaceRadius(-0.5, amp);
    const waveMax = Math.min(state.waveStrength * 0.018, Math.max(0.004, lowSurface - 1.012));

    for (let i = 0; i < count; i += 1) {
      const x = this.waterBasePositions[i * 3];
      const y = this.waterBasePositions[i * 3 + 1];
      const z = this.waterBasePositions[i * 3 + 2];
      const lat = Math.asin(Math.max(-1, Math.min(1, y)));
      const lon = Math.atan2(z, x);
      const pDotMoon = x * cosMoon + z * sinMoon;
      const coefficient = tideCoefficient(pDotMoon);
      const wave = waterWaveHeight(lat, lon, shimmerTime, state.waveStrength) * waveMax;
      const surfaceRadius = waterSurfaceRadius(coefficient, amp) + wave;
      positions[i * 3] = x * surfaceRadius;
      positions[i * 3 + 1] = y * surfaceRadius;
      positions[i * 3 + 2] = z * surfaceRadius;

      const shimmer = 0.5 + Math.sin(lon * 11 - shimmerTime * 5.2 + lat * 8) * 0.12;
      const t = clamp(((coefficient + 0.5) / 1.5) * 0.82 + shimmer * 0.18, 0, 1);
      if (t < 0.5) {
        mixColor(colorTmp, LOW_COLOR, MID_COLOR, t * 2);
      } else {
        mixColor(colorTmp, MID_COLOR, HIGH_COLOR, (t - 0.5) * 2);
      }
      colors[i * 3] = colorTmp[0] / 255;
      colors[i * 3 + 1] = colorTmp[1] / 255;
      colors[i * 3 + 2] = colorTmp[2] / 255;
    }

    this.waterGeometry.attributes.position.needsUpdate = true;
    this.waterGeometry.attributes.color.needsUpdate = true;
    this.waterGeometry.computeVertexNormals();
  }

  project(point) {
    const v = new THREE.Vector3(point.x, point.y, point.z).project(this.camera);
    const width = this.canvas.clientWidth || this.canvas.width;
    const height = this.canvas.clientHeight || this.canvas.height;
    return {
      x: (v.x * 0.5 + 0.5) * width,
      y: (-v.y * 0.5 + 0.5) * height,
      visible: v.z < 1,
    };
  }

  anchor(state) {
    const dir = moonDirection(state.moonAngleDeg);
    const amplitude = visualAmplitude(state);
    const highRadius = waterSurfaceRadius(1, amplitude);
    return {
      moon: { x: dir.x * state.moonDistance, y: 0, z: dir.z * state.moonDistance },
      earth: { x: 0, y: 0, z: 0 },
      near: { x: dir.x * highRadius, y: 0, z: dir.z * highRadius },
      far: { x: -dir.x * highRadius, y: 0, z: -dir.z * highRadius },
    };
  }

  dispose() {
    this.renderer.dispose();
    this.resizeObserver.disconnect();
  }
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
