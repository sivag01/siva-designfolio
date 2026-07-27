import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

/**
 * HERO
 * ────
 * On load: the portrait card lifts in while the photo inside it
 * settles back from an overscale — the frame and its contents
 * arrive at slightly different rates, which reads as depth.
 *
 * On scroll: the word field and the portrait separate. The
 * marquee drifts further and faster than the card, so the two planes
 * pull apart as the section leaves. Both are scrubbed, not
 * triggered, so the movement tracks the scrollbar exactly.
 */
export function initHero() {
  const field = document.querySelector('[data-hero-field]');
  const marquee = document.querySelector('[data-hero-marquee]');
  const portrait = document.querySelector('[data-portrait]');
  const portraitImg = document.querySelector('[data-portrait-img]');
  const hero = document.querySelector('.hero');
  if (!hero) return;

  // ── Entrance ──────────────────────────────────────────────────
  const intro = gsap.timeline({
    defaults: { ease: 'power3.out' },
    delay: 0.1,
  });

  if (marquee) {
    intro.from(marquee, { opacity: 0, duration: 1.4 }, 0);
  }

  if (portrait) {
    intro.from(
      portrait,
      { y: 64, opacity: 0, scale: 0.94, duration: 1.2 },
      0.15
    );
  }

  if (portraitImg) {
    // Photo settles from a deeper overscale than its final 1.0,
    // trailing the frame slightly.
    intro.from(portraitImg, { scale: 1.25, duration: 1.6 }, 0.15);
  }

  // ── Scroll parallax ───────────────────────────────────────────
  const parallax = gsap.timeline({
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      scrub: 0.8,
    },
  });

  if (field) {
    // Marquee travels furthest — the back plane.
    parallax.to(marquee, { yPercent: 14, ease: 'none' }, 0);
  }

  if (portrait) {
    // Card travels less — the front plane.
    //
    // Movement only, deliberately no opacity. Fading this element would
    // give it `opacity < 1`, which makes it a *backdrop root* — and the
    // glass layers inside it would then sample an empty backdrop and go
    // flat for the whole scroll. Translation is free of that constraint.
    parallax.to(portrait, { yPercent: -8, ease: 'none' }, 0);
  }

  // Keep the parallax honest when the viewport resizes.
  ScrollTrigger.addEventListener('refreshInit', () => {
    gsap.set([marquee, portrait].filter(Boolean), { clearProps: 'y,yPercent' });
  });
}
