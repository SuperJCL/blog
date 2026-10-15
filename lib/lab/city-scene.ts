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
  ShapeUtils,
  Spherical,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { City, Shapes } from "./city-data";

// The Seattle demo's Three.js scene: every building extruded into one merged mesh (one draw call), flat layers
// for land, water, parks and roads, orbit controls, and rendering only while something moves.
// Three.js space: x east, y up, z south, in metres from the data's origin.

export type CityPalette = { bg: string; surface: string; line: string; muted: string; fg: string; mark: string };
export type CityScene = { setPalette(palette: CityPalette): void; dispose(): void };
type Options = { palette: CityPalette; reducedMotion: boolean };

// The opening view. Wide frames look from over Elliott Bay (west-southwest), between the downtown towers and
// Seattle Center: the skyline in front, the Space Needle behind on the left. Upright frames (phones) look north
// from the south-southwest, along the map's long side. Azimuth 0 is south, negative toward the west.
const VIEWS = {
  wide: { target: new Vector3(300, 0, 150), distance: 2700, polar: 62, azimuth: -75 },
  tall: { target: new Vector3(320, 0, 120), distance: 3300, polar: 56, azimuth: -22 },
};
const ROAD_WIDTH = [14, 8]; // metres: major, minor

const mix = (a: Color, b: Color, t: number) => a.clone().lerp(b, t);
// Building colour by height, on a log scale up to the tallest tower (~286 m): low blocks sit near the ground
// colour, towers rise into the accent.
const heightT = (m: number) => MathUtils.clamp(Math.log1p(m / 6) / Math.log1p(250 / 6), 0, 1);

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
function buildingGeometry(b: City["buildings"], q: number) {
  let vertices = 0, triangles = 0, edges = 0;
  for (let k = 0; k < b.count.length; k++) {
    vertices += 2 * b.count[k];
    triangles += 3 * b.count[k] - 2;
    edges += b.count[k];
  }
  const position = new Float32Array(vertices * 3), index = new Uint32Array(triangles * 3), roofLines = new Float32Array(edges * 6);
  let v = 0, t = 0, e = 0;
  const pa = new Vector3(), ab = new Vector3(), ac = new Vector3();
  for (let k = 0; k < b.count.length; k++) {
    const n = b.count[k], base = v, top = b.height[k] / 10, bottom = b.minHeight[k] / 10, contour: Vector2[] = [];
    for (let i = 0; i < n; i++) {
      const p = 2 * (b.start[k] + i), x = b.coords[p] * q, north = b.coords[p + 1] * q;
      contour.push(new Vector2(x, north));
      position.set([x, bottom, -north], 3 * (base + i));
      position.set([x, top, -north], 3 * (base + n + i));
    }
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
  geometry.setIndex(new BufferAttribute(index.subarray(0, t), 1));
  const lines = new BufferGeometry();
  lines.setAttribute("position", new BufferAttribute(roofLines, 3));
  return { geometry, lines };
}

export function createCityScene(canvas: HTMLCanvasElement, keyTarget: HTMLElement, city: City, options: Options): CityScene {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); // throws without WebGL
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const q = city.meta.quantum, { minX, maxX, minY, maxY } = city.meta.bounds;
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
  const { geometry, lines } = buildingGeometry(city.buildings, q);
  const buildings = new Mesh(geometry, new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  const roofs = new LineSegments(lines, new LineBasicMaterial({ transparent: true, opacity: 0.55 }));
  buildings.renderOrder = roofs.renderOrder = 10;
  scene.add(buildings, roofs);

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
    const low = mix(c.surface, c.fg, 0.1), mid = mix(c.surface, c.fg, 0.42), high = c.mark;
    const colors = geometry.getAttribute("color") as BufferAttribute, b = city.buildings, color = new Color();
    for (let k = 0, v = 0; k < b.count.length; k++) {
      const t = heightT(b.height[k] / 10);
      color.copy(t < 0.5 ? mix(low, mid, t / 0.5) : mix(mid, high, (t - 0.5) / 0.5));
      for (let i = 0; i < b.count[k]; i++) colors.setXYZ(v + i, color.r * 0.5, color.g * 0.5, color.b * 0.5); // shaded foot
      for (let i = 0; i < b.count[k]; i++) colors.setXYZ(v + b.count[k] + i, color.r, color.g, color.b);
      v += 2 * b.count[k];
    }
    colors.needsUpdate = true;
    requestRender();
  }

  const controls = new OrbitControls(camera, canvas);
  let touched = false; // once someone moves the camera, resizing no longer reframes it
  const frameCity = () => {
    const view = camera.aspect < 1 ? VIEWS.tall : VIEWS.wide;
    controls.target.copy(view.target);
    camera.position.setFromSpherical(new Spherical(view.distance, MathUtils.degToRad(view.polar), MathUtils.degToRad(view.azimuth))).add(view.target);
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
  // A slow turn until someone takes over.
  controls.addEventListener("start", () => {
    controls.autoRotate = false;
    touched = true;
  });

  // Render on demand: a frame loop runs only while the camera moves (damping, auto-rotate) and on screen.
  // One frame is ever pending: update() fires "change", which may already have asked for the next one.
  let raf = 0, dirty = true, visible = true;
  const frame = () => {
    raf = 0;
    const moved = controls.update();
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
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      controls.dispose();
      for (const object of [ground, water, parks, minor, major, buildings, roofs]) {
        object.geometry.dispose();
        (object.material as MeshBasicMaterial).dispose();
      }
      renderer.dispose();
    },
  };
}
