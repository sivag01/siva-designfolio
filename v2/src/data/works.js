/**
 * The four case studies, in running order.
 *
 * This is metadata only — slug, display name, index, tagline and cover.
 * It deliberately says nothing about LAYOUT: each page under
 * pages/works/ still composes its own sections, so one can carry stats
 * or six previews and another can't. What lives here is the stuff that
 * must not drift between places:
 *
 *   • the home page's card links and 01/04 numbering
 *   • each page's own index and title
 *   • the Next-project chain
 *
 * Hardcoding those in three places is how a "04/04" ends up on the
 * second card, or a Next link ends up pointing at itself.
 */
import facilioCover from '../assets/images/work-01.webp';
import kissflowCover from '../assets/images/work-02.webp';
import jisrCover from '../assets/images/work-03.webp';
import zaproCover from '../assets/images/work-04.webp';

export const works = [
  {
    slug: 'facilio',
    name: 'Facilio',
    tagline: 'Connected facility operations for global real estate.',
    cover: facilioCover,
  },
  {
    slug: 'kissflow',
    name: 'Kissflow',
    tagline: 'No-code workflow automation for enterprises at scale.',
    cover: kissflowCover,
  },
  {
    slug: 'jisr',
    name: 'Jisr',
    tagline: 'Modern HR and payroll software built for the Arab world.',
    cover: jisrCover,
  },
  {
    slug: 'zapro',
    name: 'Zapro',
    tagline: 'AI-first procurement platform for modern businesses.',
    cover: zaproCover,
  },
];

/** `01/04` … `04/04`, derived so it can never disagree with the order. */
export const indexOf = (slug) => {
  const i = works.findIndex((w) => w.slug === slug);
  return `${String(i + 1).padStart(2, '0')}/${String(works.length).padStart(2, '0')}`;
};

export const hrefOf = (slug) => `/works/${slug}/`;

/** The next project, wrapping from the last back to the first. */
export const nextAfter = (slug) => {
  const i = works.findIndex((w) => w.slug === slug);
  return works[(i + 1) % works.length];
};

export const bySlug = (slug) => works.find((w) => w.slug === slug);

/**
 * Placeholder body copy. Every paragraph in the Figma detail page is
 * these same two sentences repeated — kept in one place so replacing
 * them with real case study writing is a single edit per page rather
 * than a hunt through four files.
 */
export const LEAD =
  "Great founders changing the world deserve a presence as powerful as what they're building. Most founders we work with have built something significant, but their website doesn't show it yet.";
export const GAP =
  'That gap costs more than revenue. It costs the certainty that your brand is finally being understood.';

/**
 * What the work covered. One list for now, identical on all four pages,
 * but each page passes it explicitly rather than the component owning a
 * default — so giving one project its own scope is a page edit, not a
 * change to the shared header.
 */
export const RESPONSIBILITIES = [
  'Visual design',
  'Design system',
  'CRO',
  'Design operations',
];
