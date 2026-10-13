import { SiteFooter } from "@/components/site-footer";

// Every page except the homepage, whose last screen carries the contact details instead of a footer.
export default function PagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SiteFooter />
    </>
  );
}
