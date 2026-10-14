import { NumberedSection } from "@/components/numbered-section";
import { getDictionary } from "@/i18n/get-dictionary";

type Props = { children: React.ReactNode };

async function Section({ n, part, children }: Props & { n: string; part: "problem" | "role" | "approach" | "result" }) {
  const dict = await getDictionary();
  return (
    <NumberedSection n={n} title={dict.projects.sections[part]} prose>
      {children}
    </NumberedSection>
  );
}

// The body of a project MDX file is exactly these four, in order (checked in content-collections.ts).
export const Problem = ({ children }: Props) => <Section n="01" part="problem">{children}</Section>;
export const Role = ({ children }: Props) => <Section n="02" part="role">{children}</Section>;
export const Approach = ({ children }: Props) => <Section n="03" part="approach">{children}</Section>;
export const Result = ({ children }: Props) => <Section n="04" part="result">{children}</Section>;
