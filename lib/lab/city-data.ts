// Reads the Seattle demo data in public/lab/seattle, written by scripts/seattle-data.mjs: city.json describes the
// typed arrays packed in city.bin. Coordinates are metres from the origin (x east, y north), stored as Int16
// multiples of `quantum`; heights are Uint16 decimetres.

type SectionType = "Uint8" | "Uint16" | "Int16";
export type CityMeta = {
  extracted: string;
  quantum: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  categories: string[];
  heightSource: string[];
  counts: { buildings: number; roads: number; water: number; parks: number };
  sections: Record<string, { type: SectionType; offset: number; length: number }>;
  names: { en: string; zh?: string }[];
};

// A set of rings or lines: point i of item k is coords[2 * (start[k] + i)], coords[2 * (start[k] + i) + 1].
export type Shapes = { count: Uint16Array; start: Uint32Array; coords: Int16Array };

export type City = {
  meta: CityMeta;
  buildings: Shapes & {
    height: Uint16Array; // this block (a building or one of its parts)
    minHeight: Uint16Array;
    groupHeight: Uint16Array; // the whole building, shown on hover
    levels: Uint8Array;
    heightSource: Uint8Array; // index into meta.heightSource
    category: Uint8Array; // index into meta.categories
    name: Int16Array; // index into meta.names, -1 for none
  };
  roads: Shapes & { cls: Uint8Array }; // 0 major, 1 minor
  water: Shapes;
  parks: Shapes;
};

const arrays = { Uint8: Uint8Array, Uint16: Uint16Array, Int16: Int16Array };

export async function loadCity(base: string): Promise<City> {
  const [meta, buffer] = await Promise.all([
    fetch(`${base}/city.json`).then((r) => (r.ok ? (r.json() as Promise<CityMeta>) : Promise.reject(new Error(`city.json ${r.status}`)))),
    fetch(`${base}/city.bin`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`city.bin ${r.status}`)))),
  ]);
  const get = (name: string) => {
    const s = meta.sections[name];
    return new arrays[s.type](buffer, s.offset, s.length);
  };
  const shapes = (prefix: string): Shapes => {
    const count = get(`${prefix}VertexCount`) as Uint16Array;
    const start = new Uint32Array(count.length);
    for (let i = 1; i < count.length; i++) start[i] = start[i - 1] + count[i - 1];
    return { count, start, coords: get(`${prefix}Coords`) as Int16Array };
  };
  return {
    meta,
    buildings: {
      ...shapes("building"),
      height: get("buildingHeight") as Uint16Array,
      minHeight: get("buildingMinHeight") as Uint16Array,
      groupHeight: get("buildingGroupHeight") as Uint16Array,
      levels: get("buildingLevels") as Uint8Array,
      heightSource: get("buildingHeightSource") as Uint8Array,
      category: get("buildingCategory") as Uint8Array,
      name: get("buildingName") as Int16Array,
    },
    roads: { ...shapes("road"), cls: get("roadClass") as Uint8Array },
    water: shapes("water"),
    parks: shapes("park"),
  };
}
