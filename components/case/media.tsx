import Image from "next/image";

const caption = "font-mono text-xs leading-relaxed text-pretty text-muted";

type FigureProps = { src: string; width: number; height: number; alt: string; caption?: string };

// A screenshot in a case study, at its own aspect ratio. Sizes follow the section's text column.
export function Figure({ src, width, height, alt, caption: text }: FigureProps) {
  return (
    <figure className="flex flex-col gap-3">
      <Image
        src={src}
        width={width}
        height={height}
        alt={alt}
        sizes="(min-width: 1320px) 860px, (min-width: 768px) 66vw, 100vw"
        className="h-auto w-full border border-line bg-surface"
      />
      {text && <figcaption className={caption}>{text}</figcaption>}
    </figure>
  );
}

// A left-to-right flow of steps (top to bottom on phones). Children are <Step> and <Arrow>.
export function Flow({ caption: text, children }: { caption?: string; children: React.ReactNode }) {
  return (
    <figure className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-stretch">{children}</div>
      {text && <figcaption className={caption}>{text}</figcaption>}
    </figure>
  );
}

type StepProps = { label: string; title: string; detail?: string; highlight?: boolean };

// `highlight` marks the outcome, filled with the accent.
export function Step({ label, title, detail, highlight = false }: StepProps) {
  const quiet = highlight ? "text-accent-ink/75" : "text-muted";
  return (
    <div
      className={`flex min-w-0 flex-auto flex-col gap-1.5 border px-4 py-3.5 ${highlight ? "border-accent bg-accent text-accent-ink" : "border-fg bg-bg text-fg"}`}
    >
      <span className={`type-label ${quiet}`}>{label}</span>
      <b className="leading-snug font-semibold">{title}</b>
      {detail && <span className={`text-sm leading-snug ${quiet}`}>{detail}</span>}
    </div>
  );
}

// `both` for a two-way link, such as video out and input back.
export function Arrow({ label, both = false }: { label?: string; both?: boolean }) {
  return (
    <div className="flex flex-none items-center justify-center gap-2 px-1 font-mono text-label text-muted md:flex-col md:gap-1">
      <span aria-hidden="true" className="text-lg leading-none text-fg">
        <span className="md:hidden">{both ? "⇅" : "↓"}</span>
        <span className="max-md:hidden">{both ? "⇄" : "→"}</span>
      </span>
      {label && <span>{label}</span>}
    </div>
  );
}

// Key figures at the top of the result section. Units keep their case ("30 s"), so no uppercase here.
export function Stats({ children }: { children: React.ReactNode }) {
  return <ul className="stats grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-x-8 gap-y-6">{children}</ul>;
}

export function Stat({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <li className="flex min-w-0 flex-col gap-2 border-t-2 border-fg pt-3.5">
      <b className="font-display text-stat font-normal text-fg zh:font-black">{value}</b>
      <span className="text-sm leading-normal text-muted">{children}</span>
    </li>
  );
}
