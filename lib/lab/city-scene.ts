import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Fog,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  ShaderMaterial,
  ShapeUtils,
  Spherical,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { toScene, type City, type CityMeta, type Shapes } from "./city-data";

// The Seattle demo's Three.js scene: every building extruded into one merged mesh (one draw call), flat layers
// for land, water, parks and roads, orbit controls, GPU picking for hover and tap, two colourings, flights to
// landmarks and a turn around them, a building that comes apart floor by floor, and rendering only while
// something moves.
// Three.js space: x east, y up, z south, in metres from the data's origin.

export type CityPalette = { bg: string; surface: string; line: string; muted: string; fg: string; mark: string; blue: string; amber: string };
export type ColourMode = "height" | "use";
// `label`: the landmark's own name, when the camera flew to it (the building's map name may differ). `floor`: one
// storey of the featured building while it's apart; `storey` its height in metres, `area` its plate in m².
export type BuildingInfo = {
  name: CityMeta["names"][number] | null;
  label?: string;
  height: number;
  levels: number;
  source: number;
  category: number;
  floor?: { number: number; of: number; storey: number; area: number };
};
// Where each floor's tag goes while the featured building is apart, ground floor first, in canvas CSS px.
export type FloorTags = { x: number; y: number }[] | null;
// What's under the pointer (hover) or was tapped or asked about (pinned), at a point in the canvas, in CSS px;
// `width` and `height` are the canvas's, for keeping a label beside the point inside it.
export type InfoEvent = { info: BuildingInfo; x: number; y: number; width: number; height: number; pinned: boolean } | null;
export type Legend = { height: { colours: string[]; ticks: { metres: number; at: number }[] }; use: string[] };
export type CityScene = {
  setPalette(palette: CityPalette): void;
  setColourMode(mode: ColourMode): void;
  legend(): Legend;
  flyTo(lat: number, lon: number, label: string): void;
  orbit(on: boolean): void;
  explode(on: boolean): void;
  resetView(): void;
  describeCentre(): BuildingInfo | null;
  dispose(): void;
};
type Options = {
  palette: CityPalette;
  reducedMotion: boolean;
  onInfo(event: InfoEvent): void;
  onOrbit(on: boolean): void;
  onExplode(on: boolean): void;
  onFloors(tags: FloorTags): void;
};

// The opening view. Wide frames look from over Elliott Bay (west-southwest), between the downtown towers and
// Seattle Center: the skyline in front, the Space Needle behind on the left. Upright frames (phones) look north
// from the south-southwest, along the map's long side. Azimuth 0 is south, negative toward the west.
const VIEWS = {
  wide: { target: new Vector3(300, 0, 150), distance: 2700, polar: 62, azimuth: -75 },
  tall: { target: new Vector3(320, 0, 120), distance: 3300, polar: 56, azimuth: -22 },
};
const FLIGHT = { distance: 720, polar: 58, ms: 1600 }; // how a landmark is framed, and how long getting there takes
const BREATH_MS = 2200; // one slow swell of an arrived-at landmark's highlight: far below the 3-per-second flash limit
const ORBIT = { ms: 20000, ramp: 0.08 }; // one turn around what the camera looks at, easing in and out over the ramp
// The featured building apart: each floor rises `gap` metres further than the one below, over `ms`, seen from a
// close-up of the stack; the rest of the city fades to `ghost` opacity so it can't hide the lower floors.
const EXPLODE = { gap: 14, ms: 1000, distance: 210, polar: 54, ghost: 0.3 };
const ROAD_WIDTH = [14, 8]; // metres: major, minor
const TAP_SLOP = 6; // px a tap may move and still count as a tap

const mix = (a: Color, b: Color, t: number) => a.clone().lerp(b, t);
// Building colour by height, on a log scale up to the tallest tower (~286 m): low blocks sit near the ground
// colour, towers rise into the accent.
const heightT = (m: number) => MathUtils.clamp(Math.log1p(m / 6) / Math.log1p(250 / 6), 0, 1);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
// A turn's progress: a steady speed in the middle, speeding up and slowing down over the ramp at either end.
const orbitProgress = (t: number) => {
  const r = ORBIT.ramp, v = 1 / (1 - r);
  return t < r ? (v * t * t) / (2 * r) : t < 1 - r ? v * (t - r / 2) : 1 - (v * (1 - t) ** 2) / (2 * r);
};

function flatShapes(s: Shapes, q: number, y: number) {
  const positions: number[] = [], index: number[] = [];
  for (let k = 0; k < s.count.length; k++) {
    const base = positions.length / 3, contour: Vector2[] = [];
    for (let i = 0; i < s.count[k]; i++) {
      const p = 2 * (s.start[k] + i), x = s.coords[p] * q, north = s.coords[p + 1] * q;
      contour.push(new Vector2(x, north));
      positions.push(x, y, -north);
    }
    for (const [a, b, c] of ShapeUtils.triangulateShape(contour, [])) index.push(base + a, base + b, base + c);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  g.setIndex(index);
  return g;
}

function roadRibbons(s: Shapes & { cls: Uint8Array }, q: number, cls: number) {
  const positions: number[] = [], index: number[] = [];
  const half = ROAD_WIDTH[cls] / 2;
  for (let k = 0; k < s.count.length; k++) {
    if (s.cls[k] !== cls) continue;
    for (let i = 1; i < s.count[k]; i++) {
      const p = 2 * (s.start[k] + i - 1);
      const ax = s.coords[p] * q, az = -s.coords[p + 1] * q, bx = s.coords[p + 2] * q, bz = -s.coords[p + 3] * q;
      const len = Math.hypot(bx - ax, bz - az) || 1, nx = ((bz - az) / len) * half, nz = (-(bx - ax) / len) * half;
      const v = positions.length / 3;
      positions.push(ax + nx, 0, az + nz, ax - nx, 0, az - nz, bx - nx, 0, bz - nz, bx + nx, 0, bz + nz);
      index.push(v, v + 2, v + 1, v, v + 3, v + 2);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  g.setIndex(index);
  return g;
}

// Each block: a bottom ring and a top ring of vertices, walls between them, the roof triangulated from the top
// ring. Shared vertices are fine with flat shading, which takes face normals from screen-space derivatives.
// Every vertex also carries its block's number + 1 as an RGB colour, for picking. The `skip` block (drawn by
// itself) keeps its vertices, so block numbers still find their own, but gets no faces or roof lines.
const pickColour = (id: number) => [(id >> 16) & 255, (id >> 8) & 255, id & 255];
function buildingGeometry(b: City["buildings"], q: number, skip: number) {
  let vertices = 0, triangles = 0, edges = 0;
  for (let k = 0; k < b.count.length; k++) {
    vertices += 2 * b.count[k];
    triangles += 3 * b.count[k] - 2;
    edges += b.count[k];
  }
  const position = new Float32Array(vertices * 3), pick = new Uint8Array(vertices * 3), firstVertex = new Uint32Array(b.count.length);
  const index = new Uint32Array(triangles * 3), roofLines = new Float32Array(edges * 6);
  let v = 0, t = 0, e = 0;
  const pa = new Vector3(), ab = new Vector3(), ac = new Vector3();
  for (let k = 0; k < b.count.length; k++) {
    const n = b.count[k], base = v, top = b.height[k] / 10, bottom = b.minHeight[k] / 10, contour: Vector2[] = [];
    const id = k + 1;
    firstVertex[k] = base;
    for (let i = 0; i < n; i++) {
      const p = 2 * (b.start[k] + i), x = b.coords[p] * q, north = b.coords[p + 1] * q;
      contour.push(new Vector2(x, north));
      position.set([x, bottom, -north], 3 * (base + i));
      position.set([x, top, -north], 3 * (base + n + i));
    }
    for (let i = 0; i < 2 * n; i++) pick.set(pickColour(id), 3 * (base + i));
    v += 2 * n;
    if (k === skip) continue;
    // Rings run counter-clockwise on the map, so (bottom i, bottom j, top j) faces outward.
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      index.set([base + i, base + j, base + n + j, base + i, base + n + j, base + n + i], t);
      t += 6;
      roofLines.set([...position.subarray(3 * (base + n + i), 3 * (base + n + i) + 3), ...position.subarray(3 * (base + n + j), 3 * (base + n + j) + 3)], e);
      e += 6;
    }
    for (const [i0, i1, i2] of ShapeUtils.triangulateShape(contour, [])) {
      const a = base + n + i0;
      let b1 = base + n + i1, c1 = base + n + i2;
      pa.fromArray(position, 3 * a);
      ab.fromArray(position, 3 * b1).sub(pa);
      ac.fromArray(position, 3 * c1).sub(pa);
      if (ab.cross(ac).y < 0) [b1, c1] = [c1, b1]; // roofs face up
      index.set([a, b1, c1], t);
      t += 3;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(position, 3));
  geometry.setAttribute("color", new BufferAttribute(new Float32Array(vertices * 3), 3));
  geometry.setAttribute("pickColor", new BufferAttribute(pick, 3, true));
  geometry.setIndex(new BufferAttribute(index.subarray(0, t), 1));
  const lines = new BufferGeometry();
  lines.setAttribute("position", new BufferAttribute(roofLines.subarray(0, e), 3));
  return { geometry, lines, firstVertex };
}

// One storey, from y0 to y1, of a building drawn by itself: walls round the outline (counter-clockwise) and its
// courtyards (clockwise), so every wall faces out of the floor; a plate on top with the courtyards cut out, and
// one underneath. Vertex colours here are only shades, `walls` at the foot and the head of this storey's walls,
// so a whole stack darkens toward the ground like the other blocks; the colour itself is the material's. The
// plate's outline is drawn as lines.
function floorGeometry(rings: Vector2[][], y0: number, y1: number, walls: [number, number], pickId: number) {
  const position: number[] = [], shade: number[] = [], index: number[] = [], edges: number[] = [];
  const vertex = (p: Vector2, y: number, s: number) => {
    position.push(p.x, y, -p.y);
    shade.push(s, s, s);
    return position.length / 3 - 1;
  };
  for (const ring of rings) {
    const n = ring.length, foot = ring.map((p) => vertex(p, y0, walls[0])), head = ring.map((p) => vertex(p, y1, walls[1]));
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      index.push(foot[i], foot[j], head[j], foot[i], head[j], head[i]);
      edges.push(ring[i].x, y1, -ring[i].y, ring[j].x, y1, -ring[j].y);
    }
  }
  // A plate triangle faces up when it runs counter-clockwise on the map.
  const [outer, ...holes] = rings, all = rings.flat(), triangles = ShapeUtils.triangulateShape(outer, holes);
  const ccw = (a: Vector2, b: Vector2, c: Vector2) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) > 0;
  for (const [y, s, up] of [[y1, 1, true], [y0, walls[0], false]] as const) {
    const ids = all.map((p) => vertex(p, y, s));
    for (const [a, b, c] of triangles) {
      const flip = ccw(all[a], all[b], all[c]) !== up;
      index.push(ids[a], ids[flip ? c : b], ids[flip ? b : c]);
    }
  }
  const geometry = new BufferGeometry(), id = pickColour(pickId);
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(position), 3));
  geometry.setAttribute("color", new BufferAttribute(new Float32Array(shade), 3));
  geometry.setAttribute("pickColor", new BufferAttribute(Uint8Array.from({ length: position.length }, (_, i) => id[i % 3]), 3, true));
  geometry.setIndex(index);
  const lines = new BufferGeometry();
  lines.setAttribute("position", new BufferAttribute(new Float32Array(edges), 3));
  return { geometry, lines };
}

// Draws each block in its picking colour, unlit: one pixel of this tells which block is under a point.
const pickMaterial = () =>
  new ShaderMaterial({
    vertexShader: "attribute vec3 pickColor; varying vec3 vPick; void main() { vPick = pickColor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "varying vec3 vPick; void main() { gl_FragColor = vec4(vPick, 1.0); }",
  });

export function createCityScene(canvas: HTMLCanvasElement, keyTarget: HTMLElement, city: City, options: Options): CityScene {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); // throws without WebGL
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const q = city.meta.quantum, b = city.buildings, { minX, maxX, minY, maxY } = city.meta.bounds;
  const center = new Vector3((minX + maxX) / 2, 0, -(minY + maxY) / 2);

  const scene = new Scene();
  scene.fog = new Fog(0, 3200, 9000); // the far side of the map fades into the background
  const camera = new PerspectiveCamera(32, 1, 10, 20000);
  const hemi = new HemisphereLight(0xffffff, 0x000000, 1.1);
  const sun = new DirectionalLight(0xffffff, 1.5);
  sun.position.set(-0.55, 1, 0.45); // from the west-southwest, over the bay
  scene.add(hemi, sun);

  // The ground runs far past the map so its edge is lost in the fog rather than showing at the horizon.
  const ground = new Mesh(new PlaneGeometry(40000, 40000).rotateX(-Math.PI / 2).translate(center.x, 0, center.z), new MeshBasicMaterial());
  const water = new Mesh(flatShapes(city.water, q, 0), new MeshBasicMaterial());
  const parks = new Mesh(flatShapes(city.parks, q, 0), new MeshBasicMaterial());
  const minor = new Mesh(roadRibbons(city.roads, q, 1), new MeshBasicMaterial());
  const major = new Mesh(roadRibbons(city.roads, q, 0), new MeshBasicMaterial());
  // Flat layers sit on the same plane and draw in order without writing depth, so they never fight. Two-sided,
  // as their triangles' winding isn't normalized.
  [ground, water, parks, minor, major].forEach((layer, i) => {
    (layer.material as MeshBasicMaterial).depthWrite = false;
    (layer.material as MeshBasicMaterial).side = DoubleSide;
    layer.renderOrder = i;
    scene.add(layer);
  });
  const featured = city.meta.featured?.[0];
  const { geometry, lines, firstVertex } = buildingGeometry(b, q, featured?.block ?? -1);
  const buildings = new Mesh(geometry, new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  const roofs = new LineSegments(lines, new LineBasicMaterial({ transparent: true, opacity: 0.55 }));
  buildings.renderOrder = roofs.renderOrder = 10;
  scene.add(buildings, roofs);

  const pickScene = new Scene(), floorPickScene = new Scene(), picker = pickMaterial();
  pickScene.background = new Color(0); // 0: no building
  pickScene.add(new Mesh(geometry, picker));
  const pickTarget = new WebGLRenderTarget(1, 1);
  const pixel = new Uint8Array(4);

  // The featured building, drawn floor by floor so it can come apart; its block stands for it everywhere else
  // (landmarks, colour, hover while it's whole). Floors pick as numbers past the blocks. Storeys share the
  // height evenly: OpenStreetMap has the outline, the courtyards and the number of storeys, nothing inside.
  const blockCount = b.count.length, floorEdges = (roofs.material as LineBasicMaterial).clone(); // stays opaque while the city fades
  const feature = featured && (() => {
    const k = featured.block, levels = Math.max(1, b.levels[k]), storey = b.groupHeight[k] / 10 / levels;
    const ring = (flat: number[]) => Array.from({ length: flat.length / 2 }, (_, i) => new Vector2(flat[2 * i] * q, flat[2 * i + 1] * q));
    const outer = ring(featured.outer), holes = featured.inner.map(ring);
    if (ShapeUtils.isClockWise(outer)) outer.reverse();
    for (const hole of holes) if (!ShapeUtils.isClockWise(hole)) hole.reverse();
    const floors = Array.from({ length: levels }, (_, f) => {
      const g = floorGeometry([outer, ...holes], f * storey, (f + 1) * storey, [0.5 + (0.5 * f) / levels, 0.5 + (0.5 * (f + 1)) / levels], blockCount + 1 + f);
      const mesh = new Mesh(g.geometry, new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
      const edges = new LineSegments(g.lines, floorEdges), pick = new Mesh(g.geometry, picker);
      mesh.renderOrder = edges.renderOrder = 10;
      edges.visible = f === levels - 1; // whole, only the roof's outline shows, as on every other block
      scene.add(mesh, edges);
      floorPickScene.add(pick);
      return { mesh, edges, pick };
    });
    const area = holes.reduce((sum, hole) => sum + ShapeUtils.area(hole), ShapeUtils.area(outer)); // courtyards run clockwise: negative
    const middle = outer.reduce((sum, p) => sum.add(p), new Vector2()).divideScalar(outer.length);
    return { block: k, floors, storey, area, outer, centre: new Vector3(middle.x, 0, -middle.y), top: levels * storey + (levels - 1) * EXPLODE.gap };
  })();

  // Blocks of one named building light up together on hover.
  const sameBuilding = new Map<number, number[]>();
  for (let k = 0; k < b.name.length; k++) if (b.name[k] >= 0) sameBuilding.set(b.name[k], [...(sameBuilding.get(b.name[k]) ?? []), k]);
  const blocksOf = (k: number) => (b.name[k] >= 0 ? sameBuilding.get(b.name[k])! : [k]);
  // The block whose footprint holds a ground point (map metres: x east, y north), else the nearest within 50 m.
  const blockAt = (x: number, north: number) => {
    let best = -1, bestDistance = 50 * 50;
    for (let k = 0; k < b.count.length; k++) {
      const n = b.count[k], s = b.start[k];
      let inside = false, cx = 0, cy = 0;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = b.coords[2 * (s + i)] * q, yi = b.coords[2 * (s + i) + 1] * q, xj = b.coords[2 * (s + j)] * q, yj = b.coords[2 * (s + j) + 1] * q;
        if (yi > north !== yj > north && x < ((xj - xi) * (north - yi)) / (yj - yi) + xi) inside = !inside;
        cx += xi;
        cy += yi;
      }
      if (inside) return k;
      const d = (cx / n - x) ** 2 + (cy / n - north) ** 2;
      if (d < bestDistance) { bestDistance = d; best = k; }
    }
    return best;
  };

  // ---------- colour ----------

  let mode: ColourMode = "height", highlighted: number[] = [], hoveredFloor = -1;
  let ramp: Color[] = [], kinds: Color[] = [], glow = new Color(), accent = new Color(), legendCache: Legend | null = null;
  const blockColour = (k: number, out: Color) => {
    if (mode === "use") return out.copy(kinds[b.category[k]]);
    const t = heightT(b.height[k] / 10);
    return t < 0.5 ? out.copy(ramp[0]).lerp(ramp[1], t / 0.5) : out.copy(ramp[1]).lerp(ramp[2], (t - 0.5) / 0.5);
  };
  const colours = geometry.getAttribute("color") as BufferAttribute, scratch = new Color();
  const paintBlock = (k: number, colour: Color) => {
    const n = b.count[k], v = firstVertex[k];
    for (let i = 0; i < n; i++) colours.setXYZ(v + i, colour.r * 0.5, colour.g * 0.5, colour.b * 0.5); // shaded foot
    for (let i = 0; i < n; i++) colours.setXYZ(v + n + i, colour.r, colour.g, colour.b);
    // The featured building's floors take its block's colour, turning to the accent as they come apart; a floor
    // pointed at while it's apart glows.
    if (k === feature?.block) {
      const e = easeInOut(spread);
      feature.floors.forEach((f, i) => {
        const material = f.mesh.material as MeshLambertMaterial;
        if (i === hoveredFloor) material.color.copy(glow);
        else material.color.copy(colour).lerp(accent, e);
      });
    }
  };
  const repaintFeature = () => {
    if (!feature) return;
    paintBlock(feature.block, highlighted.includes(feature.block) ? glow : blockColour(feature.block, scratch));
    requestRender();
  };
  // Sends colours to the GPU at the next render: everything, or only the given blocks' vertices (the breathing
  // highlight, per frame). A whole upload already waiting isn't narrowed by a later partial one.
  let wholePending = false;
  const upload = (blocks?: number[]) => {
    if (!blocks) {
      wholePending = true;
      colours.clearUpdateRanges();
    } else if (!wholePending) {
      for (const k of blocks) colours.addUpdateRange(firstVertex[k] * 3, b.count[k] * 6);
    }
    colours.needsUpdate = true;
  };
  const paintAll = () => {
    for (let k = 0; k < b.count.length; k++) paintBlock(k, blockColour(k, scratch));
    for (const k of highlighted) paintBlock(k, glow);
    upload();
    requestRender();
  };
  // Lights up the given blocks, or one floor of the featured building.
  const highlight = (blocks: number[], floor = -1) => {
    if (floor !== hoveredFloor) {
      hoveredFloor = floor;
      repaintFeature();
    }
    if (blocks.length === highlighted.length && blocks.every((k, i) => k === highlighted[i])) return;
    for (const k of highlighted) paintBlock(k, blockColour(k, scratch));
    const changed = [...highlighted, ...blocks];
    highlighted = blocks;
    for (const k of highlighted) paintBlock(k, glow);
    upload(changed);
    requestRender();
  };

  function setPalette(p: CityPalette) {
    const c = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, new Color(v)])) as Record<keyof CityPalette, Color>;
    scene.background = c.bg;
    (scene.fog as Fog).color = c.bg;
    hemi.groundColor = c.bg;
    (ground.material as MeshBasicMaterial).color = c.surface;
    (water.material as MeshBasicMaterial).color = c.bg;
    (parks.material as MeshBasicMaterial).color = mix(c.surface, c.mark, 0.1);
    (minor.material as MeshBasicMaterial).color = c.line;
    (major.material as MeshBasicMaterial).color = mix(c.line, c.muted, 0.45);
    (roofs.material as LineBasicMaterial).color = floorEdges.color = mix(c.mark, c.fg, 0.35);
    ramp = [mix(c.surface, c.fg, 0.1), mix(c.surface, c.fg, 0.42), c.mark];
    kinds = [c.mark, c.blue, c.amber, mix(c.surface, c.fg, 0.3)]; // office & commercial, residential, civic, other
    glow = c.fg;
    accent = c.mark;
    (ping.material as MeshBasicMaterial).color = c.mark;
    legendCache = {
      height: { colours: ramp.map((x) => `#${x.getHexString()}`), ticks: [10, 50, 150].map((metres) => ({ metres, at: heightT(metres) })) },
      use: kinds.map((x) => `#${x.getHexString()}`),
    };
    paintAll();
  }

  // ---------- camera ----------

  const controls = new OrbitControls(camera, canvas);
  let touched = false; // once someone moves the camera, resizing no longer reframes it
  const openingView = () => (camera.aspect < 1 ? VIEWS.tall : VIEWS.wide);
  const viewPosition = (target: Vector3, distance: number, polar: number, azimuth: number) =>
    new Vector3().setFromSpherical(new Spherical(distance, MathUtils.degToRad(polar), MathUtils.degToRad(azimuth))).add(target);
  const frameCity = () => {
    const view = openingView();
    controls.target.copy(view.target);
    camera.position.copy(viewPosition(view.target, view.distance, view.polar, view.azimuth));
  };
  controls.cursor.copy(center);
  controls.maxTargetRadius = 1900; // panning stays over the mapped area
  controls.minDistance = 120;
  controls.maxDistance = 4500;
  controls.maxPolarAngle = MathUtils.degToRad(80);
  controls.screenSpacePanning = false;
  controls.zoomToCursor = true;
  controls.enableDamping = !options.reducedMotion;
  controls.dampingFactor = 0.08;
  controls.autoRotate = !options.reducedMotion;
  controls.autoRotateSpeed = 0.35;
  controls.keyPanSpeed = 30;
  controls.listenToKeyEvents(keyTarget);

  // A landmark the camera has arrived at: its building breathes in the highlight colour, a ring pings out from
  // its foot, and its label stays pinned to the roof, until someone moves the camera or points elsewhere.
  type Focus = { info: BuildingInfo; anchor: Vector3; radius: number; start: number; x: number; y: number };
  let focus: Focus | null = null;
  const ping = new Mesh(new RingGeometry(0.88, 1, 72).rotateX(-Math.PI / 2), new MeshBasicMaterial({ transparent: true, depthWrite: false }));
  ping.visible = false;
  ping.position.y = 0.6;
  scene.add(ping);
  const clearFocus = () => {
    focus = null;
    ping.visible = false;
  };
  const roofOf = (blocks: number[]) => Math.max(...blocks.map((i) => b.height[i] / 10));
  const startFocus = (x: number, z: number, label: string) => {
    const k = blockAt(x, -z);
    if (k < 0) return;
    const blocks = blocksOf(k);
    highlight(blocks);
    // The ring starts just outside the footprint.
    let radius = 0;
    for (const i of blocks) for (let v = 0; v < b.count[i]; v++) {
      const p = 2 * (b.start[i] + v);
      radius = Math.max(radius, Math.hypot(b.coords[p] * q - x, -b.coords[p + 1] * q - z));
    }
    focus = { info: { ...infoOf(k), label }, anchor: new Vector3(x, roofOf(blocks), z), radius: radius + 12, start: performance.now(), x: NaN, y: NaN };
    ping.position.set(x, 0.6, z);
    ping.scale.setScalar(focus.radius * 1.4);
    (ping.material as MeshBasicMaterial).opacity = 0.7;
    ping.visible = true;
    requestRender();
  };
  const breath = new Color(), anchorOnScreen = new Vector3();
  const pinFocusLabel = () => {
    if (!focus) return;
    anchorOnScreen.copy(focus.anchor).project(camera);
    const w = canvas.clientWidth, h = canvas.clientHeight, x = ((anchorOnScreen.x + 1) / 2) * w, y = ((1 - anchorOnScreen.y) / 2) * h;
    if (anchorOnScreen.z > 1 || (Math.abs(x - focus.x) < 0.5 && Math.abs(y - focus.y) < 0.5)) return;
    focus.x = x;
    focus.y = y;
    options.onInfo({ info: focus.info, x, y, width: w, height: h, pinned: true });
  };
  // Once the featured building is fully apart, each floor's tag sits just right of it, level with the part of it
  // that shows: from its lowest point on screen up to its top, or to where the floor above covers it, seen from
  // above. Sent only when a tag moves by a whole pixel.
  let floorTagsKey = "";
  const pinFloorTags = () => {
    if (!feature) return;
    let tags: FloorTags = null;
    if (apart && spread === 1) {
      const w = canvas.clientWidth, h = canvas.clientHeight, last = feature.floors.length - 1, pitch = feature.storey + EXPLODE.gap;
      // The outline's furthest right, lowest and highest points on screen, at a height.
      const reach = (y: number) => {
        let right = -Infinity, low = -Infinity, high = Infinity;
        for (const p of feature.outer) {
          anchorOnScreen.set(p.x, y, -p.y).project(camera);
          const sy = ((1 - anchorOnScreen.y) / 2) * h;
          right = Math.max(right, ((anchorOnScreen.x + 1) / 2) * w);
          low = Math.max(low, sy);
          high = Math.min(high, sy);
        }
        return { right, low, high };
      };
      tags = feature.floors.map((_, i) => {
        const foot = reach(i * pitch), head = reach(i * pitch + feature.storey);
        const top = Math.max(head.high, i < last ? reach((i + 1) * pitch).low : -Infinity);
        return { x: Math.round(Math.max(foot.right, head.right)), y: Math.round((foot.low + top) / 2) };
      });
    }
    const key = JSON.stringify(tags);
    if (key === floorTagsKey) return;
    floorTagsKey = key;
    options.onFloors(tags);
  };

  // A turn: the camera circles once around what it looks at, a landmark it has flown to or the middle of the
  // view, and the focus stays. A drag, zoom or flight stops it; one asked for during a flight starts on arrival.
  // `done`: the share of the turn made so far.
  let orbit: { elapsed: number; done: number } | null = null;
  const setOrbit = (on: boolean) => {
    if (on === (orbit !== null) || (on && options.reducedMotion)) return;
    orbit = on ? { elapsed: 0, done: 0 } : null;
    if (on) {
      touched = true;
      controls.autoRotate = false;
      requestRender();
    }
    options.onOrbit(on);
  };

  // The featured building apart or whole: `apart` is where it's heading, `spread` (0–1) how far it has got. It
  // starts coming apart once a flight to it has landed; going back together doesn't wait for one.
  let apart = false, spread = 0;
  // While it's apart the city is drawn see-through, after the solid floors, without writing depth.
  const blockMaterial = buildings.material as MeshLambertMaterial, roofMaterial = roofs.material as LineBasicMaterial;
  const placeFloors = () => {
    if (!feature) return;
    const e = easeInOut(spread), last = feature.floors.length - 1;
    feature.floors.forEach((f, i) => {
      f.mesh.position.y = f.edges.position.y = f.pick.position.y = i * EXPLODE.gap * e;
      f.edges.visible = i === last || e > 0;
    });
    const seeThrough = e > 0;
    if (blockMaterial.transparent !== seeThrough) {
      blockMaterial.transparent = seeThrough;
      blockMaterial.depthWrite = !seeThrough;
      blockMaterial.needsUpdate = true;
    }
    blockMaterial.opacity = 1 - (1 - EXPLODE.ghost) * e;
    roofMaterial.opacity = 0.55 * blockMaterial.opacity;
    repaintFeature();
  };
  const setApart = (on: boolean) => {
    if (!feature || on === apart) return;
    apart = on;
    if (options.reducedMotion) {
      spread = on ? 1 : 0;
      placeFloors();
    }
    if (!on && hoveredFloor >= 0) {
      highlight([]);
      options.onInfo(null);
    }
    options.onExplode(on);
    requestRender();
  };

  // A flight: target and camera ease to a new view along an arc; any drag cancels it. `arrive` runs at the end.
  type Flight = { fromTarget: Vector3; toTarget: Vector3; fromPos: Vector3; toPos: Vector3; start: number; lift: number; arrive?: () => void };
  let flight: Flight | null = null;
  const azimuthNow = () => MathUtils.radToDeg(new Spherical().setFromVector3(camera.position.clone().sub(controls.target)).theta);
  const flyToView = (target: Vector3, position: Vector3, arrive?: () => void) => {
    touched = true;
    controls.autoRotate = false;
    setOrbit(false);
    setApart(false);
    clearFocus();
    options.onInfo(null);
    highlight([]);
    if (options.reducedMotion) {
      controls.target.copy(target);
      camera.position.copy(position);
      controls.update();
      arrive?.();
      requestRender();
      return;
    }
    flight = { fromTarget: controls.target.clone(), toTarget: target, fromPos: camera.position.clone(), toPos: position, start: performance.now(), lift: camera.position.distanceTo(position) * 0.2, arrive };
    controls.enableDamping = false;
    requestRender();
  };
  const endFlight = (arrived: boolean) => {
    const arrive = flight?.arrive;
    flight = null;
    controls.enableDamping = !options.reducedMotion;
    if (arrived) arrive?.();
  };
  controls.addEventListener("start", () => {
    controls.autoRotate = false;
    touched = true;
    if (flight) endFlight(false);
    setOrbit(false);
    clearFocus();
    options.onInfo(null);
    highlight([]);
  });

  // ---------- frame loop ----------

  // Render on demand: a frame loop runs only while the camera moves (damping, auto-rotate, a flight, a turn) and
  // on screen. One frame is ever pending: update() fires "change", which may already have asked for the next one.
  let raf = 0, dirty = true, visible = true, lastFrame = 0;
  const frame = (now: number) => {
    raf = 0;
    // A turn advances by the time between frames, capped, so it pauses off screen rather than jumping ahead.
    const dt = Math.min(now - (lastFrame || now), 50);
    lastFrame = now;
    if (flight) {
      const t = Math.min(1, (now - flight.start) / FLIGHT.ms), e = easeInOut(t);
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, e);
      camera.position.lerpVectors(flight.fromPos, flight.toPos, e);
      camera.position.y += Math.sin(Math.PI * e) * flight.lift;
      if (t === 1) endFlight(true);
    } else if (orbit) {
      // The same way round as the opening drift; turning by the step leaves any keyboard pan in place.
      orbit.elapsed = Math.min(ORBIT.ms, orbit.elapsed + dt);
      const done = orbitProgress(orbit.elapsed / ORBIT.ms);
      camera.position.sub(controls.target).applyAxisAngle(camera.up, -2 * Math.PI * (done - orbit.done)).add(controls.target);
      orbit.done = done;
      if (orbit.elapsed === ORBIT.ms) setOrbit(false);
    }
    const goal = apart ? 1 : 0, spreading = spread !== goal;
    if (spreading && (!apart || !flight)) {
      spread = MathUtils.clamp(spread + (apart ? dt : -dt) / EXPLODE.ms, 0, 1);
      placeFloors();
    }
    const moved = controls.update() || flight !== null;
    const breathing = focus !== null && !options.reducedMotion;
    if (breathing) {
      // The building swells from its own colour to the highlight and back; the ring grows outward and fades.
      const phase = ((now - focus!.start) % BREATH_MS) / BREATH_MS, w = 0.5 + 0.5 * Math.cos(2 * Math.PI * phase);
      for (const k of highlighted) paintBlock(k, blockColour(k, breath).lerp(glow, w));
      upload(highlighted);
      ping.scale.setScalar(focus!.radius * (1 + 1.4 * phase));
      (ping.material as MeshBasicMaterial).opacity = 0.85 * (1 - phase);
    }
    if (moved || dirty || breathing || spreading) {
      renderer.render(scene, camera);
      dirty = false;
      wholePending = false;
    }
    pinFocusLabel();
    pinFloorTags();
    if (!raf && visible && (moved || controls.autoRotate || breathing || orbit || spreading)) raf = requestAnimationFrame(frame);
  };
  function requestRender() {
    dirty = true;
    if (!raf && visible) raf = requestAnimationFrame(frame);
  }
  controls.addEventListener("change", requestRender);

  // ---------- picking ----------

  // The block under a point of the canvas (CSS px), from a 1×1 render of the picking colours there. The featured
  // building's floors go on top in a second pass: hidden behind nearer blocks while it's whole, but never by the
  // see-through city while it's apart.
  const pick = (x: number, y: number) => {
    const ratio = renderer.getPixelRatio();
    camera.setViewOffset(canvas.width, canvas.height, Math.floor(x * ratio), Math.floor(y * ratio), 1, 1);
    renderer.setRenderTarget(pickTarget);
    renderer.render(pickScene, camera);
    if (feature) {
      renderer.autoClear = false;
      if (apart) renderer.clearDepth();
      renderer.render(floorPickScene, camera);
      renderer.autoClear = true;
    }
    renderer.setRenderTarget(null);
    camera.clearViewOffset();
    renderer.readRenderTargetPixels(pickTarget, 0, 0, 1, 1, pixel);
    return ((pixel[0] << 16) | (pixel[1] << 8) | pixel[2]) - 1;
  };
  const infoOf = (k: number): BuildingInfo => ({
    name: b.name[k] >= 0 ? city.meta.names[b.name[k]] : null,
    height: b.groupHeight[k] / 10,
    levels: b.levels[k],
    source: b.heightSource[k],
    category: b.category[k],
  });
  // A hover over empty ground or the focused building leaves a focus in place; anything else replaces it. The
  // featured building shows as one while it's whole and floor by floor while it's apart.
  const show = (x: number, y: number, pinned: boolean) => {
    const hit = pick(x, y), floor = feature && hit >= blockCount ? hit - blockCount : -1, k = floor >= 0 ? feature!.block : hit;
    if (focus && !pinned && (k < 0 || highlighted.includes(k))) return focus.info;
    clearFocus();
    if (k < 0) {
      highlight([]);
      options.onInfo(null);
      return null;
    }
    let info = infoOf(k);
    if (feature && floor >= 0 && apart) {
      highlight([], floor);
      info = { ...info, floor: { number: floor + 1, of: feature.floors.length, storey: feature.storey, area: feature.area } };
    } else {
      highlight(blocksOf(k));
    }
    options.onInfo({ info, x, y, width: canvas.clientWidth, height: canvas.clientHeight, pinned });
    return info;
  };

  // Hover with a mouse (one pick per frame); tap with a finger or pen (a press that barely moves).
  let hoverAt: { x: number; y: number } | null = null, hoverRaf = 0, down: { x: number; y: number } | null = null;
  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || event.buttons || flight) return;
    hoverAt = { x: event.offsetX, y: event.offsetY };
    if (!hoverRaf) hoverRaf = requestAnimationFrame(() => {
      hoverRaf = 0;
      if (hoverAt) show(hoverAt.x, hoverAt.y, false);
    });
  };
  const onLeave = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || focus) return;
    hoverAt = null;
    highlight([]);
    options.onInfo(null);
  };
  const onDown = (event: PointerEvent) => { down = { x: event.offsetX, y: event.offsetY }; };
  const onUp = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" && down && Math.hypot(event.offsetX - down.x, event.offsetY - down.y) < TAP_SLOP) {
      show(event.offsetX, event.offsetY, true);
    }
    down = null;
  };
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);

  // ---------- size and visibility ----------

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!touched) frameCity();
    controls.update();
    requestRender();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) requestRender();
    else { cancelAnimationFrame(raf); raf = 0; }
  });
  io.observe(canvas);

  resize();
  setPalette(options.palette);

  return {
    setPalette,
    setColourMode(next) {
      mode = next;
      paintAll();
    },
    legend: () => legendCache!,
    // Tall landmarks are framed whole: the camera looks at a point partway up and stands back with the height.
    flyTo(lat, lon, label) {
      const { x, z } = toScene(city.meta, lat, lon), k = blockAt(x, -z), roof = k >= 0 ? roofOf(blocksOf(k)) : 0;
      const target = new Vector3(x, roof * 0.45, z);
      flyToView(target, viewPosition(target, Math.max(FLIGHT.distance, roof * 2.8), FLIGHT.polar, azimuthNow()), () => startFocus(x, z, label));
    },
    orbit: setOrbit,
    // Apart, the stack is seen close up from the side the camera is on; a flight there comes first, unless the
    // camera is already in place.
    explode(on) {
      if (!feature || on === apart) return;
      if (on) {
        const target = feature.centre.clone().setY(feature.top / 2);
        const position = viewPosition(target, EXPLODE.distance, EXPLODE.polar, azimuthNow());
        if (camera.position.distanceTo(position) > 1 || controls.target.distanceTo(target) > 1) flyToView(target, position);
      }
      setApart(on);
    },
    resetView() {
      const view = openingView();
      flyToView(view.target.clone(), viewPosition(view.target, view.distance, view.polar, view.azimuth));
    },
    describeCentre() {
      return show(canvas.clientWidth / 2, canvas.clientHeight / 2, true);
    },
    dispose() {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(hoverRaf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      controls.dispose();
      for (const object of [ground, water, parks, minor, major, buildings, roofs, ping, ...(feature?.floors.map((f) => f.mesh) ?? [])]) {
        object.geometry.dispose();
        (object.material as MeshBasicMaterial).dispose();
      }
      for (const f of feature?.floors ?? []) f.edges.geometry.dispose();
      picker.dispose();
      pickTarget.dispose();
      renderer.dispose();
    },
  };
}
