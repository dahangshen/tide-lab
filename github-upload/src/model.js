export const DEG = Math.PI / 180;
export const DEFAULT_MOON_DISTANCE = 5;
export const MOON_DISTANCE_KM_SCALE = 77000;
export const OCEAN_MEAN_RADIUS = 1.025;
export const TIDE_BASE_AMPLITUDE = 0.045;
export const MAX_TIDE_AMPLITUDE = 0.135;

export function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

export function norm360(value) {
  return ((value % 360) + 360) % 360;
}

export function makeDefaultState() {
  return {
    mode: "3d",
    playing: true,
    simSpeed: 1,
    earthSpin: true,
    moonOrbit: true,
    elapsed: 0,
    earthRotationDeg: 0,
    moonAngleDeg: 0,
    moonDistance: DEFAULT_MOON_DISTANCE,
    tideStrength: 1.6,
    waveStrength: 1,
    showOcean: true,
    showBulges: true,
    showLowRing: true,
    showLabels: true,
  };
}

export function moonDistanceKm(distanceUnits) {
  return Math.round(distanceUnits * MOON_DISTANCE_KM_SCALE);
}

export function moonDirection(moonAngleDeg) {
  const a = moonAngleDeg * DEG;
  return {
    x: Math.cos(a),
    y: 0,
    z: Math.sin(a),
  };
}

export function tideCoefficient(cosAngle) {
  const c = clamp(cosAngle, -1, 1);
  return (3 * c * c - 1) / 2;
}

export function waterSurfaceRadius(coefficient, amplitude) {
  const amp = clamp(amplitude, 0, MAX_TIDE_AMPLITUDE);
  return OCEAN_MEAN_RADIUS + amp * 0.7 + coefficient * amp;
}

export function visualAmplitude(state) {
  const distanceFactor = Math.pow(DEFAULT_MOON_DISTANCE / state.moonDistance, 3);
  return clamp(
    state.tideStrength * TIDE_BASE_AMPLITUDE * distanceFactor,
    0.004,
    MAX_TIDE_AMPLITUDE,
  );
}

export function waterWaveHeight(lat, lon, elapsed, strength) {
  const slow = Math.sin(lon * 7 + elapsed * 3.1) * Math.cos(lat * 9 + elapsed * 1.4);
  const middle = Math.sin(lon * 14 - lat * 5 - elapsed * 4.7) * 0.45;
  const fast = Math.sin((lon + lat) * 11 + elapsed * 2.3) * 0.24;
  return ((slow + middle + fast) / 1.69) * strength;
}

export function distanceFactor(state) {
  return Math.pow(DEFAULT_MOON_DISTANCE / state.moonDistance, 3);
}

export function oceanCosAt(latDeg, lonDeg, state) {
  const latRad = latDeg * DEG;
  const worldLon = lonDeg + state.earthRotationDeg;
  const lonDiff = (worldLon - state.moonAngleDeg) * DEG;
  return Math.cos(latRad) * Math.cos(lonDiff);
}

export function formatKm(value) {
  return value.toLocaleString("zh-CN");
}

export function signedCoefficientText(coefficient) {
  const value = coefficient >= 0 ? `+${coefficient.toFixed(2)}` : coefficient.toFixed(2);
  return value;
}
