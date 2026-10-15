// The homepage hero's particle layers, ported from the style board. The hero is a dark stage in both themes.
import { rng } from "./scene";

export type StageColors = { bg: string; fg: string; accent: string };

// Back layer: a faint accent glow behind the portrait and a sky of small stars in the upper part.
export function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number, colors: StageColors, seed: number) {
  const r = rng(seed + 300);
  const glow = ctx.createRadialGradient(w / 2, h * 0.62, 0, w / 2, h * 0.62, Math.max(w, h) * 0.6);
  glow.addColorStop(0, colors.accent);
  glow.addColorStop(1, colors.bg);
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = colors.fg;
  for (let i = 0; i < 320; i++) {
    const x = r() * w, y = r() * h * 0.7, s = r() < 0.92 ? 1 : 1.8;
    ctx.globalAlpha = 0.12 + r() * 0.4;
    ctx.fillRect(x, y, s, s);
  }
  ctx.globalAlpha = 1;
}

// Front layer: a few large, glowing motes that move fastest with the pointer.
export function drawDust(ctx: CanvasRenderingContext2D, w: number, h: number, colors: StageColors, seed: number) {
  const r = rng(seed + 700);
  ctx.shadowColor = colors.accent;
  ctx.shadowBlur = 8;
  for (let i = 0; i < 70; i++) {
    const x = r() * w, y = r() * h, rad = 0.8 + Math.pow(r(), 2) * 3.4;
    ctx.fillStyle = r() < 0.55 ? colors.accent : colors.fg;
    ctx.globalAlpha = 0.25 + r() * 0.45;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// Every particle sits on a damped spring around its home position; the cursor pushes it away.
type Sprung = { ox: number; oy: number; vx: number; vy: number };
export type HaloParticle = Sprung & { th: number; rad: number; sp: number; s: number; a: number; ph: number };
export type RimParticle = Sprung & { u: number; v: number; s: number; a: number; ph: number };
type Point = { u: number; v: number };

const rest = (): Sprung => ({ ox: 0, oy: 0, vx: 0, vy: 0 });

// 900 particles orbiting head and shoulders at slightly different radii and speeds.
export function createHalo(): HaloParticle[] {
  const r = rng(91), out: HaloParticle[] = [];
  for (let i = 0; i < 900; i++) {
    const rad = 1 + Math.pow(r(), 1.8) * 0.9;
    out.push({
      th: r() * Math.PI * 2,
      rad,
      sp: ((0.04 + r() * 0.08) * (r() < 0.5 ? -1 : 1)) / rad,
      s: 0.7 + r() * 1.6,
      a: (0.25 + r() * 0.6) * (1.6 - rad * 0.6),
      ph: r() * Math.PI * 2,
      ...rest(),
    });
  }
  return out;
}

// Up to 700 particles on the portrait's lit edges: bright pixels with a strong brightness gradient,
// inside an ellipse around the head and shoulders.
export function sampleRim(img: HTMLImageElement, face: Point): RimParticle[] {
  const W = 210, H = Math.round((W * img.naturalHeight) / img.naturalWidth);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  if (!g) return [];
  g.drawImage(img, 0, 0, W, H);
  const px = g.getImageData(0, 0, W, H).data, L = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) L[i] = px[i * 4] / 255;
  const r = rng(77), out: RimParticle[] = [];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const u = x / W, v = y / H;
      if (v > 0.78 || ((u - face.u) / 0.3) ** 2 + ((v - 0.5) / 0.5) ** 2 > 1) continue;
      const gx = L[y * W + x + 1] - L[y * W + x - 1], gy = L[(y + 1) * W + x] - L[(y - 1) * W + x];
      if (Math.hypot(gx, gy) > 0.16 && L[y * W + x] > 0.28) {
        out.push({ u, v, s: 0.8 + r() * 1.1, a: 0.35 + r() * 0.5, ph: r() * Math.PI * 2, ...rest() });
      }
    }
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, 700);
}

export type AuraFrame = {
  colors: StageColors;
  halo: HaloParticle[];
  rim: RimParticle[];
  box: { x: number; y: number; w: number; h: number }; // the portrait, in canvas px
  face: Point;
  origin: Point; // the portrait's transform-origin
  zoom: { s: number; x: number; y: number }; // the portrait's current scale and lean
  cursor: { x: number; y: number } | null;
  dt: number; // seconds since the last frame; 0 draws a still frame
  active: number; // open corner card, -1 for none
  glow: number[]; // per-corner light-up, eased toward the active card
  leader: { x: number; y: number } | null; // where the open card's leader line starts
  now: number;
};

// Particles are drawn in batches that share a color and one of 32 alpha levels: one fill per batch, instead of an
// alpha change and a fillRect per particle (about 1,600 a frame). Each batch is x, y, size triples, reused.
const LEVELS = 32;
const plainBatches: number[][] = Array.from({ length: LEVELS }, () => []);
const litBatches: number[][] = Array.from({ length: LEVELS }, () => []);
function batch(batches: number[][], x: number, y: number, s: number, a: number) {
  batches[Math.min(LEVELS - 1, Math.floor(a * LEVELS))].push(x - s / 2, y - s / 2, s);
}
function flush(ctx: CanvasRenderingContext2D, batches: number[][], color: string) {
  ctx.fillStyle = color;
  for (let level = 0; level < LEVELS; level++) {
    const b = batches[level];
    if (!b.length) continue;
    ctx.globalAlpha = (level + 0.5) / LEVELS;
    ctx.beginPath();
    for (let i = 0; i < b.length; i += 3) ctx.rect(b[i], b[i + 1], b[i + 2], b[i + 2]);
    ctx.fill();
    b.length = 0;
  }
}

// The halo and rim particles; those in the open card's quarter turn accent, with a dashed leader line to the card.
export function drawAura(ctx: CanvasRenderingContext2D, w: number, h: number, f: AuraFrame) {
  for (let i = 0; i < 4; i++) {
    const target = i === f.active ? 1 : 0;
    f.glow[i] = f.dt ? f.glow[i] + (target - f.glow[i]) * Math.min(1, f.dt * 5) : target;
  }
  const { box, zoom } = f;
  if (!box.w) return;
  // Follow the portrait's zoom and lean so rim particles stay on its edges.
  const ox = box.x + box.w * f.origin.u, oy = box.y + box.h * f.origin.v;
  const mapX = (x: number) => ox + (x - ox) * zoom.s + zoom.x;
  const mapY = (y: number) => oy + (y - oy) * zoom.s + zoom.y;
  const fx = mapX(box.x + box.w * f.face.u), fy = mapY(box.y + box.h * f.face.v);
  const Rx = box.w * 0.36 * zoom.s, Ry = box.h * 0.5 * zoom.s;
  const t = f.now / 1000, dt = f.dt;
  const k = 38, c = 2 * 0.62 * Math.sqrt(k), reach = Math.min(w, h) * 0.12;
  const quarterOf = (x: number, y: number) => (x < w / 2 ? 0 : 1) + (y < h / 2 ? 0 : 2);
  const settle = (p: Sprung, x: number, y: number): [number, number] => {
    if (dt) {
      let ax = -k * p.ox - c * p.vx, ay = -k * p.oy - c * p.vy;
      if (f.cursor) {
        const dx = x + p.ox - f.cursor.x, dy = y + p.oy - f.cursor.y, d = Math.hypot(dx, dy);
        if (d < reach && d > 0.01) {
          const force = Math.pow(1 - d / reach, 2) * 2600;
          ax += (dx / d) * force;
          ay += (dy / d) * force;
        }
      }
      p.vx += ax * dt;
      p.vy += ay * dt;
      p.ox += p.vx * dt;
      p.oy += p.vy * dt;
    }
    return [x + p.ox, y + p.oy];
  };

  for (const p of f.halo) {
    if (dt) p.th += p.sp * dt;
    const cos = Math.cos(p.th), sin = Math.sin(p.th);
    const boost = f.glow[quarterOf(fx + cos * Rx, fy + sin * Ry)], rr = p.rad * (1 + boost * 0.12);
    const [x, y] = settle(p, fx + cos * Rx * rr, fy + sin * Ry * rr);
    const a = Math.min(1, p.a * (0.75 + 0.25 * Math.sin(t * 2 + p.ph)) * (1 + boost * 0.8));
    if (boost > 0.5) batch(litBatches, x, y, p.s * 1.15, a);
    else batch(plainBatches, x, y, p.s, a);
  }
  for (const p of f.rim) {
    const hx = mapX(box.x + p.u * box.w), hy = mapY(box.y + p.v * box.h), drift = Math.sin(t * 0.8 + p.ph) * 1.5;
    const boost = f.glow[quarterOf(hx, hy)];
    const [x, y] = settle(p, hx + drift, hy - drift * 0.6);
    const a = Math.min(1, p.a * (0.7 + 0.3 * Math.sin(t * 3 + p.ph)) * (1 + boost * 0.5));
    batch(boost > 0.5 ? litBatches : plainBatches, x, y, p.s, a);
  }
  ctx.globalCompositeOperation = "lighter";
  flush(ctx, plainBatches, f.colors.fg);
  flush(ctx, litBatches, f.colors.accent);
  ctx.globalCompositeOperation = "source-over";

  const q = f.active;
  if (q >= 0 && f.leader && f.glow[q] > 0.05) {
    const angle = [-2.35, -0.79, 2.35, 0.79][q];
    const tx = fx + Math.cos(angle) * Rx * 0.62, ty = fy + Math.sin(angle) * Ry * 0.48;
    ctx.strokeStyle = f.colors.accent;
    ctx.lineWidth = 1;
    ctx.globalAlpha = f.glow[q] * 0.75;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(f.leader.x, f.leader.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = f.glow[q];
    ctx.fillStyle = f.colors.accent;
    ctx.beginPath();
    ctx.arc(tx, ty, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = f.glow[q] * 0.4;
    ctx.beginPath();
    ctx.arc(tx, ty, 9, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
