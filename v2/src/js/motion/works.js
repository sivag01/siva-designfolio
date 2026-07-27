import gsap from 'gsap';

/**
 * WORKS
 * ─────
 * Per card, two independent behaviours:
 *
 *   Entrance — the white mockup plate rises into the artwork, then
 *   the copy and CTA follow. Sequenced so the plate lands first and
 *   the text reads as a consequence of it.
 *
 *   Parallax — the artwork drifts inside its fixed crop while the
 *   card scrolls. The image is pre-scaled 1.12 in CSS purely to give
 *   this drift somewhere to go without exposing an edge.
 *
 * The "Selected works" label sticks via CSS, not JS — no scroll
 * listener needed for something position: sticky already does.
 */
/** Parallax travel in percent of image height, each way. */
const PARALLAX = 10;

export function initWorks() {
  document.querySelectorAll('[data-work]').forEach((card) => {
    const panel = card.querySelector('[data-work-panel]');
    const image = card.querySelector('[data-work-img]');
    const index = card.querySelector('.work__index');
    const text = card.querySelector('.work__text');

    // ── Entrance ────────────────────────────────────────────────
    const enter = gsap.timeline({
      defaults: { ease: 'power3.out' },
      scrollTrigger: {
        trigger: card,
        start: 'top 80%',
        once: true,
      },
    });

    if (panel) {
      enter.to(panel, { opacity: 1, y: 0, duration: 0.9 }, 0);
    }
    if (index) {
      enter.to(index, { opacity: 1, y: 0, duration: 0.8 }, 0.15);
    }
    if (text) {
      enter.to(text, { opacity: 1, y: 0, duration: 0.8 }, 0.28);
    }

    // ── Parallax inside the crop ────────────────────────────────
    // ±10%, twice the previous travel. The ceiling is set by the
    // image's overscale in CSS (--work-img-scale): safe range is
    // 50*(scale-1)/scale, so 1.28 permits ±10.94. Raising this without
    // raising the scale exposes the edge of the crop.
    if (image) {
      gsap.fromTo(
        image,
        { yPercent: -PARALLAX },
        {
          yPercent: PARALLAX,
          ease: 'none',
          scrollTrigger: {
            trigger: card,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        }
      );
    }
  });
}
