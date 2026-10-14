"use client";

import { useEffect, useRef } from "react";

type Props = { src: string; poster?: string; width: number; height: number; label: string; className?: string };

// A short muted loop that downloads and plays only while on screen. With reduced motion it doesn't start by
// itself: the poster shows, with controls to play it.
export function LoopVideo({ src, poster, width, height, label, className }: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.controls = true;
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio > 0) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: [0, 0.01] },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      width={width}
      height={height}
      muted
      loop
      playsInline
      preload="none"
      aria-label={label}
      className={className}
    />
  );
}
