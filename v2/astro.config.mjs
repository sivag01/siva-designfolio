import { defineConfig } from 'astro/config';

export default defineConfig({
  // Static output — every page is plain HTML in dist/, deployed as before.
  output: 'static',

  // Astro's floating dev widget overlays the page in dev and shows up in
  // screenshots. It never ships, but it gets in the way of visual checks.
  devToolbar: { enabled: false },

  server: {
    // Keeps .claude/launch.json and the existing preview tooling pointed
    // at the same port Vite used, rather than Astro's default 4321.
    port: 5173,
    host: false,
  },

  // Astro runs on Vite, so the build tuning from vite.config.js carries
  // over verbatim under this key.
  vite: {
    build: {
      // Inline anything under 2 kB (small SVGs) and keep photos as files.
      assetsInlineLimit: 2048,
      rollupOptions: {
        output: {
          // The animation runtime is the same on every page, so it gets
          // its own long-cached chunk instead of being duplicated into
          // each page's entry.
          manualChunks(id) {
            if (id.includes('gsap') || id.includes('lenis')) return 'motion';
          },
        },
      },
    },
  },
});
