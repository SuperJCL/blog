"use client";

import { useEffect, useRef, useState } from "react";
import { pageSpring } from "@/lib/motion";

export type Slide = { id: string; label: string };

type Props = { slides: Slide[]; dotsLabel: string; children: React.ReactNode };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Homepage screens. A wheel notch, a trackpad pull, the keys or a dot move one screen on a damped spring;
// touch keeps the browser's own snap. Sets <html data-hero-on> while the hero is showing (the header and dots
// turn dark) and <html data-paging> while the page moves (canvases pause so paging stays smooth).
export function SlidePager({ slides, dotsLabel, children }: Props) {
  const scrollerRef = useRef<HTMLElement>(null);
  const goToRef = useRef<(index: number) => void>(() => {});
  const [active, setActive] = useState(0);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const root = document.documentElement;
    const sections = [...scroller.querySelectorAll<HTMLElement>(":scope > section")];
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");

    /* ---------- spring paging ---------- */
    const sp = { pos: 0, vel: 0, target: 0, running: false, last: 0 };
    let page = 0, raf = 0;
    const nearest = () => {
      const st = scroller.scrollTop;
      let best = 0;
      sections.forEach((s, i) => { if (Math.abs(s.offsetTop - st) < Math.abs(sections[best].offsetTop - st)) best = i; });
      return best;
    };
    const stop = () => {
      sp.running = false;
      cancelAnimationFrame(raf);
      scroller.style.scrollSnapType = "";
    };
    const step = (now: number) => {
      if (!sp.running) return;
      const dt = Math.min(0.05, (now - sp.last) / 1000);
      sp.last = now;
      const k = pageSpring.stiffness, c = 2 * pageSpring.dampingRatio * Math.sqrt(k), h = dt / 4;
      for (let i = 0; i < 4; i++) {
        const a = -k * (sp.pos - sp.target) - c * sp.vel;
        sp.vel += a * h;
        sp.pos += sp.vel * h;
      }
      const max = scroller.scrollHeight - scroller.clientHeight;
      scroller.scrollTo({ top: clamp(sp.pos, 0, max), behavior: "instant" });
      if (Math.abs(sp.pos - sp.target) < 0.4 && Math.abs(sp.vel) < 4) {
        scroller.scrollTo({ top: clamp(sp.target, 0, max), behavior: "instant" });
        stop();
        return;
      }
      raf = requestAnimationFrame(step);
    };
    const springTo = (y: number) => {
      sp.target = y;
      if (sp.running) return;
      sp.pos = scroller.scrollTop;
      sp.vel = 0;
      sp.running = true;
      sp.last = performance.now();
      // Snap is off while the spring runs, otherwise the browser re-snaps every frame.
      scroller.style.scrollSnapType = "none";
      raf = requestAnimationFrame(step);
    };
    const goTo = (index: number) => {
      page = clamp(index, 0, sections.length - 1);
      const y = sections[page].offsetTop;
      if (reduce.matches) {
        stop();
        scroller.scrollTo({ top: y, behavior: "instant" });
        return;
      }
      springTo(y);
    };
    goToRef.current = goTo;

    // Wheel: a mouse notch pages at once; a trackpad first pulls the page against resistance and pages once the
    // pull is strong enough. One gesture pages once; its inertia tail is swallowed.
    let acc = 0, lastWheel = 0, lastAbs = 0, gestureUsed = false, releaseTimer = 0;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (!sp.running) page = nearest();
      if (sections[page].offsetHeight > scroller.clientHeight * 1.05) return; // a screen taller than the viewport scrolls natively
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * scroller.clientHeight : e.deltaY;
      const now = performance.now(), abs = Math.abs(dy);
      if (now - lastWheel > 200 || (abs > lastAbs * 1.6 && abs > 12)) { acc = 0; gestureUsed = false; }
      lastWheel = now;
      lastAbs = abs;
      if (gestureUsed) return;
      const discrete = e.deltaMode !== 0 || (abs >= 50 && Number.isInteger(dy));
      acc += dy;
      const dir = Math.sign(acc), next = page + dir, canMove = next >= 0 && next < sections.length;
      if (discrete || Math.abs(acc) >= 120) {
        gestureUsed = true;
        acc = 0;
        clearTimeout(releaseTimer);
        if (canMove) goTo(next);
        return;
      }
      if (!canMove) return;
      springTo(sections[page].offsetTop + dir * scroller.clientHeight * 0.1 * (1 - Math.exp(-Math.abs(acc) / 70)));
      clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(() => { if (!gestureUsed) { acc = 0; goTo(page); } }, 180);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement;
      if (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const onControl = target.tagName === "BUTTON" || target.tagName === "A";
      const base = sp.running ? page : nearest();
      let next: number | null = null;
      if (e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey && !onControl)) next = base + 1;
      else if (e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey && !onControl)) next = base - 1;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = sections.length - 1;
      if (next === null) return;
      e.preventDefault();
      goTo(next);
    };

    // In-page links such as the hero's "view projects" go through the spring too.
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element).closest("a[href^='#']");
      if (!link) return;
      const index = sections.findIndex((s) => `#${s.id}` === link.getAttribute("href"));
      if (index < 0) return;
      e.preventDefault();
      goTo(index);
    };

    /* ---------- enter/leave parallax: each screen eases in and fades as it moves ---------- */
    // The current screen is whichever is nearest to the scroll position. (An IntersectionObserver can't decide
    // this: a screen merely touching the viewport edge also counts as intersecting.)
    let ticking = false, pagingTimer = 0, current = -1;
    const updateParallax = () => {
      ticking = false;
      const vh = scroller.clientHeight, st = scroller.scrollTop, still = reduce.matches;
      for (const s of sections) {
        const r = clamp((s.offsetTop - st) / vh, -1, 1);
        s.style.setProperty("--ty", still ? "0px" : `${(r * vh * 0.35).toFixed(1)}px`);
        s.style.setProperty("--vy", still ? "0px" : `${(r * vh * 0.18).toFixed(1)}px`);
        s.style.setProperty("--o", still ? "1" : Math.max(0, 1 - Math.abs(r) * 1.5).toFixed(3));
      }
      const index = nearest();
      if (index !== current) {
        current = index;
        setActive(index);
        root.toggleAttribute("data-hero-on", sections[index].id === "hero");
      }
    };
    const onScroll = () => {
      root.setAttribute("data-paging", "");
      clearTimeout(pagingTimer);
      pagingTimer = window.setTimeout(() => root.removeAttribute("data-paging"), 180);
      if (!ticking) { ticking = true; requestAnimationFrame(updateParallax); }
    };

    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        updateParallax();
        if (!sp.running) scroller.scrollTo({ top: sections[nearest()].offsetTop, behavior: "instant" });
      }, 120);
    });
    ro.observe(scroller);

    const fromHash = sections.findIndex((s) => `#${s.id}` === location.hash);
    if (fromHash > 0) scroller.scrollTo({ top: sections[fromHash].offsetTop, behavior: "instant" });
    updateParallax();

    const onTouch = () => { if (sp.running) stop(); };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    scroller.addEventListener("click", onClick);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("touchstart", onTouch, { passive: true });

    return () => {
      stop();
      clearTimeout(releaseTimer);
      clearTimeout(pagingTimer);
      clearTimeout(resizeTimer);
      ro.disconnect();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      scroller.removeEventListener("click", onClick);
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("touchstart", onTouch);
      root.removeAttribute("data-hero-on");
      root.removeAttribute("data-paging");
    };
  }, []);

  return (
    <>
      <main ref={scrollerRef} className="slide-scroller relative">
        {children}
      </main>
      <nav aria-label={dotsLabel} data-hero-tint className="fixed top-1/2 right-1 z-20 flex -translate-y-1/2 flex-col gap-0.5 sm:right-3">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            aria-label={slide.label}
            aria-current={i === active ? "true" : undefined}
            onClick={() => goToRef.current(i)}
            className="group grid size-5 place-items-center"
          >
            <span className="size-2 rounded-full border border-muted transition group-aria-[current=true]:scale-125 group-aria-[current=true]:border-accent-text group-aria-[current=true]:bg-accent-text" />
          </button>
        ))}
      </nav>
    </>
  );
}
