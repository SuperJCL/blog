"use client";

import { useEffect, useRef, useState } from "react";
import { loadCity } from "@/lib/lab/city-data";
import type { CityPalette, CityScene } from "@/lib/lab/city-scene";

type Labels = {
  viewer: string;
  loading: string;
  failed: string;
  noWebgl: string;
  hintPointer: string;
  hintTouch: string;
  hintKeys: string;
  attribution: string;
};

// The tokens where the viewer sits, so the city follows the theme.
function readPalette(el: HTMLElement): CityPalette {
  const cs = getComputedStyle(el), v = (name: string) => cs.getPropertyValue(`--${name}`).trim();
  return { bg: v("bg"), surface: v("surface"), line: v("line"), muted: v("muted"), fg: v("fg"), mark: v("accent-text") };
}

// The 3D map of central Seattle. Three.js and the scene load with the data, after the page has painted; the
// frame shows a status line until the city is up, or instead of it when the data or WebGL is missing.
export function CityViewer({ data, labels }: { data: string; labels: Labels }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed" | "noWebgl">("loading");

  useEffect(() => {
    const frame = frameRef.current, canvas = canvasRef.current;
    if (!frame || !canvas) return;
    let scene: CityScene | null = null, cancelled = false;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const system = matchMedia("(prefers-color-scheme: dark)");
    const repaint = () => scene?.setPalette(readPalette(frame));
    const themeObserver = new MutationObserver(repaint);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    system.addEventListener("change", repaint);

    Promise.all([loadCity(data), import("@/lib/lab/city-scene")])
      .then(([city, { createCityScene }]) => {
        if (cancelled) return;
        try {
          scene = createCityScene(canvas, frame, city, { palette: readPalette(frame), reducedMotion: reduce });
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
      scene?.dispose();
    };
  }, [data]);

  const message = status === "loading" ? labels.loading : status === "failed" ? labels.failed : status === "noWebgl" ? labels.noWebgl : null;
  return (
    <div
      ref={frameRef}
      role="group"
      aria-label={labels.viewer}
      aria-describedby="city-viewer-keys"
      tabIndex={0}
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
      {status === "ready" && (
        <p aria-hidden="true" className="pointer-events-none absolute top-3 left-3 mr-3 rounded-2xl bg-bg/80 px-3 py-1.5 type-label text-muted backdrop-blur-sm">
          <span className="pointer-coarse:hidden">{labels.hintPointer}</span>
          <span className="hidden pointer-coarse:inline">{labels.hintTouch}</span>
        </p>
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
  );
}
