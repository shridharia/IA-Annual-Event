/** Motion vocabulary: one set of durations/eases used by every GSAP and Motion animation in the app. */
export const ease = { out: "expo.out", soft: "power3.out", inOut: "power2.inOut" } as const;
export const dur = { fast: 0.35, base: 0.8, slow: 1.2 } as const;
export const stagger = { words: 0.045, lines: 0.1, children: 0.09 } as const;

/** Motion (motion/react) spring/transition presets for interface transitions (sheets, popovers, steps). */
export const ui = {
  sheet: { type: "spring", stiffness: 380, damping: 36 } as const,
  fade: { duration: 0.2 } as const,
  step: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } as const,
};
