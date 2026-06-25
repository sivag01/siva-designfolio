'use strict';

/* ─────────────────────────────────────────────────────────────
   SG Portfolio — main.js
   Minimal: hero name scaling only. Interactions added later.
───────────────────────────────────────────────────────────── */

/** Binary-search font-size so el fills exactly parent content width */
function scaleToFitWidth(el) {
  if (!el) return;
  const parent = el.parentElement;
  if (!parent) return;
  el.style.fontSize = '';
  el.style.whiteSpace = 'nowrap';
  const cs = getComputedStyle(parent);
  const availW = parent.clientWidth
    - parseFloat(cs.paddingLeft)
    - parseFloat(cs.paddingRight);
  let lo = 10, hi = 800, mid;
  while (hi - lo > 0.5) {
    mid = (lo + hi) / 2;
    el.style.fontSize = mid + 'px';
    (el.scrollWidth <= availW) ? (lo = mid) : (hi = mid);
  }
  el.style.fontSize = lo + 'px';
}

function setupHeroName() {
  const nameEl = document.querySelector('.hero__name');
  if (!nameEl) return;
  scaleToFitWidth(nameEl);
  window.addEventListener('resize', () => scaleToFitWidth(nameEl));
}

document.addEventListener('DOMContentLoaded', setupHeroName);
