"use client";

import { useEffect, useRef } from "react";
import { drawDiagram, drawTerrain, type SceneColors } from "@/lib/scene";

type Props = {
  scene: "terrain" | "diagram";
  seed: number;
  // Diagram only: keep the left part clear for overlaid text.
  room?: boolean;
  className?: string;
};

// Colors come from the design tokens where the canvas sits, so it follows the theme and .stage blocks.
// Thin marks use the accent as text color: the lime fill is too faint as a dot on the light ground.
function readColors(el: HTMLElement): SceneColors {
  const cs = getComputedStyle(el);
  return {
    fg: cs.getPropertyValue("--fg").trim(),
    mark: cs.getPropertyValue("--accent-text").trim(),
    dark: cs.colorScheme === "dark",
  };
}

// The terrain turns slowly while it's on screen, except during paging (data-paging on <html>) or with reduced motion.
export function SceneCanvas({ scene, seed, room = false, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const darkScheme = matchMedia("(prefers-color-scheme: dark)");
    let angle = seed * 0.37, visible = false, raf = 0;

    const draw = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.round(w * dpr), H = Math.round(h * dpr);
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const colors = readColors(canvas);
      if (scene === "terrain") drawTerrain(ctx, w, h, colors, seed, angle);
      else drawDiagram(ctx, w, h, colors, seed, room);
    };
    const tick = () => {
      raf = 0;
      if (!visible || reduce.matches) return;
      if (!document.documentElement.hasAttribute("data-paging")) {
        angle += 0.0016;
        draw();
      }
      raf = requestAnimationFrame(tick);
    };
    const start = () => { if (scene === "terrain" && !raf) raf = requestAnimationFrame(tick); };

    // Turn only while mostly on screen. Ratio, not isIntersecting: a canvas that merely touches the viewport
    // edge still "intersects"; the 0.01 step reports the moment it leaves.
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.intersectionRatio >= 0.55;
      if (visible) start();
    }, { threshold: [0.01, 0.55] });
    io.observe(canvas);
    const ro = new ResizeObserver(() => draw());
    ro.observe(canvas);
    darkScheme.addEventListener("change", draw);
    reduce.addEventListener("change", start);
    draw();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      darkScheme.removeEventListener("change", draw);
      reduce.removeEventListener("change", start);
    };
  }, [scene, seed, room]);

  return <canvas ref={ref} aria-hidden="true" className={`block size-full ${className ?? ""}`} />;
}
