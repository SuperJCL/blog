// Spring parameters for JS-driven motion, tuned on the style board. CSS easings are in app/globals.css.
// Every animation checks prefers-reduced-motion and jumps straight to its end state.

/** Homepage full-screen paging. Tuned by hand: lower stiffness is slower and heavier. */
export const pageSpring = { stiffness: 35, dampingRatio: 0.9 } as const;

/** Homepage hero: the depth layers follow the pointer through this spring. */
export const pointerSpring = { stiffness: 22, dampingRatio: 0.95 } as const;

/** Hero portrait zoom and lean. The low damping on scale gives the small bounce after a press. */
export const portraitSpring = {
  scale: { stiffness: 90, dampingRatio: 0.55 },
  position: { stiffness: 60, dampingRatio: 0.8 },
} as const;
