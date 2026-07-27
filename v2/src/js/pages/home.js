import { initSite } from '../site.js';
import { initMarquee } from '../motion/marquee.js';
import { initHero } from '../motion/hero.js';
import { initIntro } from '../motion/intro.js';
import { initWorks } from '../motion/works.js';
import { initCta } from '../motion/cta.js';
import { initKinetic } from '../motion/kinetic.js';

initSite({
  // The marquee is the hero's artwork, so it is built even under
  // reduced motion — motion.css freezes the rows and it reads as the
  // static word field the Figma shows.
  always: () => {
    initMarquee();
    // Same reasoning: the dot lattice is the band's ground, so it is
    // drawn under reduced motion too — kinetic.js renders the resting
    // grid there and never starts the springs.
    initKinetic();
  },
  motion: () => {
    initHero();
    initIntro();
    initWorks();
    initCta();
  },
});
