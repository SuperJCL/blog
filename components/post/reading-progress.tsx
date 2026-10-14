"use client";

import { useEffect, useRef } from "react";

// A thin accent line across the top of the window that fills as the article is read.
export function ReadingProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  // The starting transform is inline: a Tailwind scale utility would multiply with the one set above.
  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{ transform: "scaleX(0)" }}
      className="fixed inset-x-0 top-0 z-30 h-0.5 origin-left bg-accent-text"
    />
  );
}
