const FRAME = { width: 720, height: 1000 };
const GLASS = { x: 222, y: 276, width: 302, height: 705 };
export const bowlCenter = { x: 374, y: 454 };
const rim = [{ x: -106, y: -172 }, { x: 99, y: -173 }];
const bowl = [
  rim[0], { x: -116, y: -133 }, { x: -126, y: -92 },
  { x: -137, y: -40 }, { x: -139, y: 7 }, { x: -132, y: 53 },
  { x: -111, y: 99 }, { x: -83, y: 132 }, { x: -54, y: 154 },
  { x: -28, y: 168 }, { x: 0, y: 173 }, { x: 31, y: 165 },
  { x: 65, y: 147 }, { x: 94, y: 118 }, { x: 118, y: 82 },
  { x: 132, y: 39 }, { x: 134, y: -8 }, { x: 125, y: -61 },
  { x: 113, y: -111 }, rim[1],
];
const bowlOutline = new Path2D(
  "M-106 -172 Q0 -182 99 -173 C110 -129 129 -63 134 -8 " +
  "C143 73 87 158 10 172 C-67 187 -146 101 -139 7 " +
  "C-136 -63 -118 -128 -106 -172Z",
);

export function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function sizeCanvas(canvas, width, height) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function photoPlacement(frame, heroBounds) {
  const bounds = frame.getBoundingClientRect();
  const scale = Math.min(bounds.width / FRAME.width, bounds.height / FRAME.height);
  const style = getComputedStyle(frame);
  const x = (bounds.width - FRAME.width * scale) * parseFloat(style.getPropertyValue("--photo-x")) / 100;
  const y = (bounds.height - FRAME.height * scale) * parseFloat(style.getPropertyValue("--photo-y")) / 100;
  return { x: bounds.left - heroBounds.left + x, y: bounds.top - heroBounds.top + y, scale };
}

export async function loadGlassAssets() {
  const load = async (name) => {
    const image = new Image();
    image.src = `./media/${name}.webp`;
    await image.decode();
    return image;
  };
  const [reflection, wine] = await Promise.all([load("wine-glass"), load("wine-texture")]);
  const glass = makeCanvas(GLASS.width, GLASS.height);
  const ctx = glass.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(reflection, 0, 0);
  const frame = ctx.getImageData(0, 0, GLASS.width, GLASS.height);
  const { data } = frame;
  for (let i = 0; i < data.length; i += 4) {
    const intensity = Math.max(data[i], data[i + 1], data[i + 2]);
    const alpha = Math.max(0, intensity - 3);
    data[i + 3] = alpha;
    if (!alpha) continue;
    for (let channel = 0; channel < 3; channel++) data[i + channel] *= 255 / intensity;
  }
  ctx.putImageData(frame, 0, 0);
  return { glass, wine };
}

function polygonArea(vertices) {
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    area += a.x * b.y - a.y * b.x;
  }
  return Math.abs(area) * .5;
}

const bowlArea = polygonArea(bowl);

// Clip the cross-section against the liquid's free surface in world coordinates.
function areaBelow(vertices, surface) {
  const submerged = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const aBelow = a.y >= surface;
    if (aBelow) submerged.push(a);
    if (aBelow !== (b.y >= surface)) {
      const t = (surface - a.y) / (b.y - a.y);
      submerged.push({ x: a.x + (b.x - a.x) * t, y: surface });
    }
  }
  return polygonArea(submerged);
}

function tiltedBowl(angle) {
  const sine = Math.sin(angle);
  const cosine = Math.cos(angle);
  const vertices = bowl.map(({ x, y }) => ({ x: x * cosine - y * sine, y: x * sine + y * cosine }));
  const lip = Math.max(...rim.map(({ x, y }) => x * sine + y * cosine));
  return { vertices, lip };
}

export function willOverflow(angle, fill) {
  const { vertices, lip } = tiltedBowl(angle);
  return areaBelow(vertices, lip) < bowlArea * fill;
}

function freeSurface(angle, fill) {
  const { vertices, lip } = tiltedBowl(angle);
  let low = Math.min(...vertices.map((point) => point.y));
  let high = Math.max(...vertices.map((point) => point.y));
  const desired = bowlArea * fill;
  for (let i = 0; i < 11; i++) {
    const midway = (low + high) * .5;
    if (areaBelow(vertices, midway) > desired) low = midway;
    else high = midway;
  }
  return Math.max(lip - 3, (low + high) * .5);
}

export function lowerLip(pose) {
  const { x, y, angle, scale } = pose;
  const point = angle < 0 ? rim[0] : rim[1];
  const sine = Math.sin(angle);
  const cosine = Math.cos(angle);
  return {
    x: x + (point.x * cosine - point.y * sine) * scale,
    y: y + (point.x * sine + point.y * cosine) * scale,
  };
}

function drawWine(ctx, texture, pose) {
  const { angle, fill, time } = pose;
  const slosh = Math.sin(time * 31) * .105 * Math.exp(-2.8 * time);
  const surfaceAngle = angle - slosh;
  const waterline = freeSurface(surfaceAngle, fill);
  const amplitude = 3 + Math.sin(time * 11 + .4) ** 2 * 6 * Math.exp(-2 * time);
  const line = new Path2D();
  for (let x = -240; x <= 240; x += 6) {
    const wave = Math.sin(x * .045 - time * 39) + .36 * Math.sin(x * .098 + time * 25);
    const y = waterline + wave * amplitude;
    if (x === -240) line.moveTo(x, y);
    else line.lineTo(x, y);
  }
  const liquid = new Path2D(line);
  liquid.lineTo(240, 255);
  liquid.lineTo(-240, 255);
  liquid.closePath();

  ctx.save();
  ctx.clip(bowlOutline);
  ctx.rotate(-surfaceAngle);
  const body = ctx.createLinearGradient(0, waterline, 0, waterline + 150);
  body.addColorStop(0, "#9a2a3cec");
  body.addColorStop(.13, "#531023f2");
  body.addColorStop(.39, "#340715fa");
  body.addColorStop(.77, "#21070f");
  body.addColorStop(1, "#5f1526");
  ctx.fillStyle = body;
  ctx.fill(liquid);
  ctx.save();
  ctx.clip(liquid);
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha *= .64;
  ctx.drawImage(texture, -169 + Math.sin(time * 15) * 16, waterline - 8, 338, 115);
  ctx.restore();

  ctx.strokeStyle = "#bc65717e";
  ctx.lineWidth = 2.55;
  ctx.stroke(line);
  ctx.strokeStyle = "#ffcaaf59";
  ctx.lineWidth = .9;
  ctx.translate(0, -1.8);
  ctx.stroke(line);
  ctx.restore();
}

export function drawGlass(ctx, assets, pose) {
  const { x, y, scale, angle, opacity } = pose;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = "screen";
  ctx.drawImage(assets.glass, GLASS.x - bowlCenter.x, GLASS.y - bowlCenter.y);
  ctx.globalCompositeOperation = "source-over";
  drawWine(ctx, assets.wine, pose);
  ctx.restore();
}
