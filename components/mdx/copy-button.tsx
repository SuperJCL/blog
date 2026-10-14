"use client";

import { useEffect, useState } from "react";

type Props = { text: string; label: string; done: string };

// Copies a code block. If the browser refuses the clipboard nothing happens; the code can still be selected.
export function CopyButton({ text, label, done }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(text).then(() => setCopied(true), () => {})}
      className="rounded border border-code-line px-2.5 py-1.5 text-code-fg transition-colors hover:border-syntax-keyword hover:text-syntax-keyword"
    >
      <span aria-live="polite">{copied ? done : label}</span>
    </button>
  );
}
