/**
 * KINETIC GRID
 * ────────────
 * A dot lattice over the closing band. Each dot is a spring anchored to
 * its home position; a pointer inside the attraction radius drags the
 * nearby ones toward it, brightening and swelling them, and they settle
 * back once it leaves.
 *
 * Ported from the Originkit React component. Four departures:
 *
 *   The mesh lines are skipped WHEN THEY CANNOT DRAW ANYTHING, which is
 *   the case as configured: lineColor is rgba(0,0,0,0.24) and the band
 *   is #000, and black over black at any alpha is still black. That is
 *   2,350 stroke calls per frame — 141,000 a second — painting nothing.
 *   The test composites the colour over the band's real background
 *   rather than hardcoding the outcome, so giving lineColor a value that
 *   differs from the band brings the whole mesh back.
 *
 *   The loop stops when nothing is moving. The original runs rAF at
 *   60fps for the life of the page, clearing and redrawing an identical
 *   grid even with the pointer nowhere near it. Here it settles when the
 *   springs do — the resting grid stays on the canvas, since a canvas
 *   keeps its last frame — and restarts on the next pointer move. An
 *   untouched footer costs nothing. It also stops while the band is
 *   scrolled out of view.
 *
 *   `cursor: crosshair` is dropped: this site replaces the pointer with
 *   its own cursor, and a crosshair here would fight it.
 *
 *   One pointermove/pointerleave pair replaces the separate mouse and
 *   touch listener sets, bound to the BAND rather than the canvas so the
 *   layer can stay pointer-events: none over the headline and the pills.
 *
 * Every physical constant below — the 0.08 home spring, 0.82 damping,
 * the alpha and radius ramps — is the original's.
 */

// The Originkit panel's values. `background` is absent on purpose: the
// band paints its own --c-black and the canvas stays transparent, so
// there is no second background colour to keep in step.
const PROPS = {
  dotColor: '#ffffff',
  lineColor: 'rgba(0, 0, 0, 0.24)',
  spacing: 32,
  radius: 160,
  strength: 1,
  trail: false,
  trailColor: '#000000',
};

const GAP = Math.max(8, PROPS.spacing);                              // 32
const R = Math.max(1, PROPS.radius);                                 // 160
const PULL = (Math.max(1, Math.min(10, PROPS.strength)) / 10) * 4;   // 0.4

const HOME = 0.08;    // spring pulling a dot back to its anchor
const DAMP = 0.82;    // velocity retained per frame
const TRAIL_MS = 260; // how long a trail segment stays visible
const TRAIL_MAX = 80; // points retained

// Below both of these the grid is settled and the loop can stop.
// It has to be velocity AND net acceleration, not distance from home: a
// pointer held still inside the band balances the attraction against the
// home spring, so the dots settle DISPLACED. Testing "is every dot back
// home" would be false forever in that state and the loop would never
// stop. Zero net acceleration is what equilibrium actually means, and it
// covers the returned-home case too, since there the spring term is what
// goes to zero.
const REST_V = 0.01;
const REST_A = 0.005;

/** #rgb / #rgba / #rrggbb / #rrggbbaa / rgb() / rgba() → [r,g,b,a] in 0..1 */
function parseColor(input) {
  const str = String(input || '').trim();
  const fn = str.match(
    /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)/i
  );
  if (fn) {
    return [
      Math.min(1, +fn[1] / 255),
      Math.min(1, +fn[2] / 255),
      Math.min(1, +fn[3] / 255),
      fn[4] === undefined ? 1 : Math.min(1, +fn[4]),
    ];
  }
  let hex = str.replace(/^#/, '');
  if (hex.length === 3 || hex.length === 4) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  if (hex.length !== 6 && hex.length !== 8) return [0, 0, 0, 1];
  const byte = (i) => parseInt(hex.slice(i, i + 2), 16) / 255;
  return [byte(0), byte(2), byte(4), hex.length === 8 ? byte(6) : 1];
}

/**
 * Can `fg` change a single pixel when drawn over `bg`? Used to decide
 * whether the mesh pass is worth running at all. If the ground is not
 * itself opaque there is nothing to reason about, so it returns true and
 * the mesh is drawn.
 */
function showsOver(fg, bg) {
  const [fr, fgn, fb, fa] = parseColor(fg);
  const [br, bgn, bb, ba] = parseColor(bg);
  if (ba < 1) return true;
  const over = (s, d) => Math.round(255 * (s * fa + d * (1 - fa)));
  return (
    over(fr, br) !== Math.round(255 * br) ||
    over(fgn, bgn) !== Math.round(255 * bgn) ||
    over(fb, bb) !== Math.round(255 * bb)
  );
}

export function initKinetic() {
  document.querySelectorAll('[data-kinetic]').forEach(setup);
}

function setup(layer) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Events bind here, not to the canvas: the layer is pointer-events:
  // none so it can't shadow the headline or the pills, and a pointermove
  // over those still bubbles up to the band.
  const band = layer.parentElement || layer;
  const drawMesh = showsOver(PROPS.lineColor, getComputedStyle(band).backgroundColor);

  layer.appendChild(canvas);

  let width = 0;
  let height = 0;
  let cols = [];
  let dots = [];

  const build = () => {
    const w = Math.max(1, Math.floor(layer.clientWidth));
    const h = Math.max(1, Math.floor(layer.clientHeight));
    if (w === width && h === height) return false;
    width = w;
    height = h;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    // All drawing below is therefore in CSS pixels — unlike a shader
    // reading gl_FragCoord, the 32px spacing means 32 CSS px on any
    // display rather than 32 device px.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // +2 so the lattice overruns the band on both axes and never shows
    // an edge as dots are dragged inward.
    const nCols = Math.floor(w / GAP) + 2;
    const nRows = Math.floor(h / GAP) + 2;
    cols = [];
    dots = [];
    for (let c = 0; c < nCols; c += 1) {
      const col = [];
      for (let r = 0; r < nRows; r += 1) {
        const dot = { hx: c * GAP, hy: r * GAP, x: c * GAP, y: r * GAP, vx: 0, vy: 0 };
        col.push(dot);
        dots.push(dot);
      }
      cols.push(col);
    }
    return true;
  };

  const pointer = { x: -9999, y: -9999, active: false };
  const trail = [];
  let rect = null;

  const proximity = (dot) =>
    pointer.active
      ? Math.max(
          0,
          1 - Math.hypot(pointer.x - dot.x, pointer.y - dot.y) / R
        )
      : 0;

  /** One frame. Returns true while anything is still in motion. */
  const step = (now) => {
    let moving = false;

    for (let i = 0; i < dots.length; i += 1) {
      const dot = dots[i];
      let ax = (dot.hx - dot.x) * HOME;
      let ay = (dot.hy - dot.y) * HOME;

      if (pointer.active) {
        const dx = pointer.x - dot.x;
        const dy = pointer.y - dot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < R && dist > 0.001) {
          const f = (1 - dist / R) * PULL;
          ax += (dx / dist) * f;
          ay += (dy / dist) * f;
        }
      }

      dot.vx = (dot.vx + ax) * DAMP;
      dot.vy = (dot.vy + ay) * DAMP;
      dot.x += dot.vx;
      dot.y += dot.vy;

      if (
        !moving &&
        (Math.abs(dot.vx) > REST_V ||
          Math.abs(dot.vy) > REST_V ||
          Math.abs(ax) > REST_A ||
          Math.abs(ay) > REST_A)
      ) {
        moving = true;
      }
    }

    ctx.clearRect(0, 0, width, height);

    if (drawMesh) {
      ctx.strokeStyle = PROPS.lineColor;
      for (let c = 0; c < cols.length; c += 1) {
        for (let r = 0; r < cols[c].length; r += 1) {
          const dot = cols[c][r];
          const right = cols[c + 1] && cols[c + 1][r];
          const down = cols[c][r + 1];
          if (!right && !down) continue;
          const prox = proximity(dot);
          ctx.globalAlpha = 0.06 + prox * 0.7;
          ctx.lineWidth = 0.5 + prox * 1.5;
          ctx.beginPath();
          if (right) {
            ctx.moveTo(dot.x, dot.y);
            ctx.lineTo(right.x, right.y);
          }
          if (down) {
            ctx.moveTo(dot.x, dot.y);
            ctx.lineTo(down.x, down.y);
          }
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = PROPS.dotColor;
    for (let i = 0; i < dots.length; i += 1) {
      const dot = dots[i];
      const prox = proximity(dot);
      ctx.globalAlpha = 0.22 + prox * 0.78;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 0.8 + prox * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (PROPS.trail && trail.length > 1) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = PROPS.trailColor;
      ctx.lineWidth = 2;
      for (let i = 1; i < trail.length; i += 1) {
        const age = now - trail[i].t;
        if (age > TRAIL_MS) continue;
        ctx.globalAlpha = Math.max(0, 1 - age / TRAIL_MS) * 0.85;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }
      if (now - trail[trail.length - 1].t < TRAIL_MS) moving = true;
    }

    ctx.globalAlpha = 1;
    return moving;
  };

  build();

  // The grid at rest IS the design's ground state, so reduced motion
  // gets it drawn once — the springs are the effect, not the lattice.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    step(0);
    new ResizeObserver(() => {
      if (build()) step(0);
    }).observe(layer);
    return;
  }

  let frame = null;
  let visible = true;

  const loop = (now) => {
    // Drawn BEFORE the decision to stop, so the canvas is left holding
    // the settled grid rather than a half-sprung one.
    if (step(now)) {
      frame = requestAnimationFrame(loop);
    } else {
      frame = null;
    }
  };

  const start = () => {
    if (frame === null && visible) frame = requestAnimationFrame(loop);
  };
  const stop = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  };

  // The dots live in band-local coordinates, so the pointer has to be
  // projected into them. Scrolling moves the band under a cursor that
  // has not moved and fires no pointer event, so the last viewport
  // position is kept and re-projected — otherwise the pulled cluster
  // sticks to a stale spot in the band while the page scrolls past it.
  const client = { x: 0, y: 0 };
  const project = () => {
    rect = band.getBoundingClientRect();
    pointer.x = client.x - rect.left;
    pointer.y = client.y - rect.top;
  };

  window.addEventListener(
    'scroll',
    () => {
      rect = null;
      if (pointer.active) {
        project();
        start();
      }
    },
    { passive: true }
  );

  band.addEventListener(
    'pointermove',
    (event) => {
      client.x = event.clientX;
      client.y = event.clientY;
      if (!rect) rect = band.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
      if (PROPS.trail) {
        trail.push({ x: pointer.x, y: pointer.y, t: performance.now() });
        if (trail.length > TRAIL_MAX) trail.shift();
      }
      start();
    },
    { passive: true }
  );

  // Restarts the loop rather than just flagging: the dots have to be
  // driven back home, which takes frames.
  band.addEventListener('pointerleave', () => {
    pointer.active = false;
    pointer.x = -9999;
    pointer.y = -9999;
    start();
  });

  new ResizeObserver(() => {
    rect = null;
    // build() clears the canvas by resizing it, so a frame is owed.
    if (build()) start();
  }).observe(layer);

  // The band is the last thing on the page; nothing should run while it
  // is scrolled away.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        if (visible) start();
        else stop();
      },
      { rootMargin: '120px' }
    ).observe(band);
  }

  start();
}
