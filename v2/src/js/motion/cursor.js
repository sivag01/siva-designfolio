import gsap from 'gsap';

/**
 * CUSTOM CURSOR
 * ─────────────
 * One circle replaces the native arrow page-wide, and expands into a
 * labelled pill over a work card. It is a single element throughout —
 * the circle widens and reveals its label rather than handing off to a
 * second node, so the pill reads as growing out of the cursor.
 *
 *   .cursor-layer        ← GSAP writes x/y here, and ONLY x/y
 *     └ .cursor__bubble  ← CSS owns centring, size and opacity
 *         └ .cursor__label
 *
 * That split is not stylistic. When GSAP takes over an element's
 * transform it resets that element's `translate` and `scale` properties
 * to `none`, so centring the node GSAP moves gets silently wiped — the
 * bug that left an earlier version half its own width off the pointer.
 *
 * Colour is handled by `mix-blend-mode: difference` in CSS: a white
 * bubble with a black label inverts to a black pill with white text on
 * the light sections and a white pill with black text on the black
 * bands. One set of values, legible on both.
 */

const LABEL = 'Read more';
const EASE = 0.22; // fraction of the remaining distance per frame

export function initCursor() {
  // Fine pointers only — hiding the cursor on touch would remove an
  // affordance and put nothing in its place. Reduced-motion users never
  // reach here (main.js returns first), so they keep the native arrow.
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const layer = document.createElement('div');
  layer.className = 'cursor-layer';
  layer.setAttribute('aria-hidden', 'true');

  const bubble = document.createElement('span');
  bubble.className = 'cursor__bubble';

  const label = document.createElement('span');
  label.className = 'cursor__label';
  label.textContent = LABEL;

  bubble.appendChild(label);
  layer.appendChild(bubble);
  document.body.appendChild(layer);

  // The open pill hugs its label. `width`/`height` only interpolate
  // between two definite lengths, so both have to be measured into real
  // pixel values — a content-sized pill would snap open rather than
  // grow. The label is absolutely positioned, so it reports its natural
  // box even while hidden inside the 12px circle.
  const root = document.documentElement;
  const num = (name, fallback) =>
    parseFloat(getComputedStyle(root).getPropertyValue(name)) || fallback;

  const measure = () => {
    // offsetWidth/Height, NOT getBoundingClientRect(). The rect includes
    // ancestor transforms, and the bubble rests at scale(0.3) — reading
    // the rect measured the label at 30% and opened the pill to a third
    // of the width it needed. offset* are layout values and ignore
    // transforms entirely.
    const w = label.offsetWidth;
    const h = label.offsetHeight;
    if (!w || !h) return;
    root.style.setProperty('--cursor-open-w', `${w + num('--cursor-pad-x', 16) * 2}px`);
    root.style.setProperty('--cursor-open-h', `${h + num('--cursor-pad-y', 8) * 2}px`);
  };
  measure();
  // The label is set in Geist Mono; measuring before it loads gives a
  // fallback-face box and a pill that is visibly the wrong size.
  document.fonts?.ready.then(measure);

  const setX = gsap.quickSetter(layer, 'x', 'px');
  const setY = gsap.quickSetter(layer, 'y', 'px');

  let targetX = 0;
  let targetY = 0;
  let x = 0;
  let y = 0;
  let seen = false;

  // Set from JS, never in CSS, so a failed bundle can't leave the page
  // with no cursor at all.
  document.documentElement.classList.add('has-cursor');

  const place = (px, py) => {
    targetX = x = px;
    targetY = y = py;
    setX(x);
    setY(y);
  };

  window.addEventListener(
    'pointermove',
    (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      if (!seen) {
        // First sighting: drop it on the pointer rather than letting it
        // glide in from 0,0.
        seen = true;
        place(targetX, targetY);
        document.documentElement.classList.add('cursor-awake');
      }
    },
    { passive: true }
  );

  document.addEventListener('pointerleave', () =>
    document.documentElement.classList.remove('cursor-awake')
  );
  document.addEventListener('pointerenter', (event) => {
    place(event.clientX, event.clientY);
    document.documentElement.classList.add('cursor-awake');
  });

  // Any element can ask for a cursor state by declaring it:
  //
  //   data-cursor="read"  → html.cursor-read  (expands to the pill)
  //   data-cursor="lg"    → html.cursor-lg    (64px plain circle)
  //
  // Attribute-driven rather than a hardcoded selector per state, so a
  // new state is a token plus one CSS rule — no edit here.
  document.querySelectorAll('[data-cursor]').forEach((el) => {
    const state = `cursor-${el.dataset.cursor}`;
    el.addEventListener('pointerenter', () =>
      document.documentElement.classList.add(state)
    );
    el.addEventListener('pointerleave', () =>
      document.documentElement.classList.remove(state)
    );
  });

  gsap.ticker.add(() => {
    if (!seen) return;
    x += (targetX - x) * EASE;
    y += (targetY - y) * EASE;
    setX(x);
    setY(y);
  });
}
