"use client";

import { useEffect, useRef, useState } from "react";
import {
  createHalo,
  drawAura,
  drawDust,
  drawStars,
  sampleRim,
  type RimParticle,
  type StageColors,
} from "@/lib/hero-scene";
import { pointerSpring, portraitSpring } from "@/lib/motion";
import "./hero.css";

export type HeroCard = { title: string; body: string; meta: string };

type Props = {
  title: string[]; // [lead-in, accent line]
  roles: string[];
  cta: string;
  ctaHref: string;
  cards: HeroCard[]; // top left, top right, bottom left, bottom right
  cardsLabel: string;
  marquee: string[];
  status: string;
};

const ARROWS = ["↖", "↗", "↙", "↘"];
const FACE = { u: 0.4, v: 0.42 }; // face centre in the portrait, as a fraction of its size
const ORIGIN = { u: 0.4, v: 0.45 }; // the portrait's transform-origin in hero.css
const AUTO_ORDER = [0, 1, 3, 2]; // corner cards take turns clockwise
const CARD_LOCK_MS = 5000; // after a click or focus, the pointer doesn't move the open card

type Axis = { p: number; v: number };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// One damped spring axis, semi-implicit Euler in two substeps.
function step(axis: Axis, target: number, spring: { stiffness: number; dampingRatio: number }, dt: number) {
  const c = 2 * spring.dampingRatio * Math.sqrt(spring.stiffness), h = dt / 2;
  for (let i = 0; i < 2; i++) {
    axis.v += (-spring.stiffness * (axis.p - target) - c * axis.v) * h;
    axis.p += axis.v * h;
  }
}

// Draw at the device pixel ratio; returns null while the canvas has no size.
function fit(canvas: HTMLCanvasElement) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const ctx = canvas.getContext("2d");
  if (!w || !h || !ctx) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.round(w * dpr), H = Math.round(h * dpr);
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

// Homepage hero: portrait with a particle aura, star and dust layers in parallax, four corner cards that open
// on hover (or take turns without a mouse), a typed role line, a UTC clock and a tech marquee.
export function Hero({ title, roles, cta, ctaHref, cards, cardsLabel, marquee, status }: Props) {
  const [lead, accent] = title;
  const sectionRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const portraitRef = useRef<HTMLImageElement>(null);
  const starsRef = useRef<HTMLCanvasElement>(null);
  const auraRef = useRef<HTMLCanvasElement>(null);
  const dustRef = useRef<HTMLCanvasElement>(null);
  const typerRef = useRef<HTMLSpanElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const activeRef = useRef(-1);
  const lockRef = useRef(0);
  const [active, setActive] = useState(-1);

  // `at` is the event's timeStamp, on the same clock as performance.now().
  const pick = (card: number, at: number) => {
    activeRef.current = card;
    lockRef.current = at + CARD_LOCK_MS;
    setActive(card);
  };

  useEffect(() => {
    const section = sectionRef.current, overlay = overlayRef.current, portrait = portraitRef.current;
    const stars = starsRef.current, aura = auraRef.current, dust = dustRef.current;
    if (!section || !overlay || !portrait || !stars || !aura || !dust) return;
    const scroller = section.parentElement as HTMLElement; // the slide pager's scroll container
    const root = document.documentElement;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const noHover = matchMedia("(hover: none)");
    const layers = [...section.querySelectorAll<HTMLElement>("[data-depth]")].map((el) => ({
      el,
      depth: Number(el.dataset.depth), // pointer parallax strength
      speed: Number(el.dataset.speed), // lag behind the page when leaving (negative runs ahead)
      zoom: Number(el.dataset.zoom), // push-in when leaving
    }));
    const quads = [...section.querySelectorAll<HTMLElement>(".hero-quad")];

    const readColors = (): StageColors => {
      const cs = getComputedStyle(section);
      return {
        bg: cs.getPropertyValue("--bg").trim(),
        fg: cs.getPropertyValue("--fg").trim(),
        accent: cs.getPropertyValue("--accent-text").trim(),
      };
    };
    let colors = readColors();

    const halo = createHalo();
    let rim: RimParticle[] = [];
    const glow = [0, 0, 0, 0];
    const ptr = { x: { p: 0, v: 0 }, y: { p: 0, v: 0 }, tx: 0, ty: 0 };
    const zoom = { s: { p: 1, v: 0 }, x: { p: 0, v: 0 }, y: { p: 0, v: 0 } };
    const cursor = { x: 0, y: 0, on: false };
    let mouseX = 0, mouseY = 0, lastMouse = 0, faceHover = false, visible = true;
    let raf = 0, last = 0, lastAuto = 0, autoStep = -1;

    const setCard = (card: number) => {
      if (activeRef.current === card) return;
      activeRef.current = card;
      setActive(card);
    };

    const paintLayers = () => {
      const back = fit(stars);
      if (back) drawStars(back.ctx, back.w, back.h, colors, 11);
      const front = fit(dust);
      if (front) drawDust(front.ctx, front.w, front.h, colors, 11);
    };

    const paintAura = (dt: number, now: number) => {
      const view = fit(aura);
      if (!view) return;
      const card = activeRef.current;
      let leader = null;
      // A dashed line from the open card to the halo, where there is room for it.
      if (card >= 0 && view.w >= 760) {
        const box = quads[card].getBoundingClientRect(), rect = aura.getBoundingClientRect(), sc = view.w / rect.width;
        leader = {
          x: ((card % 2 === 0 ? box.right + 14 : box.left - 14) - rect.left) * sc,
          y: ((box.top + box.bottom) / 2 - rect.top) * sc,
        };
      }
      drawAura(view.ctx, view.w, view.h, {
        colors,
        halo,
        rim,
        box: { x: portrait.offsetLeft, y: portrait.offsetTop, w: portrait.offsetWidth, h: portrait.offsetHeight },
        face: FACE,
        origin: ORIGIN,
        zoom: { s: zoom.s.p, x: zoom.x.p, y: zoom.y.p },
        cursor: cursor.on ? cursor : null,
        dt,
        active: card,
        glow,
        leader,
        now,
      });
    };

    // The cursor in canvas pixels, eased; it stops pushing particles when the mouse rests.
    const followCursor = () => {
      if (noHover.matches || performance.now() - lastMouse > 3000) { cursor.on = false; return; }
      const rect = aura.getBoundingClientRect(), sc = aura.clientWidth / rect.width;
      const tx = (mouseX - rect.left) * sc, ty = (mouseY - rect.top) * sc;
      if (!cursor.on) { cursor.x = tx; cursor.y = ty; cursor.on = true; }
      cursor.x += (tx - cursor.x) * 0.14;
      cursor.y += (ty - cursor.y) * 0.14;
    };

    const still = () => {
      for (const layer of layers) layer.el.style.transform = "";
      overlay.style.transform = "";
      overlay.style.opacity = "";
      portrait.style.transform = "";
      zoom.s.p = 1;
      zoom.x.p = 0;
      zoom.y.p = 0;
      paintAura(0, performance.now());
    };

    const frame = (now: number) => {
      raf = 0;
      if (!visible) return;
      if (reduce.matches) { still(); return; }
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;

      // Pointer parallax; without a mouse the layers sway gently instead.
      if (noHover.matches || now - lastMouse > 5000) {
        ptr.tx = Math.sin(now / 2600) * 0.35;
        ptr.ty = Math.cos(now / 3400) * 0.25;
      }
      step(ptr.x, ptr.tx, pointerSpring, dt);
      step(ptr.y, ptr.ty, pointerSpring, dt);
      const vh = scroller.clientHeight || 1, out = clamp((scroller.scrollTop - section.offsetTop) / vh, 0, 1);
      for (const layer of layers) {
        const tx = ptr.x.p * layer.depth * 26, ty = ptr.y.p * layer.depth * 16 + out * vh * layer.speed, s = 1 + out * layer.zoom;
        layer.el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
      }
      overlay.style.transform = `translate3d(${(ptr.x.p * 9).toFixed(2)}px, ${(ptr.y.p * 6 + out * vh * 0.18).toFixed(2)}px, 0)`;
      overlay.style.opacity = Math.max(0, 1 - out * 1.7).toFixed(3);

      // Portrait: slow breathing, a lean toward the open card, a lean in while the cursor is on the face.
      const card = activeRef.current;
      const breathe = 0.004 * (1 - Math.cos((now / 1000) * (Math.PI / 3)));
      step(zoom.s, 1 + breathe + (card >= 0 ? 0.025 : 0) + (faceHover ? 0.045 : 0), portraitSpring.scale, dt);
      step(zoom.x, card >= 0 ? (card % 2 ? 12 : -12) : 0, portraitSpring.position, dt);
      step(zoom.y, card >= 0 ? (card < 2 ? -6 : 6) : 0, portraitSpring.position, dt);
      portrait.style.transform = `translate3d(${zoom.x.p.toFixed(2)}px, ${zoom.y.p.toFixed(2)}px, 0) scale(${zoom.s.p.toFixed(4)})`;

      // With no mouse (touch, or a mouse resting for a while) the corner cards take turns.
      if ((noHover.matches || now - lastMouse > 6000) && now > lockRef.current && now - lastAuto > 3600) {
        autoStep = (autoStep + 1) % 4;
        setCard(AUTO_ORDER[autoStep]);
        lastAuto = now;
      }

      // The particles hold still while the page moves, so paging stays smooth.
      if (!root.hasAttribute("data-paging")) {
        followCursor();
        paintAura(dt, now);
      }
      raf = requestAnimationFrame(frame);
    };
    const wake = () => {
      if (!raf && visible) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    // Rim particles come from the portrait's own pixels once it has loaded.
    const loadRim = () => {
      rim = sampleRim(portrait, FACE);
      if (reduce.matches) still();
    };
    if (portrait.complete && portrait.naturalWidth) loadRim();
    else portrait.addEventListener("load", loadRim, { once: true });

    const overFace = (x: number, y: number) => {
      const r = portrait.getBoundingClientRect();
      if (!r.width) return false;
      const fx = r.left + r.width * FACE.u, fy = r.top + r.height * FACE.v;
      return Math.hypot((x - fx) / (r.width * 0.15), (y - fy) / (r.height * 0.24)) < 1;
    };
    const cardAt = (x: number, y: number) => {
      const r = section.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) return -1;
      return (x < r.left + r.width / 2 ? 0 : 1) + (y < r.top + r.height / 2 ? 0 : 2);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      ptr.tx = (e.clientX / innerWidth - 0.5) * 2;
      ptr.ty = (e.clientY / innerHeight - 0.5) * 2;
      mouseX = e.clientX;
      mouseY = e.clientY;
      lastMouse = performance.now();
      if (!visible) return;
      wake();
      // The face is a neutral zone: the portrait leans in and no card opens, so cards don't flicker across the middle.
      faceHover = overFace(e.clientX, e.clientY);
      if (lastMouse > lockRef.current) setCard(faceHover ? -1 : cardAt(e.clientX, e.clientY));
      if (reduce.matches) paintAura(0, lastMouse);
    };
    const onLeave = () => {
      ptr.tx = 0;
      ptr.ty = 0;
      faceHover = false;
    };
    // A press on the stage squishes the portrait; the spring brings it back with a small bounce.
    const onDown = (e: PointerEvent) => {
      if (reduce.matches || (e.target as Element).closest("button, a")) return;
      zoom.s.v -= 0.9;
      wake();
    };
    const onMotionChange = () => (reduce.matches ? still() : wake());

    // Ratio, not isIntersecting: a hero that only touches the viewport edge still "intersects". The 0.01 step
    // makes the observer report the moment it leaves. Off screen, data-idle also pauses the CSS animations,
    // the typed line and the clock.
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.intersectionRatio > 0;
      section.toggleAttribute("data-idle", !visible);
      if (visible) wake();
    }, { threshold: [0, 0.01] });
    io.observe(section);
    const ro = new ResizeObserver(() => {
      colors = readColors();
      paintLayers();
      if (reduce.matches) still();
    });
    ro.observe(section);
    window.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave);
    section.addEventListener("pointerdown", onDown);
    reduce.addEventListener("change", onMotionChange);
    paintLayers();
    wake();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      portrait.removeEventListener("load", loadRim);
      window.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      section.removeEventListener("pointerdown", onDown);
      reduce.removeEventListener("change", onMotionChange);
    };
  }, []);

  // Typed role line. It starts from the full first role, which is also what the server renders.
  useEffect(() => {
    const el = typerRef.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let word = 0, chars = roles[0].length, deleting = true, timer = 0;
    const type = () => {
      if (sectionRef.current?.hasAttribute("data-idle")) {
        timer = window.setTimeout(type, 500);
        return;
      }
      const text = roles[word];
      if (deleting) {
        el.textContent = text.slice(0, --chars);
        if (chars === 0) {
          deleting = false;
          word = (word + 1) % roles.length;
          timer = window.setTimeout(type, 380);
          return;
        }
        timer = window.setTimeout(type, 26);
      } else {
        el.textContent = text.slice(0, ++chars);
        if (chars === text.length) {
          deleting = true;
          timer = window.setTimeout(type, 1900);
          return;
        }
        timer = window.setTimeout(type, 55 + Math.random() * 55);
      }
    };
    timer = window.setTimeout(type, 2400);
    return () => clearTimeout(timer);
  }, [roles]);

  useEffect(() => {
    const el = clockRef.current;
    if (!el) return;
    const pad = (n: number) => String(n).padStart(2, "0");
    const tick = () => {
      if (sectionRef.current?.hasAttribute("data-idle")) return;
      const d = new Date();
      el.textContent = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section ref={sectionRef} id="hero" aria-labelledby="hero-title" className="hero stage">
      <div className="hero-layer" data-depth="0.25" data-speed="0.45" data-zoom="0.04">
        <canvas ref={starsRef} className="hero-canvas" aria-hidden="true" />
      </div>
      <div className="hero-layer hero-layer-mid" data-depth="0.6" data-speed="0.2" data-zoom="0.1">
        <div className="hero-portrait-box">
          {/* A plain img: the rim particles are sampled from this exact image's pixels. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={portraitRef}
            className="hero-portrait"
            src="/portrait.webp"
            alt=""
            width={840}
            height={640}
            decoding="async"
            fetchPriority="high"
          />
        </div>
        <canvas ref={auraRef} className="hero-canvas" aria-hidden="true" />
      </div>
      <div className="hero-scrim scrim-slide" />

      <div ref={overlayRef} className="hero-overlay">
        <h1 id="hero-title" className="hero-title">
          <span className="font-display text-hero-lead uppercase text-outline">{lead}</span>
          <span className="type-display text-hero text-accent-text">{accent}</span>
        </h1>
        <p className="hero-role">
          <span aria-hidden="true">✦</span>
          <span ref={typerRef} aria-hidden="true">
            {roles[0]}
          </span>
          <span aria-hidden="true" className="hero-caret" />
          <span className="sr-only">{roles.join(", ")}</span>
        </p>
        <a
          href={ctaHref}
          className="inline-flex items-center gap-2.5 rounded-full bg-fg px-5 py-2.5 font-mono text-xs font-medium tracking-wider text-bg uppercase transition-colors hover:bg-accent hover:text-accent-ink"
        >
          {cta}
          <span aria-hidden="true">→</span>
        </a>
      </div>

      <div className="hero-quads" role="group" aria-label={cardsLabel}>
        {cards.map((card, i) => {
          const on = active === i;
          return (
            <div key={card.title} className="hero-quad" data-q={i} data-on={on || undefined}>
              <button
                type="button"
                className="hero-quad-hint"
                aria-expanded={on}
                aria-controls={`hero-card-${i}`}
                onClick={(e) => pick(i, e.timeStamp)}
                onFocus={(e) => pick(i, e.timeStamp)}
              >
                <span aria-hidden="true" className="hero-quad-arrow">
                  {ARROWS[i]}
                </span>
                <span>{card.title}</span>
              </button>
              <div id={`hero-card-${i}`} className="hero-quad-card" aria-hidden={!on}>
                <div>
                  <p className="hero-quad-body">{card.body}</p>
                  <p className="hero-quad-meta">{card.meta}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hero-bar">
        <span className="hero-clock">
          UTC <span ref={clockRef}>--:--:--</span>
        </span>
        <div className="hero-marquee">
          <div className="hero-marquee-track">
            {[0, 1].map((copy) => (
              <span key={copy} className="hero-marquee-group" aria-hidden={copy === 1 || undefined}>
                {marquee.map((name) => (
                  <span key={name} className="hero-marquee-item">
                    {name}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
        <span className="hero-status">
          <i aria-hidden="true" />
          {status}
        </span>
      </div>

      <div className="hero-layer hero-layer-fg" data-depth="1.35" data-speed="-0.4" data-zoom="0.32">
        <canvas ref={dustRef} className="hero-canvas" aria-hidden="true" />
      </div>
    </section>
  );
}
