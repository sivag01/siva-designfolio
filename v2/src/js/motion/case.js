import gsap from 'gsap';

/**
 * CASE STUDY
 * ──────────
 * Reuses the vocabulary already established on the home page rather than
 * inventing new motion, so a case study feels like the same site:
 *
 *   • the split display heading slides in from the edge each line is
 *     anchored to — the same move as the home CTA
 *   • previews rise as they enter, staggered
 *   • the cover image parallaxes inside its crop, same ±10% as the work
 *     cards (and the same overscale ceiling applies — see case.css)
 *
 * Every reveal is `once: true`; nothing here re-triggers on scroll back.
 */
const PARALLAX = 10;

export function initCase() {
  // ── Split display heading ─────────────────────────────────────
  const lines = document.querySelectorAll('[data-preview-line]');
  if (lines.length) {
    gsap.to(lines, {
      opacity: 1,
      x: 0,
      duration: 1.1,
      ease: 'power4.out',
      stagger: 0.12,
      scrollTrigger: {
        trigger: lines[0].closest('.previews'),
        start: 'top 75%',
        once: true,
      },
    });
  }

  // ── Previews ──────────────────────────────────────────────────
  document.querySelectorAll('[data-preview]').forEach((preview) => {
    gsap.to(preview, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: preview,
        start: 'top 85%',
        once: true,
      },
    });
  });

  // ── Cover parallax ────────────────────────────────────────────
  const cover = document.querySelector('[data-case-cover] img');
  if (cover) {
    gsap.fromTo(
      cover,
      { yPercent: -PARALLAX },
      {
        yPercent: PARALLAX,
        ease: 'none',
        scrollTrigger: {
          trigger: cover.closest('.case-cover'),
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      }
    );
  }
}
