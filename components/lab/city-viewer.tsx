"use client";

import { useEffect, useRef, useState } from "react";
import { loadCity } from "@/lib/lab/city-data";
import type { BuildingInfo, CityPalette, CityScene, ColourMode, InfoEvent, Legend } from "@/lib/lab/city-scene";

type Labels = {
  viewer: string;
  loading: string;
  failed: string;
  noWebgl: string;
  hintPointer: string;
  hintTouch: string;
  hintKeys: string;
  attribution: string;
  colourBy: string;
  byHeight: string;
  byUse: string;
  categories: string[];
  flyTo: string;
  reset: string;
  arrived: string;
  unnamed: string;
  metres: string;
  floors: string;
  heightNote: string[];
  nothingThere: string;
};
type Place = { id: string; name: string; lat: number; lon: number };
type Props = { data: string; zh: boolean; places: Place[]; labels: Labels };

// The tokens where the viewer sits, so the city follows the theme.
function readPalette(el: HTMLElement): CityPalette {
  const cs = getComputedStyle(el), v = (name: string) => cs.getPropertyValue(`--${name}`).trim();
  return { bg: v("bg"), surface: v("surface"), line: v("line"), muted: v("muted"), fg: v("fg"), mark: v("accent-text"), blue: v("data-blue"), amber: v("data-amber") };
}

// The building label stays inside the frame. Beside a mouse pointer, flipped left near the right edge; centred
// on a tap (or the middle, for Enter), held back from the sides. Above the point when it's near the bottom.
const CARD_WIDTH = 256; // max-w-64
function cardPosition(e: NonNullable<InfoEvent>): React.CSSProperties {
  const below = e.y < e.height - 120 ? "14px" : "calc(-100% - 14px)";
  if (!e.pinned) return { left: e.x, top: e.y, transform: `translate(${e.x > e.width - CARD_WIDTH - 24 ? "calc(-100% - 14px)" : "14px"}, ${below})` };
  const half = CARD_WIDTH / 2 + 8;
  return { left: Math.min(Math.max(e.x, half), Math.max(half, e.width - half)), top: e.y, transform: `translate(-50%, ${below})` };
}

const chip =
  "rounded-full border border-line px-3 py-1.5 font-mono text-xs hover:border-fg aria-pressed:border-fg aria-pressed:bg-fg aria-pressed:text-bg data-on:border-accent-text data-on:text-accent-text";

// The 3D map of central Seattle. Three.js and the scene load with the data, after the page has painted; the
// frame shows a status line until the city is up, or instead of it when the data or WebGL is missing. Under the
// frame: the colouring, a reset, and landmarks to fly to. Hover (or tap) shows a building; with the frame
// focused, Enter describes the one in the middle, for keyboard and screen-reader users.
export function CityViewer({ data, zh, places, labels }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<CityScene | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed" | "noWebgl">("loading");
  const [mode, setMode] = useState<ColourMode>("height");
  const [legend, setLegend] = useState<Legend | null>(null);
  const [hover, setHover] = useState<InfoEvent>(null);
  const [said, setSaid] = useState("");
  const [place, setPlace] = useState<string | null>(null);

  useEffect(() => {
    const frame = frameRef.current, canvas = canvasRef.current;
    if (!frame || !canvas) return;
    let cancelled = false;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const system = matchMedia("(prefers-color-scheme: dark)");
    const repaint = () => {
      sceneRef.current?.setPalette(readPalette(frame));
      setLegend(sceneRef.current?.legend() ?? null);
    };
    const themeObserver = new MutationObserver(repaint);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    system.addEventListener("change", repaint);

    Promise.all([loadCity(data), import("@/lib/lab/city-scene")])
      .then(([city, { createCityScene }]) => {
        if (cancelled) return;
        try {
          sceneRef.current = createCityScene(canvas, frame, city, { palette: readPalette(frame), reducedMotion: reduce, onInfo: setHover });
          setLegend(sceneRef.current.legend());
          setStatus("ready");
        } catch {
          setStatus("noWebgl"); // WebGLRenderer throws when there's no context
        }
      })
      .catch(() => !cancelled && setStatus("failed"));

    return () => {
      cancelled = true;
      themeObserver.disconnect();
      system.removeEventListener("change", repaint);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [data]);

  const describe = (info: BuildingInfo) => {
    const name = info.name ? (zh ? (info.name.zh ?? info.name.en) : info.name.en) : labels.unnamed;
    const note = labels.heightNote[info.source];
    return {
      name,
      facts: [
        labels.metres.replace("{n}", String(Math.round(info.height))) + (note ? (zh ? `（${note}）` : ` (${note})`) : ""),
        ...(info.levels ? [labels.floors.replace("{n}", String(info.levels))] : []),
        labels.categories[info.category],
      ],
    };
  };
  const card = hover && describe(hover.info);

  const choose = (next: ColourMode) => {
    setMode(next);
    sceneRef.current?.setColourMode(next);
  };
  const fly = (p: Place) => {
    setPlace(p.id);
    sceneRef.current?.flyTo(p.lat, p.lon);
    setSaid(labels.arrived.replace("{place}", p.name));
  };
  const onKey = (event: React.KeyboardEvent) => {
    if (event.key !== "Enter" || event.target !== frameRef.current || !sceneRef.current) return;
    const info = sceneRef.current.describeCentre();
    if (!info) return setSaid(labels.nothingThere);
    const { name, facts } = describe(info);
    setSaid(zh ? `${name}：${facts.join("，")}` : `${name}: ${facts.join(", ")}`);
  };

  const message = status === "loading" ? labels.loading : status === "failed" ? labels.failed : status === "noWebgl" ? labels.noWebgl : null;
  return (
    <div className="flex flex-col gap-4">
      <div
        ref={frameRef}
        role="group"
        aria-label={labels.viewer}
        aria-describedby="city-viewer-keys"
        tabIndex={0}
        onKeyDown={onKey}
        className="relative aspect-viewer-tall w-full overflow-hidden border border-line bg-surface md:aspect-viewer"
      >
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 size-full touch-none" />
        {message && (
          <p role="status" className="absolute inset-0 grid place-items-center p-6 text-center font-mono text-sm text-muted">
            {message}
          </p>
        )}
        <p id="city-viewer-keys" className="sr-only">
          {labels.hintKeys}
        </p>
        <p className="sr-only" aria-live="polite">
          {said}
        </p>
        {status === "ready" && (
          <p aria-hidden="true" className="pointer-events-none absolute top-3 left-3 mr-3 rounded-2xl bg-bg/80 px-3 py-1.5 type-label text-muted backdrop-blur-sm">
            <span className="pointer-coarse:hidden">{labels.hintPointer}</span>
            <span className="hidden pointer-coarse:inline">{labels.hintTouch}</span>
          </p>
        )}
        {card && hover && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute flex max-w-64 flex-col gap-1 rounded-md border border-line bg-bg/90 px-3 py-2 text-sm backdrop-blur-sm"
            style={cardPosition(hover)}
          >
            <span className="font-medium text-pretty">{card.name}</span>
            <span className="font-mono text-label text-muted">{card.facts.join(" · ")}</span>
          </div>
        )}
        {status === "ready" && legend && (
          <div aria-hidden="true" className="pointer-events-none absolute bottom-8 left-3 flex flex-col gap-1.5 rounded-md bg-bg/80 px-3 py-2 font-mono text-label text-muted backdrop-blur-sm">
            {mode === "height" ? (
              <>
                <span className="block h-1.5 w-40" style={{ background: `linear-gradient(to right, ${legend.height.colours.join(", ")})` }} />
                <span className="relative block h-3 w-40">
                  {legend.height.ticks.map((tick) => (
                    <span key={tick.metres} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${tick.at * 100}%` }}>
                      {labels.metres.replace("{n}", String(tick.metres))}
                    </span>
                  ))}
                </span>
              </>
            ) : (
              labels.categories.map((name, i) => (
                <span key={name} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm" style={{ background: legend.use[i] }} />
                  {name}
                </span>
              ))
            )}
          </div>
        )}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-0 bottom-0 bg-bg/80 px-2 py-1 font-mono text-label text-muted hover:text-fg"
        >
          {labels.attribution}
        </a>
      </div>

      {status === "ready" && (
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-10">
          <div role="group" aria-label={labels.colourBy} className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="type-label text-muted">{labels.colourBy}</span>
            <button type="button" aria-pressed={mode === "height"} onClick={() => choose("height")} className={chip}>
              {labels.byHeight}
            </button>
            <button type="button" aria-pressed={mode === "use"} onClick={() => choose("use")} className={chip}>
              {labels.byUse}
            </button>
          </div>
          {/* Flights are actions, not toggles: the last place visited is only marked for the eye. */}
          <div role="group" aria-label={labels.flyTo} className="flex flex-wrap items-center gap-2 md:justify-end">
            <span className="type-label text-muted">{labels.flyTo}</span>
            {places.map((p) => (
              <button key={p.id} type="button" data-on={place === p.id || undefined} onClick={() => fly(p)} className={chip}>
                {p.name}
              </button>
            ))}
            <button type="button" onClick={() => { setPlace(null); sceneRef.current?.resetView(); }} className={chip}>
              {labels.reset}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
