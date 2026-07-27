# Designfolio v2

Built from Figma [node 2034:92](https://www.figma.com/design/YiEiVmFBxXdSLMnuCWAIMI/Siva?node-id=2034-92)
(1728px frame). Renders 5394px tall at 1728px wide against the design's 5386px.

```bash
npm install
npm run dev      # http://localhost:5173, HMR
npm run build    # → dist/
npm run preview  # serve dist/
```

## Stack

| | |
|---|---|
| **Astro** (static output) | Multi-page with a single shared Nav and layout. Ships zero JS of its own; every page is plain HTML in `dist/`. Chosen when the case studies arrived — Vite MPA has no HTML templating at all, so the nav would have been copy-pasted per page. |
| **GSAP + ScrollTrigger** | Section-scoped scroll choreography: scrub-linked parallax, staggered reveals, direction-aware nav. Free for commercial use, all plugins. |
| **Lenis** | Inertial smooth scroll, driven by `gsap.ticker` so it never runs a frame apart from ScrollTrigger. |
| **Plain CSS + custom properties** | Carries over the `ds.css` token pattern from v1. Every value is a token; nothing downstream hardcodes a colour, size or duration. |

Output: 3.4 kB CSS + 2.3 kB app JS + 50 kB motion vendor chunk (all gzipped),
1.07 MB images (WebP, down from 2.1 MB as delivered).

## Layout

```
src/pages/index.astro        home
src/pages/works/*.astro      one file per case study — each COMPOSES its own
                             sections, so pages are free to differ
src/layouts/BaseLayout.astro the single <head> + Nav; per-page meta via props
src/layouts/CaseLayout.astro adds case.css + the case script
src/components/Nav.astro     the one nav — edit here, changes everywhere
src/components/Signature.astro  13.5 kB of paths, so only pages using it pay
src/components/case/         CaseHeader, CaseCover, CaseText, CaseStats,
                             CasePreviews, NextProject
src/data/works.js            the four projects: slug, name, tagline, cover.
                             Metadata only — drives home links, 01/04
                             numbering and the Next chain so they can't drift
src/css/tokens.css           design tokens — the only place values live
src/css/base.css             reset + shared primitives
src/css/sections.css         home sections, in document order
src/css/case.css             case-study sections (loaded by CaseLayout only)
src/css/motion.css           pre-animation states + reduced-motion escape hatch
src/js/site.js               every page: nav, smooth scroll, cursor, magnetic
src/js/pages/                home.js, case.js — per-page motion
src/js/lib/                  smooth-scroll, split-lines
src/js/motion/               one file per concern: nav, marquee, hero, intro,
                             works, cta, magnetic, cursor, case
src/assets/images/           WebP photography, SVG icons
```

`initSite({ always, motion })` takes TWO hooks, not one. `always` runs even
under reduced motion — the hero marquee is artwork and must be built either
way, with motion.css freezing the rows — whereas `motion` holds the reveals
and parallax that must not run at all.

## Interactions, by section

| Section | Behaviour |
|---|---|
| **Nav** | Auto-hides on scroll down, returns on scroll up. Picks up a blurred white ground once the hero is behind. Works/About highlight while their section holds the viewport. |
| **Hero** | Word field is a live marquee — every row scrolls continuously, each in the opposite direction to the one above. Portrait sits in a glass frame that blurs the words passing behind it. Card lifts in while the photo settles from a deeper overscale; on scroll the marquee and the card separate into two planes (scrubbed). |
| **Intro** | Statement rises line by line out of per-line masks. Signature handwrites itself — 41 centreline strokes dashed end to end at constant pen speed. Brand grid pops in on a staggered sweep; cells lift on hover. |
| **Works** | Label column sticks (CSS, not JS) while cards pass. Per card: white mockup plate rises first, index then copy follow; artwork drifts ±10% inside its fixed crop, scrubbed (paired with `--work-img-scale: 1.28` — safe travel is 50*(scale-1)/scale). Index sits at the top of the details column, title + description at the bottom, against the base of the artwork. **Hover** tints the card `#f5f5f5` and expands the cursor circle into the "Read more" pill — the Figma's first card is that hover state drawn once for reference, not a permanently featured card. The **entire card is one clickable link** at every viewport (an `inset: 0` overlay anchor), so there's a single tab stop per card. |
| **CTA** | Each headline line slides in from the edge it's anchored to, so the type snaps into its alignment. |
| **Pills** | Lean toward the cursor within a small radius. Fine-pointer only. |
| **Cursor** | A single circle replaces the native arrow page-wide, and **expands into the "Read more" pill** over a work card — one element that widens and reveals its label, not a swap to a second node. The **resting circle** is painted white and composited via `mix-blend-mode: difference`, so it inverts against its backdrop and stays visible across white sections, black bands and photographs alike. The **expanded pill drops the blend** and is solid black with white text: it only ever opens over a work card, and inverting it against the artwork underneath turned it into shifting painting colours instead of a clean chip. Over a white ground the circle already reads as black, so the switch is visually continuous. The blend sits on the **outer** layer — the inner node is inside a stacking context (`will-change: transform`), which would trap its blend mode and blend it against nothing. `cursor: none` comes from a class JS sets, never the stylesheet, so a failed bundle can't leave the page with no cursor. Fine-pointer only, skipped under reduced motion. **States are attribute-driven**: an element declares `data-cursor="read"` (expand to the pill) or `data-cursor="lg"` (grow to a plain 64px circle, used on Next project). A new state is a token plus one CSS rule — no edit to `cursor.js`. The growth eases via the `width`/`height` transition already on `.cursor__bubble`, so it needs no GSAP. |

`prefers-reduced-motion: reduce` skips Lenis and every reveal — content renders
in its final position, no movement. Nav state still works (it's position, not
decoration).

### Two things worth knowing before you touch the motion code

Both cost real debugging time; they're commented at the source too.

1. **Never set a percentage transform in CSS for something GSAP animates via
   `xPercent`/`yPercent`.** GSAP parses the CSS percentage into its `y` (in px)
   and treats `yPercent` as a *separate additive* component — so animating
   `yPercent` to 0 leaves the px residual behind permanently. The line pre-state
   lives on the block as `opacity` for exactly this reason.

2. **`splitLines()` measures real layout, so it must wait for the webfont.**
   Measuring against the fallback face produces word groups that re-wrap to two
   lines once Inter lands, which breaks every mask. It also measures with
   `display: inline` words — `inline-block` makes each word atomic and the
   browser fits a different number per line than the real text does.

3. **The marquee's trailing gap lives inside the set, as `padding-right`.**
   The seamless loop translates each track `-50%`, which only lands the second
   set exactly where the first began if the track is precisely two set-widths.
   Put the gap *between* the two sets instead and you are off by half a gap —
   a visible jump once per cycle.

4. **The portrait's glass is four values and nothing else** — see
   `--glass-*` in `tokens.css`: 12% white fill, 8px backdrop blur, white
   border, 4% white inner glow. Photo radius 24px inside the card's 64px.

   Two things not to reintroduce here:

   *SVG displacement.* An `feDisplacementMap` refraction was tried and
   removed. `filter` applies to an element **and all of its content**, so on
   `.portrait` — which contains the photograph — it rippled the photo's edges
   and melted its corners. Confining it to a child layer works but needs the
   whole four-layer structure back for one subtle effect.

   *`stroke-linecap: round` draws a cap at EVERY dash boundary, not just
   at the path ends.* The obvious `dasharray: L` / `dashoffset: L` puts one
   boundary at path position 0 and the next at L, so every stroke rendered
   a half-round dot at both of its endpoints before anything was drawn —
   the signature appeared as a field of 82 dots up front. Fix: make the gap
   longer than the dash (`L, L + 4w`) and park the offset at `L + 2w`, so
   both boundaries sit clear of the path by more than a cap can reach.
   Durations are then shared out on `L + margin`, not `L`, or the margin
   becomes dead time and the pen speed lurches between strokes.

   *`getBoundingClientRect()` includes ancestor transforms; `offsetWidth`
   does not.* The cursor pill's open width is measured from its label, and
   the label sits inside a bubble that rests at `scale(0.3)` — reading the
   rect measured the text at 30% and opened the pill to a third of the
   width it needed (51px instead of 95px). Use `offsetWidth` for any
   measurement taken inside a transformed subtree.

   *GSAP resets `translate` / `scale` when it takes over a transform.* Never
   centre or scale the same element GSAP moves. It cost two bugs here — the
   work panel hanging half its height low, and the cursor chip sitting half
   its width right of the pointer. Both fixed by separating the concerns: the
   panel centres with `inset: 0; margin: auto` (no transform at all), and the
   cursor chip is two nodes — outer moved by GSAP, inner centred and scaled
   by CSS.

   *Transforms make containing blocks.* The work cards' whole-card link is
   an overlay anchor that must stay a **direct child of `.work`**. GSAP
   transforms the index and text (and `motion.css` sets `will-change: transform`
   on them), and a transform makes an element both a containing block *and* a
   stacking context — so an `inset: 0` overlay nested inside it gets trapped
   at that element's bounds instead of the card's. This cost a debugging
   round: the first attempt put the link on the title and only 4 of 49
   hit-tested points across the card actually resolved to it.

   *Backdrop roots.* If a `backdrop-filter` ever moves onto a *child* of
   `.portrait` again, then `.portrait` must never get `opacity < 1`,
   `isolation: isolate`, `filter`, or a non-normal `mix-blend-mode` — each
   makes it a **backdrop root** and the child's `backdrop-filter` silently
   samples an empty backdrop. With the filter on `.portrait` itself this
   no longer applies, but the hero parallax still only translates the card
   (it doesn't fade it) as a legacy of that constraint.

## Deviations from the Figma

All deliberate:

0. **Hero rebuilt as live elements.** The Figma ships the word field as one
   flattened PNG and the portrait frame as flat `rgba(0,0,0,0.04)`. Both are now
   real: the field is generated text rows (`marquee.js`) that scroll in
   alternating directions, and the frame is a liquid-glass material that
   actually samples the marquee through `backdrop-filter`. The 260 kB word-cloud
   export is gone. The nav availability dot moved from an SVG to CSS so it can
   ripple.

1. ~~**Signature font.**~~ **Resolved.** The design used *Prestige Signature
   Script Demo* (a demo font, no web licence). It's real vector artwork now,
   so there is no script webfont at all.

   **It genuinely handwrites.** The supplied artwork was 17 *closed filled*
   subpaths — outlines of the pen strokes — which can't be dash-animated
   (a stroke would trace around each letter's perimeter). So
   `scripts/centerline.py` derives the centreline:

   ```
   rasterise → binary mask → skeletonize → graph → polylines
            → RDP simplify → Catmull-Rom smoothing → open stroke paths
   ```

   It emits **41 open paths** at stroke-width 1.37, ordered left to right,
   which are inlined in `index.html` (inline is required — `stroke-dashoffset`
   has to reach the path elements). `intro.js` then dashes them **end to end**,
   each segment's duration proportional to its own length with `ease: 'none'`,
   so the pen crosses the whole signature at one constant speed. A stagger
   would give 41 overlapping pops instead.

   To regenerate after changing the artwork:
   ```bash
   python3 scripts/centerline.py <raster.png> <out.svg> <px-per-viewBox-unit>
   ```
   `src/assets/images/signature.svg` is kept as the filled master (pipeline
   input only — it isn't referenced at runtime, so Vite doesn't ship it).
   The one thing centreline stroking loses is the pen's thick/thin variation;
   the trace is a uniform width.

2. **Work card titles.** The Figma has "Facilio" on all four cards (placeholder).
   Set to Facilio / Kissflow / Jisr / Zapro to match the artwork order and your
   real client list. The **descriptions are still the Figma's placeholder copy**
   ("…high-end homes for Australian families") — that's an architecture-studio
   template line and needs replacing with real case study copy.

3. **Work artwork is scaled 1.12 in CSS**, and the hero word-cloud 1.15, purely
   to give the parallax drift room without exposing an edge. This crops each
   image slightly tighter than the Figma render.

## Still to add

- **`public/resume.pdf`** — the nav "Download Resume" link points at `/resume.pdf`,
  which doesn't exist yet. Until it does, the link serves the page itself.
- Real case study copy (see deviation 2).
- Real destinations for the four "Read more" links (currently `#`). If these
  become their own pages, that's the point to consider moving to Astro — the
  HTML and CSS carry over unchanged.
- Confirm the LinkedIn URL and contact address in `index.html`.
