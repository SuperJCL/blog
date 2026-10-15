// Builds the data for the Seattle 3D map demo (/[lang]/lab/seattle) from OpenStreetMap: buildings (with
// Simple 3D Buildings parts), roads, water and parks of central Seattle.
//
//   node scripts/seattle-data.mjs            uses .cache/seattle-osm.json if present, otherwise downloads it
//   node scripts/seattle-data.mjs --refresh  downloads a fresh extract from the Overpass API
//
// Output, in public/lab/seattle/: city.bin (quantized geometry and attributes), city.json (layout of city.bin,
// names, bounds) and ATTRIBUTION.txt. The data is © OpenStreetMap contributors under the ODbL; the output is a
// derived database under the same licence. No dependencies.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheFile = join(root, ".cache", "seattle-osm.json");
const outDir = join(root, "public", "lab", "seattle");

// Downtown, Belltown, Pike Place, Seattle Center and South Lake Union.
const BBOX = { south: 47.596, west: -122.362, north: 47.632, east: -122.326 };
const ORIGIN = { lat: (BBOX.south + BBOX.north) / 2, lon: (BBOX.west + BBOX.east) / 2 };
const QUANTUM = 0.25; // metres per coordinate step (Int16 covers ±8 km)
const LEVEL_HEIGHT = 3.3; // metres per storey when only building:levels is known

// ---------- download ----------

async function download() {
  const b = `${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east}`;
  const query = `[out:json][timeout:180];
(
  way["building"](${b}); relation["building"](${b});
  way["building:part"](${b}); relation["building:part"](${b});
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street|pedestrian|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$"](${b});
  way["natural"="coastline"](${b});
  way["natural"="water"](${b}); relation["natural"="water"](${b});
  way["leisure"="park"](${b}); relation["leisure"="park"](${b});
);
out geom;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "charliejiangblog-seattle-demo/1.0" },
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`Overpass answered ${res.status}`);
  const text = await res.text();
  mkdirSync(dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, text);
  return text;
}

const refresh = process.argv.includes("--refresh");
const raw = JSON.parse(!refresh && existsSync(cacheFile) ? readFileSync(cacheFile, "utf8") : await download());
const extracted = raw.osm3s?.timestamp_osm_base ?? new Date().toISOString();

// ---------- geometry helpers (metres; x east, y north) ----------

const kx = 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180), ky = 110574;
const project = (p) => ({ x: (p.lon - ORIGIN.lon) * kx, y: (p.lat - ORIGIN.lat) * ky });
const R = {
  minX: (BBOX.west - ORIGIN.lon) * kx, maxX: (BBOX.east - ORIGIN.lon) * kx,
  minY: (BBOX.south - ORIGIN.lat) * ky, maxY: (BBOX.north - ORIGIN.lat) * ky,
};
const inside = (p) => p.x >= R.minX && p.x <= R.maxX && p.y >= R.minY && p.y <= R.maxY;

function area(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j].x - ring[i].x) * (ring[j].y + ring[i].y);
  return a / 2; // positive for counter-clockwise
}
function centroid(ring) {
  let x = 0, y = 0;
  for (const p of ring) { x += p.x; y += p.y; }
  return { x: x / ring.length, y: y / ring.length };
}
function contains(ring, p) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let max = 0, index = -1;
    const A = points[a], B = points[b], dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * points[i].x - dx * points[i].y + B.x * A.y - B.y * A.x) / len;
      if (d > max) { max = d; index = i; }
    }
    if (max > tolerance) { keep[index] = 1; stack.push([a, index], [index, b]); }
  }
  return points.filter((_, i) => keep[i]);
}
// A closed ring without its repeated last point, simplified, counter-clockwise.
function cleanRing(points, tolerance) {
  let ring = points.slice();
  if (ring.length > 1 && ring[0].x === ring.at(-1).x && ring[0].y === ring.at(-1).y) ring.pop();
  if (ring.length < 3) return null;
  // Simplify as two halves so the start point isn't forced to stay a corner.
  const half = Math.floor(ring.length / 2);
  ring = [...simplify(ring.slice(0, half + 1), tolerance).slice(0, -1), ...simplify([...ring.slice(half), ring[0]], tolerance).slice(0, -1)];
  if (ring.length < 3) return null;
  if (area(ring) < 0) ring.reverse();
  return ring;
}
// Joins way geometries that share end points into closed rings (multipolygon members).
function assembleRings(lines) {
  const open = lines.map((l) => l.slice()).filter((l) => l.length > 1), rings = [];
  const same = (a, b) => a.lat === b.lat && a.lon === b.lon;
  while (open.length) {
    let ring = open.shift();
    let grown = true;
    while (!same(ring[0], ring.at(-1)) && grown) {
      grown = false;
      for (let i = 0; i < open.length; i++) {
        const l = open[i];
        if (same(ring.at(-1), l[0])) ring = ring.concat(l.slice(1));
        else if (same(ring.at(-1), l.at(-1))) ring = ring.concat(l.slice(0, -1).reverse());
        else continue;
        open.splice(i, 1);
        grown = true;
        break;
      }
    }
    if (same(ring[0], ring.at(-1))) rings.push(ring);
  }
  return rings;
}
// Outer rings of a way or multipolygon relation, projected.
function outerRings(el) {
  if (el.type === "way") return el.geometry ? [el.geometry.map(project)] : [];
  const outers = (el.members ?? []).filter((m) => m.type === "way" && m.role !== "inner" && m.geometry).map((m) => m.geometry);
  return assembleRings(outers).map((r) => r.map(project));
}
// Sutherland–Hodgman clip of a polygon to the bounding box.
function clipPolygon(ring) {
  const edges = [
    [(p) => p.x >= R.minX, (a, b) => lerpX(a, b, R.minX)],
    [(p) => p.x <= R.maxX, (a, b) => lerpX(a, b, R.maxX)],
    [(p) => p.y >= R.minY, (a, b) => lerpY(a, b, R.minY)],
    [(p) => p.y <= R.maxY, (a, b) => lerpY(a, b, R.maxY)],
  ];
  let out = ring;
  for (const [isIn, cut] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i], prev = input[(i + input.length - 1) % input.length];
      if (isIn(cur)) { if (!isIn(prev)) out.push(cut(prev, cur)); out.push(cur); }
      else if (isIn(prev)) out.push(cut(prev, cur));
    }
    if (!out.length) return null;
  }
  return out.length >= 3 ? out : null;
}
const lerpX = (a, b, x) => ({ x, y: a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x) });
const lerpY = (a, b, y) => ({ x: a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y), y });
// Liang–Barsky: the parts of a polyline inside the box.
function clipLine(points) {
  const pieces = [];
  let cur = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    let t0 = 0, t1 = 1;
    const dx = b.x - a.x, dy = b.y - a.y;
    const checks = [[-dx, a.x - R.minX], [dx, R.maxX - a.x], [-dy, a.y - R.minY], [dy, R.maxY - a.y]];
    let visible = true;
    for (const [p, q] of checks) {
      if (p === 0) { if (q < 0) { visible = false; break; } continue; }
      const t = q / p;
      if (p < 0) { if (t > t1) { visible = false; break; } if (t > t0) t0 = t; }
      else { if (t < t0) { visible = false; break; } if (t < t1) t1 = t; }
    }
    if (!visible) { if (cur.length > 1) pieces.push(cur); cur = []; continue; }
    const A = { x: a.x + t0 * dx, y: a.y + t0 * dy }, B = { x: a.x + t1 * dx, y: a.y + t1 * dy };
    if (!cur.length) cur.push(A);
    cur.push(B);
    if (t1 < 1) { pieces.push(cur); cur = []; }
  }
  if (cur.length > 1) pieces.push(cur);
  return pieces;
}

// ---------- heights ----------

function metres(value) {
  if (!value) return null;
  const v = String(value).trim().replace(",", ".");
  const ft = /^([\d.]+)\s*(ft|feet|')$/i.exec(v);
  if (ft) return Number(ft[1]) * 0.3048;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
const DEFAULT_HEIGHT = { house: 7, detached: 7, garage: 3.5, garages: 3.5, shed: 3, roof: 5, apartments: 13, residential: 12, commercial: 9, retail: 7, office: 20, hotel: 25, industrial: 8, parking: 12 };
// Returns [height, min height, source], source 0 = tagged height, 1 = from storeys, 2 = default for the type.
function heightOf(tags, type) {
  const h = metres(tags.height), levels = parseFloat(tags["building:levels"]);
  const min = metres(tags.min_height) ?? (parseFloat(tags["building:min_level"]) * LEVEL_HEIGHT || 0);
  if (h) return [h, Math.min(min, h - 0.5), 0];
  if (levels > 0) return [Math.max(levels * LEVEL_HEIGHT, min + 1), min, 1];
  const d = DEFAULT_HEIGHT[type] ?? 9;
  return [Math.max(d, min + 1), type === "roof" && !min ? d - 1 : min, 2];
}

const CATEGORIES = ["office", "residential", "civic", "other"];
const CATEGORY_OF = {
  office: 0, commercial: 0, retail: 0, hotel: 0, industrial: 0, warehouse: 0, supermarket: 0,
  apartments: 1, residential: 1, house: 1, detached: 1, dormitory: 1, terrace: 1, semidetached_house: 1,
  university: 2, college: 2, school: 2, hospital: 2, government: 2, civic: 2, public: 2, church: 2, cathedral: 2,
  museum: 2, stadium: 2, train_station: 2, transportation: 2, library: 2, fire_station: 2, tower: 2,
};

// ---------- buildings ----------

const els = raw.elements;
const outlines = [], parts = [];
for (const el of els) {
  const t = el.tags ?? {};
  const isPart = t["building:part"] && t["building:part"] !== "no";
  if (!t.building && !isPart) continue;
  for (const ring of outerRings(el)) {
    const clean = cleanRing(ring, 0.4);
    if (!clean || Math.abs(area(clean)) < 8) continue;
    const item = { tags: t, ring: clean, c: centroid(clean) };
    (isPart ? parts : outlines).push(item);
  }
}
// Simple 3D Buildings: an outline with parts is drawn as its parts. Parts inherit the outline's name, use and
// (as the figure shown on hover) its overall height and storeys.
for (const o of outlines) o.parts = parts.filter((p) => contains(o.ring, p.c));
const names = [], nameIndex = new Map();
const nameOf = (tags) => {
  if (!tags.name) return -1;
  const key = tags.name + "|" + (tags["name:zh"] ?? "");
  if (!nameIndex.has(key)) { nameIndex.set(key, names.length); names.push(tags["name:zh"] ? { en: tags.name, zh: tags["name:zh"] } : { en: tags.name }); }
  return nameIndex.get(key);
};
const buildings = [];
const add = (item, owner) => {
  if (!inside(item.c)) return;
  const tags = item.tags, ownerTags = owner?.tags ?? tags;
  const type = tags.building && tags.building !== "yes" ? tags.building : ownerTags.building;
  const [height, min, source] = heightOf(tags, type);
  buildings.push({ ring: item.ring, height, min, source, type, cat: CATEGORY_OF[type] ?? 3, name: nameOf(tags.name ? tags : ownerTags), owner, levels: parseFloat(tags["building:levels"]) || 0 });
};
const claimed = new Set();
for (const o of outlines) {
  if (!o.parts.length) { add(o); continue; }
  for (const p of o.parts) { add(p, o); claimed.add(p); }
}
for (const p of parts) if (!claimed.has(p)) add(p);
// The figure shown on hover: the whole building's height and storeys.
const groups = new Map();
for (const b of buildings) {
  const key = b.owner ?? b;
  const g = groups.get(key) ?? { height: 0, levels: 0, source: 2 };
  g.height = Math.max(g.height, b.height);
  g.levels = Math.max(g.levels, b.levels, parseFloat(b.owner?.tags["building:levels"]) || 0);
  g.source = Math.min(g.source, b.source);
  groups.set(key, g);
}
for (const b of buildings) {
  const ownerHeight = metres(b.owner?.tags.height);
  const g = groups.get(b.owner ?? b);
  b.groupHeight = ownerHeight ?? g.height;
  b.groupLevels = g.levels;
  b.groupSource = ownerHeight ? 0 : g.source;
}

// ---------- roads, water, parks ----------

const MAJOR = /^(motorway|trunk|primary|secondary)(_link)?$/;
const roads = [];
for (const el of els) {
  if (el.type !== "way" || !el.tags?.highway || !el.geometry) continue;
  for (const piece of clipLine(el.geometry.map(project))) {
    const line = simplify(piece, 1.2);
    if (line.length > 1) roads.push({ line, cls: MAJOR.test(el.tags.highway) ? 0 : 1 });
  }
}

function polygonsOf(test, tolerance) {
  const out = [];
  for (const el of els) {
    if (!test(el.tags ?? {})) continue;
    for (const ring of outerRings(el)) {
      const clipped = clipPolygon(ring);
      const clean = clipped && cleanRing(clipped, tolerance);
      if (clean && Math.abs(area(clean)) > 50) out.push(clean);
    }
  }
  return out;
}
const water = polygonsOf((t) => t.natural === "water", 1.5);
const parks = polygonsOf((t) => t.leisure === "park", 1.5);

// The sea from the coastline: land lies left of a coastline way, water right. Clip the merged coastline to the
// box, then walk each piece and continue clockwise along the box edge to the next piece, closing water polygons.
{
  let chains = els.filter((e) => e.type === "way" && e.tags?.natural === "coastline" && e.geometry).map((w) => ({ nodes: [...w.nodes], pts: w.geometry }));
  for (let merged = true; merged; ) {
    merged = false;
    for (let i = 0; i < chains.length && !merged; i++) {
      for (let j = 0; j < chains.length && !merged; j++) {
        if (i !== j && chains[i].nodes.at(-1) === chains[j].nodes[0]) {
          chains[i] = { nodes: chains[i].nodes.concat(chains[j].nodes.slice(1)), pts: chains[i].pts.concat(chains[j].pts.slice(1)) };
          chains.splice(j, 1);
          merged = true;
        }
      }
    }
  }
  const W = R.maxX - R.minX, H = R.maxY - R.minY, P = 2 * (W + H), eps = 1e-6;
  const along = (p) => {
    if (Math.abs(p.y - R.maxY) < eps) return p.x - R.minX;
    if (Math.abs(p.x - R.maxX) < eps) return W + (R.maxY - p.y);
    if (Math.abs(p.y - R.minY) < eps) return W + H + (R.maxX - p.x);
    return 2 * W + H + (p.y - R.minY);
  };
  const corners = [[0, { x: R.minX, y: R.maxY }], [W, { x: R.maxX, y: R.maxY }], [W + H, { x: R.maxX, y: R.minY }], [2 * W + H, { x: R.minX, y: R.minY }]];
  const pieces = chains.flatMap((c) => clipLine(c.pts.map(project))).map((pts) => ({ pts, start: along(pts[0]), end: along(pts.at(-1)) }));
  const used = new Set();
  for (const first of pieces) {
    if (used.has(first)) continue;
    const ring = [];
    let piece = first;
    for (let guard = 0; guard < pieces.length + 1; guard++) {
      used.add(piece);
      ring.push(...piece.pts);
      const gap = (q) => (q.start - piece.end + P) % P;
      const next = pieces.filter((q) => !used.has(q) || q === first).sort((a, b) => gap(a) - gap(b))[0];
      const to = piece.end + gap(next);
      for (const [t, corner] of [...corners, ...corners.map(([t, c]) => [t + P, c])]) if (t > piece.end && t < to) ring.push(corner);
      if (next === first) break;
      piece = next;
    }
    const clean = cleanRing(ring, 1.5);
    if (clean && Math.abs(area(clean)) > 50) water.push(clean);
  }
}

// ---------- encode ----------

const q = (v) => Math.round(v / QUANTUM);
const dm = (m) => Math.max(0, Math.min(65535, Math.round(m * 10)));
const sections = {};
const chunks = [];
let offset = 0;
function section(name, typed) {
  const pad = (4 - (offset % 4)) % 4;
  if (pad) { chunks.push(new Uint8Array(pad)); offset += pad; }
  sections[name] = { type: typed.constructor.name.replace("Array", ""), offset, length: typed.length };
  chunks.push(new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength));
  offset += typed.byteLength;
}
const coords = (rings) => Int16Array.from(rings.flatMap((r) => r.flatMap((p) => [q(p.x), q(p.y)])));

section("buildingVertexCount", Uint16Array.from(buildings.map((b) => b.ring.length)));
section("buildingHeight", Uint16Array.from(buildings.map((b) => dm(b.height))));
section("buildingMinHeight", Uint16Array.from(buildings.map((b) => dm(b.min))));
section("buildingGroupHeight", Uint16Array.from(buildings.map((b) => dm(b.groupHeight))));
section("buildingLevels", Uint8Array.from(buildings.map((b) => Math.min(255, Math.round(b.groupLevels)))));
section("buildingHeightSource", Uint8Array.from(buildings.map((b) => b.groupSource)));
section("buildingCategory", Uint8Array.from(buildings.map((b) => b.cat)));
section("buildingName", Int16Array.from(buildings.map((b) => b.name)));
section("buildingCoords", coords(buildings.map((b) => b.ring)));
section("roadVertexCount", Uint16Array.from(roads.map((r) => r.line.length)));
section("roadClass", Uint8Array.from(roads.map((r) => r.cls)));
section("roadCoords", coords(roads.map((r) => r.line)));
section("waterVertexCount", Uint16Array.from(water.map((r) => r.length)));
section("waterCoords", coords(water));
section("parkVertexCount", Uint16Array.from(parks.map((r) => r.length)));
section("parkCoords", coords(parks));

const bin = new Uint8Array(offset);
let at = 0;
for (const c of chunks) { bin.set(c, at); at += c.byteLength; }
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "city.bin"), bin);
writeFileSync(join(outDir, "city.json"), JSON.stringify({
  source: "OpenStreetMap",
  licence: "ODbL 1.0, © OpenStreetMap contributors",
  extracted,
  origin: ORIGIN,
  quantum: QUANTUM,
  bounds: { minX: R.minX, maxX: R.maxX, minY: R.minY, maxY: R.maxY },
  // x east, y north, in metres from the origin; coordinates are Int16 multiples of `quantum`, heights Uint16 decimetres.
  heightSource: ["tagged", "storeys", "type default"],
  categories: CATEGORIES,
  counts: { buildings: buildings.length, roads: roads.length, water: water.length, parks: parks.length },
  // Blocks by where their height comes from (same order as heightSource), and the tallest, for the page text.
  heightSourceCounts: [0, 1, 2].map((s) => buildings.filter((b) => b.source === s).length),
  tallest: Math.round(Math.max(...buildings.map((b) => b.height))),
  sections,
  names,
}));
writeFileSync(join(outDir, "ATTRIBUTION.txt"), `Map data © OpenStreetMap contributors (https://www.openstreetmap.org/copyright).

city.bin and city.json are a derived database of buildings, roads, water and parks in central Seattle,
extracted from OpenStreetMap on ${extracted.slice(0, 10)} by scripts/seattle-data.mjs. They are made available under
the Open Database License 1.0: https://opendatacommons.org/licenses/odbl/1-0/
`);

const tagged = buildings.filter((b) => b.source === 0).length, storeys = buildings.filter((b) => b.source === 1).length;
console.log(`buildings ${buildings.length} (heights: ${tagged} tagged, ${storeys} from storeys, ${buildings.length - tagged - storeys} by type), named ${names.length}`);
console.log(`roads ${roads.length}, water polygons ${water.length}, parks ${parks.length}; tallest ${Math.max(...buildings.map((b) => b.height)).toFixed(0)} m`);
console.log(`city.bin ${(bin.byteLength / 1024).toFixed(0)} KB, city.json ${(JSON.stringify(names).length / 1024).toFixed(0)} KB of names`);
