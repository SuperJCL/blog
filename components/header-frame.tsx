"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

// The fixed header gains its bottom rule once content has scrolled under it, and turns dark over the
// homepage hero (data-hero-tint, see app/globals.css).
export function HeaderFrame({ className, children }: { className: string; children: React.ReactNode }) {
  const scrolled = useSyncExternalStore(
    subscribe,
    () => window.scrollY > 8,
    () => false,
  );
  return (
    <header className={className} data-scrolled={scrolled || undefined} data-hero-tint>
      {children}
    </header>
  );
}
