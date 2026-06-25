'use strict';

/* ─────────────────────────────────────────────────────────────
   SG Portfolio — main.js
   Modules: splitText, reveal, navbar, parallax, counters, form
───────────────────────────────────────────────────────────── */

// Mark JS as available for CSS progressive enhancement
document.documentElement.classList.add('js');

/* ─────────────────────────────────────────────────────────────
   UTILITIES
───────────────────────────────────────────────────────────── */

function splitIntoWords(el) {
  if (!el) return;
  const html = el.innerHTML;
  // Preserve any existing HTML structure by working on text nodes only
  const text = el.textContent.trim();
  const words = text.split(/\s+/);
  el.innerHTML = words
    .map(w => `<span class="word"><span class="word-inner">${w}</span></span>`)
    .join(' ');
}

function splitIntoLetters(el) {
  if (!el) return;
  const text = el.textContent.trim();
  el.setAttribute('aria-label', text);
  el.innerHTML = text
    .split('')
    .map(c => `<span class="char" aria-hidden="true">${c === ' ' ? '&nbsp;' : c}</span>`)
    .join('');
}

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

/* ─────────────────────────────────────────────────────────────
   HERO NAME — letter split + scale + animate
───────────────────────────────────────────────────────────── */

function setupHeroName() {
  const nameEl = document.querySelector('.hero__name');
  if (!nameEl) return;

  splitIntoLetters(nameEl);
  nameEl.classList.add('js-split');
  scaleToFitWidth(nameEl);

  // Animate letters shortly after paint
  requestAnimationFrame(() => {
    setTimeout(() => nameEl.classList.add('is-visible'), 120);
  });

  // Re-scale on resize (debounced)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => scaleToFitWidth(nameEl), 120);
  }, { passive: true });
}

/* ─────────────────────────────────────────────────────────────
   SPLIT TEXT — word-reveal elements
───────────────────────────────────────────────────────────── */

function setupSplitText() {
  document.querySelectorAll('.split-text').forEach(el => splitIntoWords(el));
}

/* ─────────────────────────────────────────────────────────────
   INTERSECTION OBSERVER — scroll reveals
───────────────────────────────────────────────────────────── */

function setupReveal() {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -7% 0px', threshold: 0 }
  );

  document.querySelectorAll(
    '[data-reveal], [data-stagger], .split-text'
  ).forEach(el => io.observe(el));
}

/* ─────────────────────────────────────────────────────────────
   NAVBAR — transparent → solid on scroll
───────────────────────────────────────────────────────────── */

function setupNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const heroImage = document.querySelector('.hero__image-wrap');
  let threshold = 80;

  const setThreshold = () => {
    if (heroImage) {
      threshold = heroImage.getBoundingClientRect().height * 0.6;
    }
  };

  const onScroll = () => {
    navbar.classList.toggle('is-scrolled', window.scrollY > threshold);
  };

  setThreshold();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', setThreshold, { passive: true });
  onScroll();
}

/* ─────────────────────────────────────────────────────────────
   PARALLAX — subtle vertical shift on hero image
───────────────────────────────────────────────────────────── */

function setupParallax() {
  const img = document.querySelector('.hero__image');
  if (!img) return;

  // Disable on reduced-motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    requestAnimationFrame(() => {
      const offset = window.scrollY;
      img.style.transform = `translateY(${offset * 0.25}px)`;
      ticking = false;
    });
    ticking = true;
  }, { passive: true });
}

/* ─────────────────────────────────────────────────────────────
   STATS COUNTER — count-up animation on scroll-into-view
───────────────────────────────────────────────────────────── */

function countUp(el, target, suffix, duration) {
  let start = null;

  const step = (ts) => {
    if (!start) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3); // cubic ease-out
    el.textContent = Math.floor(target * eased) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

function setupCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        const duration = parseInt(el.dataset.duration || '1200', 10);
        countUp(el, target, suffix, duration);
        io.unobserve(el);
      });
    },
    { threshold: 0.6 }
  );

  counters.forEach(el => io.observe(el));
}

/* ─────────────────────────────────────────────────────────────
   BUTTON MAGNETIC HOVER
   Subtle mouse-follow on large CTA buttons
───────────────────────────────────────────────────────────── */

function setupMagneticButtons() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(hover: none)').matches) return; // skip touch devices

  document.querySelectorAll('.btn--dark, .btn--send').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top  + rect.height / 2;
      const dx = (e.clientX - cx) * 0.25;
      const dy = (e.clientY - cy) * 0.25;
      btn.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   AREA CARD — cursor text on hover
───────────────────────────────────────────────────────────── */

function setupAreaCards() {
  if (window.matchMedia('(hover: none)').matches) return;

  const cards = document.querySelectorAll('.area-card');
  cards.forEach(card => {
    card.setAttribute('role', 'article');
  });
}

/* ─────────────────────────────────────────────────────────────
   CONTACT FORM
───────────────────────────────────────────────────────────── */

function setupForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('.btn--send');
    const span = btn.querySelector('span');
    if (!btn || btn.disabled) return;

    span.textContent = 'Sending…';
    btn.disabled = true;

    // Replace this block with your actual form API (e.g. Formspree, EmailJS)
    setTimeout(() => {
      span.textContent = 'Message sent ✓';
      form.reset();
      setTimeout(() => {
        span.textContent = 'Send message';
        btn.disabled = false;
      }, 3500);
    }, 1600);
  });
}

/* ─────────────────────────────────────────────────────────────
   SMOOTH SCROLL — anchor links
───────────────────────────────────────────────────────────── */

function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   ACTIVE NAV LINK — highlight based on scroll position
───────────────────────────────────────────────────────────── */

function setupActiveNav() {
  const sections = document.querySelectorAll('[data-section]');
  const navLink  = document.querySelector('.btn--nav');
  if (!sections.length || !navLink) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          if (id === 'works') navLink.style.background = 'var(--clr-page-bg)';
          else navLink.style.background = '';
        }
      });
    },
    { threshold: 0.4 }
  );

  sections.forEach(s => io.observe(s));
}

/* ─────────────────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  setupHeroName();       // 1. Scale + animate hero name (must be first)
  setupSplitText();      // 2. Split word-reveal paragraphs
  setupReveal();         // 3. IO for all scroll reveals
  setupNavbar();         // 4. Sticky navbar state
  setupParallax();       // 5. Hero image parallax
  setupCounters();       // 6. Stats count-up
  setupMagneticButtons();// 7. Magnetic CTA buttons
  setupAreaCards();      // 8. Area card roles
  setupForm();           // 9. Contact form
  setupSmoothScroll();   // 10. Anchor smooth scroll
  setupActiveNav();      // 11. Active nav highlight
});
