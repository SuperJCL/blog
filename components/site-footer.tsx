import { contact, siteSince } from "@/data/profile";
import { getDictionary } from "@/i18n/get-dictionary";

export async function SiteFooter() {
  const dict = await getDictionary();
  const linkClass = "hover:text-fg";

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-x-8 gap-y-3 px-gutter py-8 text-sm text-muted">
        <p>
          © {siteSince} {dict.meta.title}
        </p>
        <nav aria-label={dict.footer.contactLabel}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {/* The address is shown as text so it can be copied when no mail app is set up. */}
            <li>
              <a href={`mailto:${contact.email}`} className={linkClass}>
                {contact.email}
              </a>
            </li>
            {contact.links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className={linkClass} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
