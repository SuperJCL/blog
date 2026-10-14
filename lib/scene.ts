// Generative backgrounds for projects without screenshots, ported from the style board.
// Everything is seeded, so a project always gets the same picture.

export type SceneColors = { fg: string; mark: string; dark: boolean };

export function rng(seed: number) {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// 2D Perlin noise.
function makeNoise(seed: number) {
  const r = rng(seed);
  const perm = new Uint8Array(256);
  const p = new Uint8Array(512);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const grad = (h: number, x: number, y: number) => {
    switch (h & 7) {
      case 0: return x + y;
      case 1: return -x + y;
      case 2: return x - y;
      case 3: return -x - y;
      case 4: return x;
      case 5: return -x;
      case 6: return y;
      default: return -y;
    }
  };
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), X = xi & 255, Y = yi & 255, xf = x - xi, yf = y - yi;
    const u = fade(xf), v = fade(yf);
    const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
    return lerp(lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u), lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u), v);
  };
}

// A normalized 120×120 heightfield from fractal noise, cached per seed.
const heightfields = new Map<number, Float32Array>();
const GRID = 120;
function heightfield(seed: number) {
  const cached = heightfields.get(seed);
  if (cached) return cached;
  const noise = makeNoise(seed);
  const fbm = (x: number, y: number) => {
    let value = 0, amp = 0.5, freq = 1;
    for (let i = 0; i < 4; i++) {
      value += amp * noise(x * freq, y * freq);
      freq *= 2.03;
      amp *= 0.5;
    }
    return value;
  };
  const a = new Float32Array(GRID * GRID);
  let min = Infinity, max = -Infinity;
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const v = fbm((i / GRID) * 3.2 + seed * 0.1, (j / GRID) * 3.2);
      a[j * GRID + i] = v;
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
  }
  for (let k = 0; k < a.length; k++) a[k] = (a[k] - min) / (max - min);
  heightfields.set(seed, a);
  return a;
}

// Terrain as a point cloud seen in perspective, turned by `angle`; peaks are drawn in the accent.
export function drawTerrain(ctx: CanvasRenderingContext2D, w: number, h: number, colors: SceneColors, seed: number, angle: number) {
  const a = heightfield(seed);
  // On a portrait screen the text fills the lower half, so the terrain moves up out of its way.
  const cx = w / 2, cy = h * (h > w ? 0.3 : 0.56), f = Math.min(w * 0.9, h * 1.25);
  const ca = Math.cos(angle), sa = Math.sin(angle), pitch = 0.42, cp = Math.cos(pitch), spitch = Math.sin(pitch);
  ctx.globalCompositeOperation = colors.dark ? "lighter" : "source-over";
  for (const [color, peak] of [[colors.fg, false], [colors.mark, true]] as const) {
    ctx.fillStyle = color;
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        const hv = a[j * GRID + i];
        if (hv > 0.62 !== peak) continue;
        const x = (i / (GRID - 1) - 0.5) * 3.4, z = (j / (GRID - 1) - 0.5) * 3.4;
        if (x * x + z * z > 2.89) continue;
        const xr = x * ca - z * sa, zr = x * sa + z * ca;
        const Y = hv * 0.9 - 1.25, Z = zr + 3.4;
        const Yp = Y * cp + Z * spitch, Zp = -Y * spitch + Z * cp;
        if (Zp < 0.4) continue;
        const sx = cx + (xr * f) / Zp, sy = cy - (Yp * f) / Zp;
        if (sx < -4 || sx > w + 4 || sy < -4 || sy > h + 4) continue;
        const depth = Math.min(1, 2.2 / Zp), r = Math.max(0.7, 2 * depth);
        ctx.globalAlpha = (peak ? 0.5 : 0.2) + 0.45 * depth * hv;
        ctx.fillRect(sx - r / 2, sy - r / 2, r, r);
      }
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

// An abstract layered system diagram: four columns of nodes joined by curves. It shows no real structure.
// `room` keeps the left part clear for slide text.
export function drawDiagram(ctx: CanvasRenderingContext2D, w: number, h: number, colors: SceneColors, seed: number, room: boolean) {
  const r = rng(seed), narrow = w < 760;
  const x0 = !room ? w * 0.12 : narrow ? w * 0.14 : w * 0.42;
  const x1 = !room ? w * 0.88 : narrow ? w * 0.86 : w * 0.88;
  const y0 = h * (!room ? 0.2 : narrow ? 0.16 : 0.2), y1 = h * (!room ? 0.8 : narrow ? 0.48 : 0.62);
  type Node = { x: number; y: number; hit: boolean };
  const layers: Node[][] = [];
  for (let c = 0; c < 4; c++) {
    const k = 2 + Math.floor(r() * 3), layer: Node[] = [];
    for (let i = 0; i < k; i++) layer.push({ x: x0 + ((x1 - x0) * c) / 3, y: y0 + ((y1 - y0) * (i + 0.5)) / k, hit: false });
    layers.push(layer);
  }
  const links: [Node, Node][] = [];
  for (let c = 0; c < 3; c++) {
    const next = layers[c + 1];
    for (const a of layers[c]) {
      const t1 = next[Math.floor(r() * next.length)];
      links.push([a, t1]);
      t1.hit = true;
      if (r() > 0.55) {
        const t2 = next[Math.floor(r() * next.length)];
        if (t2 !== t1) { links.push([a, t2]); t2.hit = true; }
      }
    }
    for (const b of next) if (!b.hit) { links.push([layers[c][Math.floor(r() * layers[c].length)], b]); b.hit = true; }
  }
  ctx.strokeStyle = colors.mark;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 1.3;
  if (colors.dark) { ctx.shadowColor = colors.mark; ctx.shadowBlur = 10; }
  ctx.beginPath();
  for (const [a, b] of links) {
    const m = (a.x + b.x) / 2;
    ctx.moveTo(a.x, a.y);
    ctx.bezierCurveTo(m, a.y, m, b.y, b.x, b.y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.fillStyle = colors.mark;
  for (const layer of layers) {
    for (const node of layer) {
      ctx.beginPath(); ctx.arc(node.x, node.y, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.22;
      ctx.beginPath(); ctx.arc(node.x, node.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

// Stable seed from a slug, so each project keeps its own terrain.
export function seedFor(text: string): number {
  let hash = 7;
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return hash + 1;
}
