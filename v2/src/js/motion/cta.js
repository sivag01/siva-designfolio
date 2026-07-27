import gsap from 'gsap';

/**
 * CTA (closing black band)
 * ────────────────────────
 * The two headline lines are set to opposite edges in the design —
 * "Let's build" left, "An experience" right. The entrance leans on
 * that: each line slides in from the side it's anchored to, so the
 * type appears to snap into its alignment. The buttons follow.
 */
export function initCta() {
  const lines = document.querySelectorAll('[data-cta-line]');
  const actions = document.querySelector('.cta__actions');
  const cta = document.querySelector('.cta');
  if (!cta || !lines.length) return;

  const tl = gsap.timeline({
    defaults: { ease: 'power4.out' },
    scrollTrigger: {
      trigger: cta,
      start: 'top 75%',
      once: true,
    },
  });

  tl.to(lines, {
    opacity: 1,
    x: 0,
    duration: 1.1,
    stagger: 0.12,
  });

  if (actions) {
    tl.from(actions, { opacity: 0, y: 24, duration: 0.7 }, '-=0.5');
  }
}
