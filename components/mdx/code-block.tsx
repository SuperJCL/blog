import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { getDictionary } from "@/i18n/get-dictionary";
import { CopyButton } from "./copy-button";

// Display names for the fence languages used on the site; others show as written.
const LANGUAGES: Record<string, string> = {
  ts: "TypeScript", tsx: "TSX", js: "JavaScript", jsx: "JSX", css: "CSS", json: "JSON",
  bash: "Shell", sh: "Shell", html: "HTML", sql: "SQL", md: "Markdown", mdx: "MDX",
};

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

// MDX `pre`: a code panel, dark in both themes, with the language and a copy button.
export async function CodeBlock({ children }: { children?: ReactNode }) {
  const dict = await getDictionary();
  const code = Children.toArray(children).find(isValidElement) as ReactElement<{ className?: string }> | undefined;
  const fence = /language-([\w-]+)/.exec(code?.props.className ?? "")?.[1];
  const language = fence ? (LANGUAGES[fence] ?? fence) : null;
  return (
    // .stage keeps the panel's tokens dark on the light theme too: the focus ring in the bright accent, a dark
    // native scrollbar.
    <div className="stage overflow-hidden rounded-md border border-code-line bg-code text-code-fg">
      <div className="flex items-center justify-between gap-4 border-b border-code-line py-2 pr-2 pl-4 font-mono text-xs tracking-wide text-code-muted">
        <span>{language}</span>
        <CopyButton text={textOf(children).replace(/\n$/, "")} label={dict.blog.copy} done={dict.blog.copied} />
      </div>
      {/* Focusable, so a code line wider than the panel can be scrolled from the keyboard. The ring sits inside:
          outside it would be clipped by the panel. */}
      <pre tabIndex={0} className="overflow-x-auto px-4 py-4 font-mono text-snippet tracking-normal focus-visible:-outline-offset-2">
        {children}
      </pre>
    </div>
  );
}

// Wide tables scroll on their own instead of widening the page. MDX also maps markdown tables here.
export function Table({ children }: { children?: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table>{children}</table>
    </div>
  );
}
