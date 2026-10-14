type Props = { n: string; title: string; id?: string; prose?: boolean; children: React.ReactNode };

// A page section with a numbered label that stays in view while its content scrolls (case studies, about page).
// `prose` styles the content as long-form text.
export function NumberedSection({ n, title, id, prose = false, children }: Props) {
  return (
    <section id={id} className="grid gap-x-16 gap-y-5 border-t border-line py-section md:grid-cols-[minmax(11rem,1fr)_minmax(0,2.6fr)]">
      <h2 className="flex items-baseline gap-4 self-start type-display text-section md:sticky md:top-sticky md:flex-col md:gap-3">
        <span className="font-mono text-xs tracking-widest text-accent-text">{n}</span>
        {title}
      </h2>
      <div className={prose ? "prose min-w-0 text-read" : "min-w-0"}>{children}</div>
    </section>
  );
}
