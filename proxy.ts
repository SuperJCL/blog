import { NextResponse, type NextRequest } from "next/server";
import {
  defaultLocale,
  hasLocale,
  localeCookie,
  locales,
  type Locale,
} from "@/i18n/config";

// Picks the highest-q supported language, matching on the primary subtag
// so zh-CN, zh-TW and zh-HK all map to zh.
function matchAcceptLanguage(header: string | null): Locale | undefined {
  if (!header) return undefined;

  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return {
        base: tag.trim().toLowerCase().split("-")[0],
        quality: q ? Number(q.slice(2)) : 1,
        index,
      };
    })
    .filter((entry) => entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const { base } of ranked) {
    if (hasLocale(base)) return base;
  }
  return undefined;
}

function getLocale(request: NextRequest): Locale {
  const cookie = request.cookies.get(localeCookie)?.value;
  if (cookie && hasLocale(cookie)) return cookie;
  return (
    matchAcceptLanguage(request.headers.get("accept-language")) ?? defaultLocale
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathnameHasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (pathnameHasLocale) return;

  const url = request.nextUrl.clone();
  url.pathname = `/${getLocale(request)}${pathname === "/" ? "" : pathname}`;
  // 307 by default: the target depends on the visitor, so it must not be cached as permanent.
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals and any path whose last segment has a file extension.
  matcher: ["/((?!_next/|.*\\.[^/]*$).*)"],
};
