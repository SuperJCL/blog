"use client";

import { useSyncExternalStore } from "react";
import type { TocEntry } from "@/lib/headings";

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange);
  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
}

// The current section is the last heading above a line 30% down the screen; at the very bottom, the last one.
function activeId(ids: string[]) {
  let active = ids[0] ?? "";
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.3) active = id;
  }
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) active = ids.at(-1) ?? active;
  return active;
}

type Props = { entries: TocEntry[]; label: string; variant: "aside" | "details" };

// Table of contents that follows the reader: a sticky side column on wide screens, a collapsed list above the
// text on narrow ones. h2 entries carry the same running numbers as the headings.
export function Toc({ entries, label, variant }: Props) {
  const ids = entries.map((entry) => entry.id);
  const current = useSyncExternalStore(subscribe, () => activeId(ids), () => ids[0] ?? "");
  const numbers = entries.reduce<string[]>((acc, entry) => {
    const count = acc.filter(Boolean).length;
    return [...acc, entry.depth === 2 ? String(count + 1).padStart(2, "0") : ""];
  }, []);
  const list = (
    <ol className="flex flex-col border-l border-line">
      {entries.map((entry, i) => (
        <li key={entry.id}>
          <a
            href={`#${entry.id}`}
            aria-current={entry.id === current ? "location" : undefined}
            className={`-ml-px block border-l-2 border-transparent py-1.5 text-sm leading-snug text-muted hover:text-fg aria-[current=location]:border-accent-text aria-[current=location]:text-fg ${entry.depth === 3 ? "pl-7 text-[0.8125rem]" : "pl-3.5"}`}
          >
            {numbers[i] && <span className="mr-2 font-mono text-[0.75em] text-accent-text">{numbers[i]}</span>}
            {entry.text}
          </a>
        </li>
      ))}
    </ol>
  );

  if (variant === "details") {
    return (
      <details className="group mb-8 border border-line">
        <summary className="flex cursor-pointer list-none justify-between px-4 py-3.5 type-label text-fg">
          {label}
          <span aria-hidden="true" className="group-open:hidden">+</span>
          <span aria-hidden="true" className="hidden group-open:inline">−</span>
        </summary>
        <nav aria-label={label} className="px-4 pb-4">
          {list}
        </nav>
      </details>
    );
  }
  return (
    <nav aria-label={label} className="flex flex-col gap-3.5">
      <p className="type-label text-muted">{label}</p>
      {list}
    </nav>
  );
}
