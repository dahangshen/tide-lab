import {
  DEG,
  OCEAN_MEAN_RADIUS,
  norm360,
  tideCoefficient,
  visualAmplitude,
  waterSurfaceRadius,
} from "./model.js";

const MAX_VISUAL_DISTANCE = 6.8;

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class TopView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.drag = null;
    this.onChange = null;
    this.stars = Array.from({ length: 150 }, () => {
      const rand = mulberry32(Math.floor(Math.random() * 1e9));
      return { x: rand(), y: rand(), r: rand(), a: 0.25 + rand() * 0.55 };
    });

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
  }

  setChangeHandler(callback) {
    this.onChange = callback;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) {
      return;
    }
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  getCenter() {
    return {
      x: this.width / 2,
      y: this.height / 2,
    };
  }

  getScale(state) {
    const fit = Math.min(this.width * 0.36, this.height * 0.32);
    return Math.max(fit / MAX_VISUAL_DISTANCE, 18);
  }

  toScreen(state, angleDeg, distance) {
    const center = this.getCenter();
    const scale = this.getScale(state);
    const a = angleDeg * DEG;
    return {
      x: center.x + Math.cos(a) * distance * scale,
      y: center.y - Math.sin(a) * distance * scale,
    };
  }

  setVisible(visible) {
    this.visible = visible;
    if (visible) {
      this.resize();
    }
  }

  onPointerDown(event) {
    if (!this.visible) {
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const center = this.getCenter();
    const scale = this.getScale(this.lastState);
    const moon = this.toScreen(this.lastState, this.lastState.moonAngleDeg, this.lastState.moonDistance);
    const nearMoon = Math.hypot(x - moon.x, y - moon.y) < Math.max(26, scale * 1.6);
    const orbitDist = Math.hypot(x - center.x, y - center.y);
    const onOrbitBand = orbitDist > scale * 4.1 && orbitDist < scale * 6.7;
    if (nearMoon || onOrbitBand) {
      this.drag = { startX: x, startY: y, move: nearMoon || onOrbitBand };
      this.canvas.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    }
  }

  onPointerMove(event) {
    if (!this.drag || !this.visible || !this.lastState) {
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const center = this.getCenter();
    const scale = this.getScale(this.lastState);
    const dx = x - center.x;
    const dy = center.y - y;
    const angle = Math.atan2(dy, dx) / DEG;
    const distance = Math.hypot(dx, dy) / scale;
    const next = {
      moonAngleDeg: norm360(angle),
      moonDistance: Math.max(4.2, Math.min(6.5, distance)),
    };
    this.onChange?.(next);
  }

  onPointerUp() {
    this.drag = null;
  }

  render(state) {
    if (!this.width || !this.height || !state) {
      return;
    }
    this.lastState = state;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#06100e";
    ctx.fillRect(0, 0, this.width, this.height);

    for (const star of this.stars) {
      ctx.globalAlpha = star.a;
      ctx.fillStyle = star.r > 0.82 ? "#f8e6b8" : "#d9efec";
      ctx.fillRect(star.x * this.width, star.y * this.height, star.r > 0.88 ? 1.7 : 1, star.r > 0.88 ? 1.7 : 1);
    }
    ctx.globalAlpha = 1;

    const center = this.getCenter();
    const scale = this.getScale(state);
    const earthR = scale;
    const amp = visualAmplitude(state);
    const moonPos = this.toScreen(state, state.moonAngleDeg, state.moonDistance);

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(112, 179, 162, 0.28)";
    ctx.setLineDash([4, 9]);
    ctx.beginPath();
    ctx.arc(center.x, center.y, state.moonDistance * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.save();
    ctx.beginPath();
    ctx.arc(center.x, center.y, earthR * 2.2, 0, Math.PI * 2);
    ctx.clip();
    ctx.beginPath();
    const pathStep = Math.PI / 260;
    const elapsed = state.elapsed ?? 0;
    ctx.moveTo(center.x + Math.cos(0) * earthR, center.y + Math.sin(0) * earthR);
    for (let a = pathStep; a <= Math.PI * 2 + pathStep; a += pathStep) {
      const angleFromMoon = state.moonAngleDeg * DEG + a;
      const cos = Math.cos(a);
      const coefficient = tideCoefficient(cos);
      const surfaceRadius = waterSurfaceRadius(coefficient, amp) / OCEAN_MEAN_RADIUS;
      const visualFactor =
        1.08 + ((coefficient + 0.5) / 1.5) * 0.68 + Math.min(0.24, amp * 2.1);
      const ripple = Math.sin(a * 9 - elapsed * 5.2 + Math.sin(a * 4)) * earthR * 0.022;
      const r = earthR * Math.max(1, visualFactor + (surfaceRadius - 1) * 0.8) + ripple;
      const x = center.x + Math.cos(angleFromMoon) * r;
      const y = center.y - Math.sin(angleFromMoon) * r;
      ctx.lineTo(x, y);
    }
    ctx.closePath();

    const waterGrad = ctx.createRadialGradient(
      center.x - earthR * 0.3,
      center.y - earthR * 0.3,
      earthR * 0.5,
      center.x,
      center.y,
      earthR * 2.5,
    );
    waterGrad.addColorStop(0, state.showOcean ? "rgba(137, 220, 225, 0.26)" : "rgba(137, 220, 225, 0)");
    waterGrad.addColorStop(0.72, "rgba(41, 154, 190, 0.5)");
    waterGrad.addColorStop(1, "rgba(207, 245, 244, 0.36)");
    ctx.fillStyle = waterGrad;
    ctx.fill();
    ctx.restore();

    const earthGrad = ctx.createRadialGradient(
      center.x - earthR * 0.3,
      center.y - earthR * 0.35,
      earthR * 0.08,
      center.x,
      center.y,
      earthR * 1.05,
    );
    earthGrad.addColorStop(0, "#9cd6d2");
    earthGrad.addColorStop(0.46, "#3f94a9");
    earthGrad.addColorStop(0.86, "#1f5d79");
    earthGrad.addColorStop(1, "#174052");
    ctx.fillStyle = earthGrad;
    ctx.beginPath();
    ctx.arc(center.x, center.y, earthR, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(center.x, center.y, earthR, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = "rgba(226, 246, 240, 0.22)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]);
    for (let ring = 0.45; ring < 1; ring += 0.18) {
      ctx.beginPath();
      ctx.arc(center.x, center.y, earthR * ring, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.rotate(-state.earthRotationDeg * DEG);
    for (let i = 0; i < 8; i += 1) {
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(center.x + Math.cos((i * 45 * Math.PI) / 180) * earthR, center.y + Math.sin((i * 45 * Math.PI) / 180) * earthR);
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = "rgba(244, 240, 220, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(center.x, center.y, earthR, 0, Math.PI * 2);
    ctx.stroke();

    if (state.showLowRing) {
      const lowRadius = earthR * (1.18 + Math.min(0.2, amp * 1.2));
      ctx.strokeStyle = "rgba(223, 164, 245, 0.72)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 8]);
      ctx.lineDashOffset = -(state.elapsed ?? 0) * 22;
      ctx.beginPath();
      ctx.arc(center.x, center.y, lowRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    }

    if (state.showBulges) {
      const highRadius = earthR * (1.54 + Math.min(0.18, amp * 1.5));
      const highAngle = state.moonAngleDeg * DEG;
      const high = {
        x: center.x + Math.cos(highAngle) * highRadius,
        y: center.y - Math.sin(highAngle) * highRadius,
      };
      const low = {
        x: center.x - Math.cos(highAngle) * highRadius,
        y: center.y + Math.sin(highAngle) * highRadius,
      };
      const markerR = Math.max(3, earthR * 0.055);
      [high, low].forEach((point, index) => {
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(state.moonAngleDeg * DEG + (index === 1 ? Math.PI : 0));
        const pulse = 0.5 + Math.sin((state.elapsed ?? 0) * 4.2 + index * 2.3) * 0.5;
        ctx.fillStyle = `rgba(245, 189, 107, ${0.25 + pulse * 0.25})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, markerR * (1.9 + pulse * 0.5), markerR * (0.95 + pulse * 0.3), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = index === 1 ? "#ffd98a" : "#f5bd6b";
        ctx.beginPath();
        ctx.arc(0, 0, markerR * (0.82 + pulse * 0.16), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    const moonGrad = ctx.createRadialGradient(
      moonPos.x - 5,
      moonPos.y - 5,
      1,
      moonPos.x,
      moonPos.y,
      scale * 0.2,
    );
    moonGrad.addColorStop(0, "#fbf4df");
    moonGrad.addColorStop(0.7, "#cbc4ae");
    moonGrad.addColorStop(1, "#77746a");
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(moonPos.x, moonPos.y, scale * 0.18, 0, Math.PI * 2);
    ctx.fill();

    if (state.showBulges) {
      const highRadius = earthR * (1.78 + Math.min(0.2, amp * 1.7));
      const highAngle = state.moonAngleDeg * DEG;
      const near = {
        x: center.x + Math.cos(highAngle) * highRadius,
        y: center.y - Math.sin(highAngle) * highRadius,
      };
      const far = {
        x: center.x - Math.cos(highAngle) * highRadius,
        y: center.y + Math.sin(highAngle) * highRadius,
      };
      ctx.font = '11px "Microsoft YaHei", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      this.drawLabel(ctx, near.x, near.y, "向月高潮", "#f7d69d");
      this.drawLabel(ctx, far.x, far.y, "背月高潮", "#f7d69d");
    }

    ctx.font = '12px "Microsoft YaHei", sans-serif';
    this.drawLabel(ctx, moonPos.x, moonPos.y - scale * 0.33, "月球", "#ffe3b0");
    this.drawLabel(ctx, center.x, center.y - earthR - 18, "地球", "#c8ece8");

    if (state.showLowRing) {
      const lowAngle = (state.moonAngleDeg + 90) * DEG;
      const lowRadius = earthR * (1.24 + Math.min(0.2, amp * 1.2));
      const lowPos = {
        x: center.x + Math.cos(lowAngle) * lowRadius,
        y: center.y - Math.sin(lowAngle) * lowRadius,
      };
      this.drawLabel(ctx, lowPos.x, lowPos.y, "低潮环", "#e5b8f3");
    }
  }

  drawLabel(ctx, x, y, text, color) {
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }
}
