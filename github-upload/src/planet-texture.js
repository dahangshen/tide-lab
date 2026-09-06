const WIDTH = 1024;
const HEIGHT = 512;

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function projectPoint(ctx, lon, lat) {
  const x = ((lon + 180) / 360) * WIDTH;
  const y = ((90 - lat) / 180) * HEIGHT;
  return { x, y };
}

function tracePolygon(ctx, points, close = true) {
  ctx.beginPath();
  points.forEach(([lon, lat], index) => {
    const { x, y } = projectPoint(ctx, lon, lat);
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  if (close) {
    ctx.closePath();
  }
}

const CONTINENTS = [
  [
    [-169, 65], [-166, 72], [-154, 71], [-139, 70], [-123, 70], [-108, 72], [-94, 73],
    [-76, 73], [-63, 67], [-56, 61], [-53, 53], [-55, 47], [-62, 43], [-67, 45],
    [-66, 43], [-71, 38], [-77, 33], [-80, 27], [-81, 23], [-86, 25], [-88, 30],
    [-91, 29], [-94, 24], [-97, 20], [-101, 20], [-104, 22], [-108, 25], [-116, 31],
    [-121, 36], [-124, 40], [-124, 45], [-128, 50], [-134, 57], [-141, 61], [-149, 64],
    [-159, 62], [-166, 57], [-169, 65],
  ],
  [
    [-76, 8], [-68, 11], [-59, 8], [-50, 4], [-43, 1], [-36, -8], [-37, -13],
    [-40, -21], [-42, -29], [-47, -38], [-53, -43], [-60, -47], [-67, -52],
    [-72, -55], [-75, -52], [-73, -43], [-70, -35], [-66, -28], [-62, -21],
    [-57, -12], [-53, -5], [-55, -7], [-62, -4], [-70, -3], [-76, 1], [-76, 8],
  ],
  [
    [-16, 16], [-17, 23], [-14, 29], [-8, 33], [-5, 36], [1, 37], [10, 37],
    [19, 32], [31, 31], [35, 29], [41, 20], [43, 12], [46, 9], [43, 1],
    [39, -7], [33, -15], [29, -24], [24, -32], [18, -34], [13, -23], [8, -8],
    [4, 5], [-7, 4], [-14, 9], [-16, 16],
  ],
  [
    [-10, 36], [-9, 43], [-5, 48], [3, 51], [7, 54], [4, 57], [8, 58], [10, 61],
    [16, 67], [26, 70], [37, 67], [47, 58], [51, 54], [48, 47], [42, 41],
    [33, 45], [27, 44], [20, 42], [13, 43], [5, 44], [-2, 42], [-10, 39], [-10, 36],
  ],
  [
    [45, 45], [52, 54], [60, 59], [68, 70], [82, 73], [95, 75], [111, 76],
    [127, 74], [142, 72], [153, 70], [166, 68], [178, 65], [179, 60], [171, 60],
    [162, 54], [153, 54], [145, 49], [141, 45], [136, 40], [130, 35], [124, 31],
    [119, 33], [113, 30], [109, 29], [110, 20], [105, 12], [100, 7], [95, 10],
    [90, 20], [83, 29], [76, 25], [72, 20], [69, 27], [65, 31], [61, 34],
    [55, 40], [51, 45], [47, 46], [45, 45],
  ],
  [
    [69, 8], [72, 18], [76, 27], [82, 24], [88, 20], [90, 14], [85, 10],
    [80, 8], [75, 11], [70, 7], [69, 8],
  ],
  [
    [94, 17], [98, 12], [102, 5], [107, 5], [108, 9], [104, 15], [108, 18],
    [112, 15], [116, 9], [121, 4], [126, 7], [129, 12], [127, 18], [121, 20],
    [116, 22], [109, 23], [103, 18], [98, 20], [94, 17],
  ],
  [
    [114, -21], [121, -18], [128, -13], [135, -13], [140, -17], [145, -20],
    [149, -22], [152, -27], [153, -35], [149, -40], [143, -39], [136, -35],
    [129, -32], [122, -33], [116, -35], [114, -31], [115, -26], [114, -21],
  ],
  [
    [-71, 77], [-59, 80], [-42, 75], [-31, 70], [-31, 64], [-40, 61],
    [-51, 61], [-61, 65], [-68, 68], [-72, 71], [-71, 77],
  ],
];

const ISLANDS = [
  [-20, 64], [-16, 67], [-14, 68], [-6, 62], [25, 35], [27, 37], [33, 36],
  [35, 34], [36, 35], [38, 36], [35, 39], [34, 42], [42, 44], [141, 40],
  [142, 44], [145, 45], [147, 45], [142, 39], [140, 42], [172, 53], [178, 51],
  [160, 56], [157, 51], [166, 58], [-61, 46], [-55, 47], [-51, 46], [-73, 42],
  [-96, 72], [-88, 70], [-118, 59], [-121, 51], [-130, 54], [-143, 52],
  [-74, 70], [-85, 76], [-80, 79], [-73, 76],
];

function drawLand(canvas) {
  const ctx = canvas.getContext("2d");
  const sea = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  sea.addColorStop(0, "#4a9da8");
  sea.addColorStop(0.5, "#377d97");
  sea.addColorStop(1, "#2b607f");
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  CONTINENTS.forEach((points, index) => {
    tracePolygon(ctx, points);
    const shade = index % 3;
    const fills = ["#76ad72", "#92b36f", "#7baa6b"];
    ctx.fillStyle = fills[shade];
    ctx.fill();
    ctx.strokeStyle = "rgba(40, 83, 70, 0.34)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  });

  ctx.fillStyle = "#93b57a";
  ISLANDS.forEach(([lon, lat]) => {
    const { x, y } = projectPoint(ctx, lon, lat);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  const accents = [
    [-122, 50], [-100, 38], [-72, 45], [-52, 42], [-58, 22], [-44, -23],
    [-64, -35], [2, 20], [30, 30], [10, 8], [27, 13], [43, 17], [52, 53],
    [60, 60], [95, 70], [115, 58], [106, 36], [90, 35], [78, 26], [95, 23],
    [114, 28], [140, 48], [136, 45], [135, 60], [147, 20], [151, -22], [142, -30],
  ];
  ctx.strokeStyle = "rgba(248, 222, 164, 0.22)";
  ctx.lineWidth = 5;
  accents.forEach(([lon, lat]) => {
    const { x, y } = projectPoint(ctx, lon, lat);
    ctx.beginPath();
    ctx.moveTo(x - 22, y - 5);
    ctx.quadraticCurveTo(x - 8, y + 9, x + 16, y - 3);
    ctx.quadraticCurveTo(x + 24, y - 9, x + 34, y - 4);
    ctx.stroke();
  });

  const cloud = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  cloud.addColorStop(0, "rgba(250, 255, 246, 0.09)");
  cloud.addColorStop(0.5, "rgba(248, 255, 252, 0.04)");
  cloud.addColorStop(1, "rgba(250, 255, 246, 0.11)");
  ctx.fillStyle = cloud;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

export function makeEarthCanvas(size = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  drawLand(canvas);
  if (size === WIDTH) {
    return canvas;
  }
  const out = document.createElement("canvas");
  out.width = size;
  out.height = size / 2;
  const ctx = out.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}

export function makeMoonCanvas(size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const rand = mulberry32(321);
  const center = size / 2;

  const grad = ctx.createRadialGradient(
    center - size * 0.16,
    center - size * 0.2,
    size * 0.05,
    center,
    center,
    size * 0.6,
  );
  grad.addColorStop(0, "#f6f2e8");
  grad.addColorStop(0.62, "#d8d2c1");
  grad.addColorStop(1, "#9b978d");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const maria = [
    [0.28, 0.24, 0.09], [0.69, 0.28, 0.12], [0.74, 0.55, 0.08],
    [0.24, 0.61, 0.1], [0.48, 0.74, 0.12], [0.55, 0.4, 0.07],
  ];
  maria.forEach(([x, y, radius]) => {
    ctx.beginPath();
    ctx.ellipse(x * size, y * size, radius * size, radius * size * 0.78, x, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(116, 115, 107, 0.2)";
    ctx.fill();
  });

  for (let i = 0; i < 420; i += 1) {
    const angle = rand() * Math.PI * 2;
    const radius = size * (0.11 + rand() * 0.48);
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    const craterRadius = 1 + rand() * size * (0.006 + rand() * 0.018);
    const dark = rand() > 0.48;
    ctx.beginPath();
    ctx.arc(x, y, craterRadius, 0, Math.PI * 2);
    ctx.fillStyle = dark
      ? `rgba(92, 90, 82, ${0.12 + rand() * 0.2})`
      : `rgba(245, 242, 231, ${0.08 + rand() * 0.18})`;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(center, center, size * 0.485, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(71, 67, 57, 0.36)";
  ctx.lineWidth = 5;
  ctx.stroke();
  return canvas;
}

export function makeGlowCanvas(size = 128, color = "255, 226, 170") {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, `rgba(${color}, 0.85)`);
  g.addColorStop(0.24, `rgba(${color}, 0.32)`);
  g.addColorStop(1, `rgba(${color}, 0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}
