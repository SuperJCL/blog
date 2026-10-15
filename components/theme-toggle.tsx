"use client";

import { useEffect, useSyncExternalStore } from "react";
import { themeKey } from "@/lib/theme";

const systemDark = () => matchMedia("(prefers-color-scheme: dark)");

// Re-reads on a system change and when the toggle (on this or another header render) sets data-theme.
function subscribe(onChange: () => void) {
  const media = systemDark();
  media.addEventListener("change", onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => {
    media.removeEventListener("change", onChange);
    observer.disconnect();
  };
}

const isDark = () => {
  const chosen = document.documentElement.dataset.theme;
  return chosen ? chosen === "dark" : systemDark().matches;
};

// The browser's UI color follows a chosen theme (the layout's theme-color tags otherwise follow the system).
function syncThemeColor() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) meta.content = bg;
}

// Light/dark switch in the header. A toggle button ("Dark theme", pressed or not); the icon shows what a press
// gives. The icon is chosen in CSS (theme-dark:), so it's right from the first paint, before hydration.
export function ThemeToggle({ label, className }: { label: string; className?: string }) {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  useEffect(() => {
    if (document.documentElement.dataset.theme) syncThemeColor();
  }, []);

  const toggle = () => {
    const next = isDark() ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(themeKey, next);
    } catch {
      // Storage refused (private mode): the choice lasts for this page only.
    }
    syncThemeColor();
  };

  return (
    <button type="button" aria-pressed={dark} aria-label={label} title={label} onClick={toggle} className={className}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 theme-dark:hidden" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7Z" />
      </svg>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="hidden size-3.5 theme-dark:block" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
      </svg>
    </button>
  );
}
