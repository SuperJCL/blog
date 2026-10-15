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
// landmarks, and rendering only while something moves.
// Three.js space: x east, y up, z south, in metres from the data's origin.

export type CityPalette = { bg: string; surface: string; line: string; muted: string; fg: string; mark: string; blue: string; amber: string };
export type ColourMode = "height" | "use";
export type BuildingInfo = { name: CityMeta["names"][number] | null; height: number; levels: number; source: number; category: number };
// What's under the pointer (hover) or was tapped or asked about (pinned), at a point in the canvas, in CSS px;
// `width` and `height` are the canvas's, for keeping a label beside the point inside it.
export type InfoEvent = { info: BuildingInfo; x: number; y: number; width: number; height: number; pinned: boolean } | null;
export type Legend = { height: { colours: string[]; ticks: { metres: number; at: number }[] }; use: string[] };
export type CityScene = {
  setPalette(palette: CityPalette): void;
  setColourMode(mode: ColourMode): void;
  legend(): Legend;
  flyTo(lat: number, lon: number): void;
  resetView(): void;
  describeCentre(): BuildingInfo | null;
  dispose(): void;
};
type Options = { palette: CityPalette; reducedMotion: boolean; onInfo(event: InfoEvent): void };

// The opening view. Wide frames look from over Elliott Bay (west-southwest), between the downtown towers and
// Seattle Center: the skyline in front, the Space Needle behind on the left. Upright frames (phones) look north
// from the south-southwest, along the map's long side. Azimuth 0 is south, negative toward the west.
const VIEWS = {
  wide: { target: new Vector3(300, 0, 150), distance: 2700, polar: 62, azimuth: -75 },
  tall: { target: new Vector3(320, 0, 120), distance: 3300, polar: 56, azimuth: -22 },
};
const FLIGHT = { distance: 720, polar: 58, ms: 1600 }; // how a landmark is framed, and how long getting there takes
const ROAD_WIDTH = [14, 8]; // metres: major, minor
const TAP_SLOP = 6; // px a tap may move and still count as a tap

const mix = (a: Color, b: Color, t: number) => a.clone().lerp(b, t);
// Building colour by height, on a log scale up to the tallest tower (~286 m): low blocks sit near the ground
// colour, towers rise into the accent.
const heightT = (m: number) => MathUtils.clamp(Math.log1p(m / 6) / Math.log1p(250 / 6), 0, 1);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

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
// Every vertex also carries its block's number + 1 as an RGB colour, for picking.
function buildingGeometry(b: City["buildings"], q: number) {
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
    for (let i = 0; i < 2 * n; i++) pick.set([(id >> 16) & 255, (id >> 8) & 255, id & 255], 3 * (base + i));
    v += 2 * n;
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
  lines.setAttribute("position", new BufferAttribute(roofLines, 3));
  return { geometry, lines, firstVertex };
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
  const { geometry, lines, firstVertex } = buildingGeometry(b, q);
  const buildings = new Mesh(geometry, new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  const roofs = new LineSegments(lines, new LineBasicMaterial({ transparent: true, opacity: 0.55 }));
  buildings.renderOrder = roofs.renderOrder = 10;
  scene.add(buildings, roofs);

  const pickScene = new Scene();
  pickScene.background = new Color(0); // 0: no building
  pickScene.add(new Mesh(geometry, pickMaterial()));
  const pickTarget = new WebGLRenderTarget(1, 1);
  const pixel = new Uint8Array(4);

  // Blocks of one named building light up together on hover.
  const sameBuilding = new Map<number, number[]>();
  for (let k = 0; k < b.name.length; k++) if (b.name[k] >= 0) sameBuilding.set(b.name[k], [...(sameBuilding.get(b.name[k]) ?? []), k]);
  const blocksOf = (k: number) => (b.name[k] >= 0 ? sameBuilding.get(b.name[k])! : [k]);

  // ---------- colour ----------

  let mode: ColourMode = "height", highlighted: number[] = [];
  let ramp: Color[] = [], kinds: Color[] = [], glow = new Color(), legendCache: Legend | null = null;
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
  };
  const paintAll = () => {
    for (let k = 0; k < b.count.length; k++) paintBlock(k, blockColour(k, scratch));
    for (const k of highlighted) paintBlock(k, glow);
    colours.needsUpdate = true;
    requestRender();
  };
  const highlight = (blocks: number[]) => {
    if (blocks.length === highlighted.length && blocks.every((k, i) => k === highlighted[i])) return;
    for (const k of highlighted) paintBlock(k, blockColour(k, scratch));
    highlighted = blocks;
    for (const k of highlighted) paintBlock(k, glow);
    colours.needsUpdate = true;
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
    (roofs.material as LineBasicMaterial).color = mix(c.mark, c.fg, 0.35);
    ramp = [mix(c.surface, c.fg, 0.1), mix(c.surface, c.fg, 0.42), c.mark];
    kinds = [c.mark, c.blue, c.amber, mix(c.surface, c.fg, 0.3)]; // office & commercial, residential, civic, other
    glow = c.fg;
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

  // A flight: target and camera ease to a new view along an arc; any drag cancels it.
  type Flight = { fromTarget: Vector3; toTarget: Vector3; fromPos: Vector3; toPos: Vector3; start: number; lift: number };
  let flight: Flight | null = null;
  const flyToView = (target: Vector3, position: Vector3) => {
    touched = true;
    controls.autoRotate = false;
    options.onInfo(null);
    highlight([]);
    if (options.reducedMotion) {
      controls.target.copy(target);
      camera.position.copy(position);
      controls.update();
      requestRender();
      return;
    }
    flight = { fromTarget: controls.target.clone(), toTarget: target, fromPos: camera.position.clone(), toPos: position, start: performance.now(), lift: camera.position.distanceTo(position) * 0.2 };
    controls.enableDamping = false;
    requestRender();
  };
  const endFlight = () => {
    flight = null;
    controls.enableDamping = !options.reducedMotion;
  };
  controls.addEventListener("start", () => {
    controls.autoRotate = false;
    touched = true;
    if (flight) endFlight();
    options.onInfo(null);
    highlight([]);
  });

  // ---------- frame loop ----------

  // Render on demand: a frame loop runs only while the camera moves (damping, auto-rotate, a flight) and on
  // screen. One frame is ever pending: update() fires "change", which may already have asked for the next one.
  let raf = 0, dirty = true, visible = true;
  const frame = (now: number) => {
    raf = 0;
    if (flight) {
      const t = Math.min(1, (now - flight.start) / FLIGHT.ms), e = easeInOut(t);
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, e);
      camera.position.lerpVectors(flight.fromPos, flight.toPos, e);
      camera.position.y += Math.sin(Math.PI * e) * flight.lift;
      if (t === 1) endFlight();
    }
    const moved = controls.update() || flight !== null;
    if (moved || dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
    if (!raf && visible && (moved || controls.autoRotate)) raf = requestAnimationFrame(frame);
  };
  function requestRender() {
    dirty = true;
    if (!raf && visible) raf = requestAnimationFrame(frame);
  }
  controls.addEventListener("change", requestRender);

  // ---------- picking ----------

  // The block under a point of the canvas (CSS px), from a 1×1 render of the picking colours there.
  const pick = (x: number, y: number) => {
    const ratio = renderer.getPixelRatio();
    camera.setViewOffset(canvas.width, canvas.height, Math.floor(x * ratio), Math.floor(y * ratio), 1, 1);
    renderer.setRenderTarget(pickTarget);
    renderer.render(pickScene, camera);
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
  const show = (x: number, y: number, pinned: boolean) => {
    const k = pick(x, y);
    if (k < 0) {
      highlight([]);
      options.onInfo(null);
      return null;
    }
    highlight(blocksOf(k));
    const info = infoOf(k);
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
    if (event.pointerType !== "mouse") return;
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
    flyTo(lat, lon) {
      const { x, z } = toScene(city.meta, lat, lon), target = new Vector3(x, 0, z);
      const azimuth = MathUtils.radToDeg(new Spherical().setFromVector3(camera.position.clone().sub(controls.target)).theta);
      flyToView(target, viewPosition(target, FLIGHT.distance, FLIGHT.polar, azimuth));
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
      for (const object of [ground, water, parks, minor, major, buildings, roofs]) {
        object.geometry.dispose();
        (object.material as MeshBasicMaterial).dispose();
      }
      (pickScene.children[0] as Mesh<BufferGeometry, ShaderMaterial>).material.dispose();
      pickTarget.dispose();
      renderer.dispose();
    },
  };
}
