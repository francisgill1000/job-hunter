module.exports = {
  // ── Search keywords ─────────────────────────────────────────────
  // Shorter keywords = broader matches (catches "PHP Laravel", "Senior Laravel", etc.)
  keywords: [
    'laravel',
    'react developer',
    'vue.js',
    'react native',
    'electron developer',
  ],

  // ── Location ────────────────────────────────────────────────────
  location: 'United Arab Emirates',

  // ── Salary ──────────────────────────────────────────────────────
  // Jobs that EXPLICITLY advertise a salary below this are marked low-pay.
  // Jobs with no salary shown are always included (most don't show it).
  minSalaryAED: 7000,

  // ── Age filter ──────────────────────────────────────────────────
  // Only fetch jobs posted within the last N days
  // 3 is a good balance — catches Fri/Sat/Sun if you run on Monday
  maxAgeDays: 3,

  // ── Platforms to enable ─────────────────────────────────────────
  platforms: {
    linkedin:   true,
    indeed:     true,
    bayt:       true,
    naukrigulf: true,
  },

  // ── Browser ─────────────────────────────────────────────────────
  headless: false,          // set false to watch the browser
  timeout: 35000,          // ms to wait for a page to load
  delayBetweenMs: 2500,    // ms pause between requests (be polite)

  // ── Output paths ────────────────────────────────────────────────
  outputDir: './output',
  dataDir:   './data',

  // Open the HTML report automatically when done
  autoOpen: true,
};
