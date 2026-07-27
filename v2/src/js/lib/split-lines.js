/**
 * Split a text block into per-visual-line elements so each line can
 * be masked and slid independently.
 *
 * Works in two passes: wrap every word, read each word's offsetTop
 * to learn where the browser actually broke the text, then rebuild
 * as one `.line` (overflow: hidden) per row containing a
 * `.line__inner` to translate. Because the break points come from
 * real layout, this survives any font size or container width.
 *
 * The original markup is stashed on the element so a resize can
 * revert and re-split against the new layout.
 */

const escape = (str) =>
  str.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);

/**
 * @param {HTMLElement} el  block-level element holding plain text
 * @returns {HTMLElement[]} the `.line__inner` elements, in order
 */
export function splitLines(el) {
  if (el.dataset.splitOriginal === undefined) {
    el.dataset.splitOriginal = el.innerHTML;
  }

  const text = el.dataset.splitOriginal
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return [];

  // Pass 1 — one span per word, so layout tells us the break points.
  el.innerHTML = text
    .split(' ')
    .map((word) => `<span class="split-word">${escape(word)}</span>`)
    .join(' ');

  const rows = new Map();
  el.querySelectorAll('.split-word').forEach((word) => {
    const top = Math.round(word.offsetTop);
    if (!rows.has(top)) rows.set(top, []);
    rows.get(top).push(word.textContent);
  });

  // Pass 2 — rebuild as masked lines.
  el.innerHTML = [...rows.values()]
    .map(
      (words) =>
        `<span class="line"><span class="line__inner">${escape(
          words.join(' ')
        )}</span></span>`
    )
    .join('');

  return [...el.querySelectorAll('.line__inner')];
}

/** Restore the element's pre-split markup. */
export function revertLines(el) {
  if (el.dataset.splitOriginal !== undefined) {
    el.innerHTML = el.dataset.splitOriginal;
  }
}
