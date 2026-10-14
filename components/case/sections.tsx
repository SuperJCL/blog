import { getDictionary } from "@/i18n/get-dictionary";

type Props = { children: React.ReactNode };

// One of the four fixed case-study sections: a numbered label that stays in view while its text scrolls.
async function Section({ n, part, children }: Props & { n: string; part: "problem" | "role" | "approach" | "result" }) {
  const dict = await getDictionary();
  return (
    <section className="grid gap-x-16 gap-y-5 border-t border-line py-section md:grid-cols-[minmax(11rem,1fr)_minmax(0,2.6fr)]">
      <h2 className="flex items-baseline gap-4 self-start type-display text-section md:sticky md:top-sticky md:flex-col md:gap-3">
        <span className="font-mono text-xs tracking-widest text-accent-text">{n}</span>
        {dict.projects.sections[part]}
      </h2>
      <div className="prose min-w-0 text-read">{children}</div>
    </section>
  );
}

// The body of a project MDX file is exactly these four, in order (checked in content-collections.ts).
export const Problem = ({ children }: Props) => <Section n="01" part="problem">{children}</Section>;
export const Role = ({ children }: Props) => <Section n="02" part="role">{children}</Section>;
export const Approach = ({ children }: Props) => <Section n="03" part="approach">{children}</Section>;
export const Result = ({ children }: Props) => <Section n="04" part="result">{children}</Section>;
