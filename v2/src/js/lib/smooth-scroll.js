import Lenis from 'lenis';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

/**
 * Boot Lenis and hand scroll control to GSAP's ticker.
 *
 * Two things have to be true or ScrollTrigger and Lenis fight each
 * other: ScrollTrigger must recalculate on every Lenis frame, and
 * Lenis must be driven by gsap.ticker rather than its own rAF loop
 * so the two never run a frame apart.
 *
 * @returns {Lenis} the instance, so anchors can delegate to scrollTo
 */
export function initSmoothScroll() {
  const lenis = new Lenis({
    lerp: 0.09,          // lower = heavier, more inertia
    wheelMultiplier: 1,
    smoothWheel: true,
    touchMultiplier: 1.6,
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  return lenis;
}

/**
 * Route in-page anchors through Lenis so jumps are eased rather than
 * instant.
 *
 * Matches any link that resolves to a hash on the CURRENT page, not just
 * `href="#id"`. The shared nav links absolutely (`/#works`) so they work
 * from a case study page — on the home page those are still same-page
 * jumps and should be eased, but a bare `[href^="#"]` selector misses
 * them and lets the browser hard-navigate instead.
 *
 * Cross-page links (`/#works` from a case study) fall through to normal
 * navigation, which is correct.
 */
export function initAnchors(lenis) {
  document.querySelectorAll('a[href*="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const url = new URL(link.href, window.location.href);

      const samePage =
        url.pathname === window.location.pathname &&
        url.origin === window.location.origin;
      if (!samePage || url.hash.length < 2) return;

      const target = document.querySelector(url.hash);
      if (!target) return;

      event.preventDefault();
      lenis.scrollTo(target, { offset: -80, duration: 1.2 });
    });
  });
}
