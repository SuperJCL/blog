import Link from "next/link";

type Side = { href: string; label: string; title: string; lang?: string };

const cell = "group flex min-w-0 flex-col gap-3 bg-bg p-6 text-fg transition-colors hover:bg-accent hover:text-accent-ink md:p-8";

// Previous and next at the end of a case study or article: two large links that fill with the accent on hover.
// At either end a side links back to the list, with the same words as label and title; screen readers get them once.
export function Pager({ label, prev, next }: { label: string; prev: Side; next: Side }) {
  return (
    <nav aria-label={label} className="mt-16 grid gap-px border border-line bg-line md:grid-cols-2">
      {[prev, next].map((side, i) => (
        <Link key={side.href + i} href={side.href} className={i ? `${cell} md:items-end md:text-right` : cell}>
          <span aria-hidden={side.label === side.title || undefined} className="type-label text-muted group-hover:text-accent-ink">
            {i ? (
              <>
                {side.label} <span aria-hidden="true">→</span>
              </>
            ) : (
              <>
                <span aria-hidden="true">←</span> {side.label}
              </>
            )}
          </span>
          <span lang={side.lang} className="font-display text-2xl leading-tight text-balance uppercase md:text-3xl zh:font-black">
            {side.title}
          </span>
        </Link>
      ))}
    </nav>
  );
}
