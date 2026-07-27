import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

import 'lenis/dist/lenis.css';

import { initSmoothScroll, initAnchors } from './lib/smooth-scroll.js';
import { initNav } from './motion/nav.js';
import { initMagnetic } from './motion/magnetic.js';
import { initCursor } from './motion/cursor.js';

gsap.registerPlugin(ScrollTrigger);

// Dev-only handles for inspecting trigger positions in the console
// (ScrollTrigger.getAll(), gsap.globalTimeline, …). Stripped from
// the production build.
if (import.meta.env.DEV) {
  window.gsap = gsap;
  window.ScrollTrigger = ScrollTrigger;
}

export const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

/**
 * Behaviour every page gets: nav state, smooth scroll, the custom
 * cursor, magnetic pills. Pages layer their own on top.
 *
 * TWO hooks, not one, and the distinction matters: `always` runs even
 * under reduced motion, `motion` does not. The hero marquee is artwork
 * rather than embellishment — it has to be built either way, and
 * motion.css freezes the rows instead — whereas reveals and parallax
 * must not run at all.
 *
 * @param {object}     [hooks]
 * @param {() => void} [hooks.always] built regardless of motion setting
 * @param {() => void} [hooks.motion] only when motion is allowed
 */
export function initSite({ always, motion } = {}) {
  const boot = () => {
    // Nav state is scroll position, not decoration — it runs either way.
    initNav();
    always?.();

    if (prefersReducedMotion) {
      // No Lenis, no reveals, no parallax, no custom cursor. Anchors
      // fall back to the browser's own jump. `motion-ready` is never
      // added, so nothing in motion.css ever hides.
      ScrollTrigger.refresh();
      return;
    }

    // Signals to motion.css that GSAP is here and it is safe to hide
    // the elements we are about to animate in.
    document.documentElement.classList.add('motion-ready');

    const lenis = initSmoothScroll();
    initAnchors(lenis);

    motion?.();

    initMagnetic();
    initCursor();

    // Images and webfonts both settle after first paint and both shift
    // every trigger's start/end. Recompute after each.
    window.addEventListener('load', () => ScrollTrigger.refresh());
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
