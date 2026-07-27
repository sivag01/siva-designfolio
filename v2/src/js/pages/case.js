import { initSite } from '../site.js';
import { initCase } from '../motion/case.js';

// Case studies reuse the shared set (nav, smooth scroll, cursor,
// magnetic pills) and add their own reveals. No marquee, hero or works
// motion — those elements are not on this page.
initSite({
  motion: () => {
    initCase();
  },
});
