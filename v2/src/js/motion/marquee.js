/**
 * HERO MARQUEE
 * ────────────
 * Replaces the flattened word-cloud export with live text: a stack of
 * rows that scroll continuously, each in the opposite direction to
 * the one above it.
 *
 * Motion is pure CSS — a transform animation per track, which the
 * compositor runs off the main thread. JS only builds the DOM and
 * works out how much of it is needed, so scrolling and the GSAP
 * timelines never contend with the marquee for frame time.
 *
 * The seamless loop relies on one invariant: each track holds exactly
 * two identical sets, so translating it -50% lands the second set
 * precisely where the first began. That means the trailing gap has to
 * live *inside* the set (as padding-right), not as a gap between the
 * two — otherwise -50% is off by half a gap and the loop visibly jumps.
 */

/**
 * The hero vocabulary. Lengths run 9–23 characters, a wide ratio for a
 * monospace field, so the row width is accumulated from real measured
 * widths rather than from an average.
 */
const WORDS = [
  'Visual Design',
  'Design System',
  'Design Ops',
  'Click Rate Optimisation',
  'Vibe Code',
];

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/**
 * Strides that step through the vocabulary visiting every word exactly
 * once — which is what guarantees a row cannot repeat a word. Only
 * strides coprime with the list length do that, hence the gcd filter:
 * over six words a stride of 2 would visit three of them twice and miss
 * the rest, quietly breaking the no-repeat rule the next time the list
 * changes length.
 */
const STRIDES = (() => {
  const n = WORDS.length;
  const out = [];
  for (let s = 1; s < Math.max(2, n); s += 1) if (gcd(s, n) === 1) out.push(s);
  return out.length ? out : [1];
})();

/**
 * The word order for one row. Varying the stride AND the starting offset
 * gives STRIDES.length x WORDS.length distinct orderings — 20 here,
 * against the ~21 rows a full-height hero draws. Rotating alone would
 * give only 5, and every fifth row would be identical to another.
 */
function orderFor(index) {
  const n = WORDS.length;
  const stride = STRIDES[index % STRIDES.length];
  const offset = index % n;
  return Array.from({ length: n }, (_, i) => WORDS[(offset + i * stride) % n]);
}

/** Measure one word at the marquee's own type settings. */
function measure(container, text) {
  const probe = document.createElement('span');
  probe.className = 'marquee__word';
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
  probe.textContent = text;
  container.appendChild(probe);
  const w = probe.getBoundingClientRect().width;
  probe.remove();
  return w;
}

/**
 * @param {number} index    row number
 * @param {number} gap      spacing between words, in px
 * @param {Map<string,number>} widths  measured width of each word
 * @param {number} minWidth the container width the set has to cover
 */
function buildRow(index, gap, widths, minWidth) {
  const row = document.createElement('div');
  row.className = 'marquee__row';
  // Odd rows run the other way.
  if (index % 2 === 1) row.classList.add('marquee__row--reverse');

  // A negative delay starts each row mid-cycle, which reproduces the
  // staggered word offsets of the original artwork without hardcoding
  // per-row indents.
  row.style.setProperty('--mq-phase', `${-((index * 7) % 20) / 20}`);
  // Slight per-row speed variation stops the block reading as one
  // rigid sheet of text.
  row.style.setProperty('--mq-scale', `${1 + ((index % 5) - 2) * 0.08}`);
  const track = document.createElement('div');
  track.className = 'marquee__track';

  const set = document.createElement('div');
  set.className = 'marquee__set';

  // Repeat this row's order until the set covers the container AND has
  // shown every word at least once. Two conditions, two reasons: the
  // first is what makes the loop seamless (a set narrower than the row
  // would leave a bare stretch at the seam), the second keeps every word
  // present on every row, which the old one-cycle set gave for free.
  //
  // Termination is guaranteed by `gap` — it is at least 40px, so `filled`
  // climbs even if a word measures zero. The cap is a backstop against a
  // pathological container width, not an expected path.
  const order = orderFor(index);
  let filled = 0;
  let n = 0;
  while ((filled < minWidth || n < order.length) && n < 400) {
    const text = order[n % order.length];
    const word = document.createElement('span');
    word.className = 'marquee__word';
    word.textContent = text;
    set.appendChild(word);
    filled += (widths.get(text) || 0) + gap;
    n += 1;
  }

  track.append(set, set.cloneNode(true));
  row.appendChild(track);
  return row;
}

/**
 * @param {HTMLElement} container element carrying `data-marquee`
 */
function render(container) {
  container.textContent = '';

  const { width, height } = container.getBoundingClientRect();
  if (!width || !height) return;

  const styles = getComputedStyle(container);
  const rowH = parseFloat(styles.getPropertyValue('--marquee-row')) || 40;
  const gap = parseFloat(styles.getPropertyValue('--marquee-gap')) || 40;

  // Keyed by word, because buildRow accumulates in the row's own order
  // and needs to look each one up rather than walk an index.
  const widths = new Map(WORDS.map((w) => [w, measure(container, w)]));
  const rows = Math.ceil(height / rowH) + 1;

  const frag = document.createDocumentFragment();
  for (let i = 0; i < rows; i++) {
    frag.appendChild(buildRow(i, gap, widths, width));
  }
  container.appendChild(frag);
}

export function initMarquee() {
  const container = document.querySelector('[data-marquee]');
  if (!container) return;

  render(container);

  // How many words a set needs depends on their measured widths and on
  // the container's, and both can still move after the first render.
  //
  // The webfont is the one that bites: measuring before Geist Mono
  // arrives sizes the words in the fallback face, which can leave the
  // set a word short of covering the row — and a set narrower than its
  // row shows a bare stretch at the loop seam.
  document.fonts?.ready.then(() => render(container));

  // Width is observed rather than assumed, because `window.innerWidth`
  // does not capture it: this element also changes width when a
  // scrollbar appears as the page finishes loading. Height is
  // deliberately ignored — a mobile URL bar collapsing changes it
  // constantly, and render() already draws one row of slack.
  let last = Math.round(container.getBoundingClientRect().width);
  let timer;
  new ResizeObserver((entries) => {
    const width = Math.round(entries[0].contentRect.width);
    if (width === last) return;
    last = width;
    clearTimeout(timer);
    timer = setTimeout(() => render(container), 200);
  }).observe(container);
}
