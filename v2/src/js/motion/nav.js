import ScrollTrigger from 'gsap/ScrollTrigger';

/**
 * NAV
 * ───
 * Three behaviours, all scroll-driven:
 *   1. Auto-hide  — slides away on scroll down, returns on scroll up.
 *   2. Solid state — picks up a blurred white ground once the hero
 *      is behind us, so the black-on-transparent wordmark stays
 *      legible over the following sections.
 *   3. Active link — highlights Works / About while that section
 *      occupies the viewport.
 */
export function initNav() {
  const nav = document.querySelector('[data-nav]');
  const hero = document.querySelector('.hero');
  if (!nav) return;

  // ── 1 + 2: direction-aware hide, solid past the hero ──────────
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      const past = self.scroll();
      const heroEnd = hero ? hero.offsetHeight * 0.6 : 200;

      nav.classList.toggle('is-solid', past > heroEnd);

      // Never hide while near the top — nothing to reclaim there.
      const shouldHide = self.direction === 1 && past > heroEnd;
      nav.classList.toggle('is-hidden', shouldHide);
    },
  });

  // ── 3: active link per section ────────────────────────────────
  // Nav links are now absolute (`/#works`) so they work from a case
  // study page too. `getAttribute('href')` can therefore no longer be
  // used as a selector — `querySelector('/#works')` throws a
  // SyntaxError. Resolve the URL and take the hash instead, and skip
  // links whose section is not on this page.
  document.querySelectorAll('[data-nav-link]').forEach((link) => {
    const { hash } = new URL(link.href, window.location.href);
    const section = hash.length > 1 && document.querySelector(hash);
    if (!section) return;

    ScrollTrigger.create({
      trigger: section,
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => link.classList.toggle('is-active', self.isActive),
    });
  });
}
