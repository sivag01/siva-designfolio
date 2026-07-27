import gsap from 'gsap';

/**
 * Magnetic pills — the button leans toward the cursor while it's
 * inside a small radius, then springs back on leave.
 *
 * Pointer-type gated: touch devices report pointermove on tap, which
 * would leave the button stuck off-centre. Only fine pointers get it.
 */
export function initMagnetic(strength = 0.32) {
  if (!window.matchMedia('(pointer: fine)').matches) return;

  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const move = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' });
    const lift = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' });

    el.addEventListener('pointermove', (event) => {
      const box = el.getBoundingClientRect();
      move((event.clientX - (box.left + box.width / 2)) * strength);
      lift((event.clientY - (box.top + box.height / 2)) * strength);
    });

    el.addEventListener('pointerleave', () => {
      move(0);
      lift(0);
    });
  });
}
