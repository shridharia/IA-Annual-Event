"use client";
import { useEffect } from "react";
import { dur, ease, stagger } from "./presets";

/**
 * The single place where scroll storytelling is wired. Markup opts in declaratively:
 *   data-reveal="up|mask|stagger"   fade/rise, masked line reveal (with data-split="lines"), or stagger children
 *   data-scrub-words                words ignite as you scroll
 *   data-draw                       line draws with scroll (timeline)
 *   data-parallax="0.12"            subtle depth
 *   data-doorway                    hero: the two 1s part, the beam opens
 *   data-light                      pointer-lit glyphs (fine pointers only)
 * Everything lives in one gsap.matchMedia context → reverted on unmount and when the reduced-motion preference flips.
 */
export default function MotionRoot() {
  useEffect(() => {
    let mm: { revert: () => void } | undefined;
    let cancelled = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }, { SplitText }] = await Promise.all([
        import("gsap"), import("gsap/ScrollTrigger"), import("gsap/SplitText"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger, SplitText);
      await document.fonts?.ready; // split after fonts so line breaks are final
      if (cancelled) return;

      const root = document.documentElement;
      const q = <T extends HTMLElement>(s: string) => gsap.utils.toArray<T>(s);
      const marks = (els: Element[]) => els.forEach((e) => e.classList.add("is-in", "is-split"));

      const ctx = gsap.matchMedia();
      mm = ctx;

      ctx.add("(prefers-reduced-motion: no-preference)", () => {
        const splits: InstanceType<typeof SplitText>[] = [];

        // Masked line reveals: <h2 data-reveal="mask" data-split="lines">
        q("[data-reveal='mask']").forEach((el) => {
          const s = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "line" });
          splits.push(s);
          marks([el]);
          gsap.from(s.lines, {
            yPercent: 110, duration: dur.slow, ease: ease.out, stagger: stagger.lines,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });

        q("[data-reveal='up']").forEach((el) => {
          marks([el]);
          gsap.fromTo(el, { y: 36, opacity: 0 }, {
            y: 0, opacity: 1, duration: dur.base, ease: ease.soft,
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          });
        });

        q("[data-reveal='stagger']").forEach((el) => {
          marks([el]);
          gsap.fromTo(el.children, { y: 32, opacity: 0 }, {
            y: 0, opacity: 1, duration: dur.base, ease: ease.soft, stagger: stagger.children,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });

        // Word-by-word ignition, scrubbed to scroll position.
        q("[data-scrub-words]").forEach((el) => {
          const s = SplitText.create(el, { type: "words", wordsClass: "w" });
          splits.push(s);
          marks([el]);
          gsap.fromTo(s.words, { opacity: 0.16 }, {
            opacity: 1, ease: "none", stagger: 0.12,
            scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: 0.5 },
          });
        });

        q("[data-draw]").forEach((el) => {
          marks([el]);
          gsap.fromTo(el, { scaleY: 0 }, {
            scaleY: 1, ease: "none",
            scrollTrigger: { trigger: el.parentElement, start: "top 75%", end: "bottom 60%", scrub: 0.4 },
          });
        });

        q("[data-parallax]").forEach((el) => {
          const k = Number(el.dataset.parallax) || 0.1;
          gsap.fromTo(el, { yPercent: -k * 100 }, {
            yPercent: k * 100, ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
          });
        });

        // ── Hero: intro + the doorway opening ──
        const hero = document.querySelector<HTMLElement>("[data-doorway]");
        if (hero) {
          const ones = hero.querySelectorAll<HTMLElement>("[data-door]");
          const beam = hero.querySelector<HTMLElement>("[data-beam]");
          const info = hero.querySelectorAll<HTMLElement>("[data-hero-in]");
          marks([...Array.from(info), ...Array.from(ones), ...(beam ? [beam] : [])]);
          // Short intro (≈1s): essential info is never gated behind a long sequence.
          gsap.timeline({ defaults: { ease: ease.out } })
            .from(ones, { yPercent: 40, opacity: 0, duration: 1.1, stagger: 0.12 }, 0)
            .from(beam, { scaleY: 0, duration: 1, transformOrigin: "50% 100%" }, 0.2)
            .from(info, { y: 24, opacity: 0, duration: 0.8, stagger: 0.07 }, 0.35);

          const mobile = window.matchMedia("(max-width: 767px)").matches;
          const spread = mobile ? 280 : 240; // % of glyph width each side
          gsap.timeline({
            scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.6 },
            defaults: { ease: "none" },
          })
            .to(ones[0], { xPercent: -spread, opacity: 0.2 }, 0)
            .to(ones[1], { xPercent: spread, opacity: 0.2 }, 0)
            .to(beam, { scaleX: 10, ease: "none" }, 0)
            .to(beam, { opacity: 0, ease: "power1.in", duration: 0.55 }, 0)
            .to(info, { y: -30, opacity: 0 }, 0.1);
        }

        // Pointer-lit glyphs, desktop only.
        let cleanupPointer: (() => void) | undefined;
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          let raf = 0;
          const els = q("[data-light]");
          const move = (e: PointerEvent) => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
              els.forEach((el) => {
                const r = el.getBoundingClientRect();
                el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
                el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
              });
            });
          };
          window.addEventListener("pointermove", move, { passive: true });
          cleanupPointer = () => { window.removeEventListener("pointermove", move); cancelAnimationFrame(raf); };
        }

        return () => {
          cleanupPointer?.();
          splits.forEach((s) => s.revert());
        };
      });

      // Reduced motion: no transforms; everything is simply visible (CSS already leaves it visible).
      ctx.add("(prefers-reduced-motion: reduce)", () => {
        marks(q("[data-reveal],[data-split],[data-scrub-words]"));
      });

      root.classList.add("motion-ready");
      requestAnimationFrame(() => ScrollTrigger.refresh());
    })().catch(() => {
      document.documentElement.classList.add("motion-failed"); // content stays fully usable
    });

    return () => { cancelled = true; mm?.revert(); };
  }, []);

  return null;
}
