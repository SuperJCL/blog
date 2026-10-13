"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

// Without `current` it's the Suspense fallback, for prerendered shells where the pathname is unknown.
export function NavList({ items, current }: { items: NavItem[]; current?: string }) {
  return (
    <ul className="flex items-center gap-3 sm:gap-4 md:gap-7">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            aria-current={item.href === current ? "page" : undefined}
            className="decoration-accent-text decoration-2 underline-offset-8 hover:underline aria-[current=page]:underline"
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

// A section stays current on its sub-pages: /zh/blog/hello marks 博客.
export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const current = items.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return <NavList items={items} current={current?.href} />;
}
