import { lowerLip, makeCanvas } from "./wine-photo.js";

const clamp = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const mix = (a, b, progress) => a + (b - a) * progress;
const random = (seed) => {
  const value = Math.sin(seed * 244.93 + 7.13) * 43758.5453;
  return value - Math.floor(value);
};

function dropletSprite(red, edge) {
  const sprite = makeCanvas(32, 32);
  const ctx = sprite.getContext("2d");
  const fill = ctx.createRadialGradient(11, 9, 0, 16, 16, 17);
  fill.addColorStop(0, edge);
  fill.addColorStop(.24, red);
  fill.addColorStop(.59, "#631324");
  fill.addColorStop(.82, "#350914");
  fill.addColorStop(1, "#c96952");
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(16, 16, 14.5, 13.8, -.16, 0, 2 * Math.PI);
  ctx.fill();
  return sprite;
}

const wineDrop = dropletSprite("#b73b53", "#df8890");
const litDrop = dropletSprite("#ad3446", "#ffe1ad");

export function sampleGreeting(title, bounds) {
  const rect = title.getBoundingClientRect();
  const style = getComputedStyle(title);
  const size = parseFloat(style.fontSize);
  const surface = makeCanvas(Math.ceil(rect.width + 44), Math.ceil(size * 1.4));
  const ctx = surface.getContext("2d", { willReadFrequently: true });
  const originX = rect.left - bounds.left + (rect.width - surface.width) / 2;
  const originY = rect.top - bounds.top + rect.height / 2 - surface.height / 2;
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = style.letterSpacing;
  const regular = `500 ${size}px ${style.fontFamily}`;
  const italic = `italic 400 ${size}px ${style.fontFamily}`;
  const firstWord = title.firstChild.textContent;
  const lastWord = title.querySelector("em").textContent;
  ctx.font = regular;
  const advance = ctx.measureText(firstWord).width;
  ctx.font = italic;
  const start = (surface.width - advance - ctx.measureText(lastWord).width) / 2;
  const baseline = surface.height * .67;
  ctx.font = regular;
  ctx.fillText(firstWord, start, baseline);
  ctx.font = italic;
  ctx.fillText(lastWord, start + advance, baseline);
  const pixels = ctx.getImageData(0, 0, surface.width, surface.height).data;
  const step = size > 95 ? 5 : 3;
  const points = [];

  for (let y = 1; y < surface.height; y += step) {
    for (let x = 1; x < surface.width; x += step) {
      if (pixels[(y * surface.width + x) * 4 + 3] > 125) {
        const arrival = .63 + .33 * clamp((x + surface.width * .12 - (y - surface.height / 2) * .58) / (surface.width * 1.31));
        points.push({ x: originX + x, y: originY + y, arrival });
      }
    }
  }

  return {
    x: originX, y: originY, mask: surface,
    ink: makeCanvas(surface.width, surface.height),
    points: points.map((point, index) => ({
      ...point,
      angle: random(index + 2) * Math.PI * 2,
      radius: random(index + 9) * 1.02 + .56,
      speed: random(index + 15),
      shine: index % 9 === 0,
    })),
  };
}

export function drawGreeting(ctx, greeting, time) {
  if (time < .62) return;
  const { x, y, mask, ink } = greeting;
  const { width, height } = ink;
  const paint = ink.getContext("2d");
  paint.clearRect(0, 0, width, height);

  const reach = clamp((time - .63) / .33) * 1.31 * width - width * .12;
  const feather = Math.max(16, width * .034);
  // The moving meniscus passes through the same glyph mask the droplets settle into.
  for (let row = 0; row < height; row += 4) {
    const edge = reach + (row - height / 2) * .58 + Math.sin(row * .083 - time * 10) * height * .043;
    const wash = paint.createLinearGradient(edge - feather * 2.8, 0, edge + feather, 0);
    wash.addColorStop(0, "#f2bc9f");
    wash.addColorStop(.48, "#c36566");
    wash.addColorStop(.72, "#96384f");
    wash.addColorStop(.82, "#d58076cc");
    wash.addColorStop(1, "#64183000");
    paint.fillStyle = wash;
    paint.fillRect(0, row, width, 4);
  }
  paint.globalCompositeOperation = "destination-in";
  paint.drawImage(mask, 0, 0);
  paint.globalCompositeOperation = "source-over";

  ctx.save();
  ctx.globalAlpha = smooth((time - .62) / .09);
  ctx.shadowColor = "#a7364282";
  ctx.shadowBlur = 11;
  ctx.drawImage(ink, x, y);
  ctx.restore();
}

function flight(origin, age, width, height, speed, lift) {
  return {
    x: origin.x - width * speed * (age - .17 * age * age),
    y: origin.y - height * lift * age + height * 1.68 * age * age,
  };
}

function paintFilm(ctx, width, height, time, poseAt, strand, release) {
  const first = release + strand * .017;
  const end = release + .204 - strand * .013;
  const last = Math.min(time, end);
  if (last <= first) return;
  const film = [];
  const duration = last - first;
  for (let i = 0; i <= 23; i++) {
    const birth = last - duration * i / 23;
    const pose = poseAt(birth);
    const age = time - birth;
    if (age > .3 + strand * .027) break;
    const origin = lowerLip(pose);
    origin.x += strand * 4 * pose.scale;
    const speed = .73 + strand * .11 + .085 * Math.sin(birth * 59);
    const lift = .27 + strand * .095 + .07 * Math.sin(birth * 36 + strand);
    const drop = flight(origin, age, width, height, speed, lift);
    const swell = .55 + .24 * Math.sin(birth * 84 + strand) + .14 * Math.cos(birth * 191);
    const rim = Math.min(1, (birth - first) * 32, (end - birth) * 24);
    const radius = Math.max(.4, pose.scale * (28 - strand * 8) * swell * rim * (1 - age * 2.8));
    film.push({ ...drop, radius });
  }
  if (film.length < 2) return;

  const head = film[0];
  const tail = film.at(-1);
  const path = new Path2D();
  const edge = new Path2D();
  for (let i = 0; i < film.length; i++) {
    const point = film[i];
    if (i === 0) {
      path.moveTo(point.x, point.y - point.radius);
      edge.moveTo(point.x, point.y - point.radius * .7);
    } else {
      path.lineTo(point.x, point.y - point.radius);
      edge.lineTo(point.x, point.y - point.radius * .7);
    }
  }
  for (let i = film.length - 1; i >= 0; i--) {
    const point = film[i];
    path.lineTo(point.x, point.y + point.radius);
  }
  path.closePath();

  const pigment = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
  pigment.addColorStop(0, "#3f091ae9");
  pigment.addColorStop(.15, "#84162adb");
  pigment.addColorStop(.44, "#bd4054b0");
  pigment.addColorStop(.57, "#4a0b22cb");
  pigment.addColorStop(.76, "#88293cba");
  pigment.addColorStop(1, "#cc675a66");

  ctx.globalAlpha = .88 * (1 - smooth((time - .56) / .23));
  ctx.fillStyle = pigment;
  ctx.fill(path);
  ctx.save();
  ctx.clip(path);
  ctx.strokeStyle = "#e8a0867c";
  ctx.lineWidth = Math.max(.55, width / 1700);
  ctx.stroke(edge);
  ctx.restore();
}

const airborne = Array.from({ length: 165 }, (_, i) => ({
  start: random(i + 307) * .214,
  speed: .32 + random(i + 509) * 1.04,
  lift: -.09 + random(i + 719) * .69,
  radius: .6 + random(i + 611) ** 2.15 * 6.8,
  shine: i % 4 === 0,
}));

function paintDroplet(ctx, drop, point, opacity, radius, speed) {
  const horizontal = radius * (1 + speed * .53);
  ctx.globalAlpha = opacity;
  ctx.drawImage(drop.shine ? litDrop : wineDrop, point.x - horizontal, point.y - radius, horizontal * 2, radius * 2);
}

export function drawSpill(ctx, points, width, height, time, poseAt, release) {
  if (time < release || time >= .989) return;
  for (let strand = 2; strand >= 0; strand--) paintFilm(ctx, width, height, time, poseAt, strand, release);
  const flightFade = 1 - smooth((time - .56) / .29);
  const size = Math.min(1.16, Math.max(.58, height / 850));

  if (flightFade > 0) {
    for (const drop of airborne) {
      const birth = release + drop.start;
      const age = time - birth;
      if (age <= 0) continue;
      const source = lowerLip(poseAt(birth));
      const spot = flight(source, age, width, height, drop.speed, drop.lift);
      const alpha = flightFade * smooth(age * 46) * (.6 + drop.radius / 23);
      paintDroplet(ctx, drop, spot, alpha, drop.radius * size, drop.speed);
    }
  }

  if (time > .45) {
    const map = airborne.map((drop) => ({ ...drop, origin: lowerLip(poseAt(release + drop.start)) }));
    for (let i = 0; i < points.length; i++) {
      const letter = points[i];
      const drop = map[i % map.length];
      const arrival = letter.arrival;
      const gather = smooth((time - arrival + .235) / .235);
      if (gather <= 0) continue;
      const ballistic = flight(drop.origin, Math.max(0, time - release - drop.start), width, height, drop.speed, drop.lift);
      const offset = (1 - gather) * (1.5 + letter.speed * 12);
      const spot = {
        x: mix(ballistic.x, letter.x, gather) + Math.cos(letter.angle) * offset,
        y: mix(ballistic.y, letter.y, gather) + Math.sin(letter.angle) * offset,
      };
      const fade = 1 - smooth((time - arrival + .013) / .15);
      paintDroplet(ctx, letter, spot, fade * Math.min(1, gather * 2.4), letter.radius * (1.48 - gather * .42), 1 - gather);
    }
  }
  ctx.globalAlpha = 1;
}
