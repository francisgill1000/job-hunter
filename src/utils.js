/**
 * Shared utilities used across scrapers and the main script.
 */

// ── Sleep ────────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Tech tag extraction ──────────────────────────────────────────────────────
const TAG_MAP = [
  { pattern: /laravel/i,        tag: 'Laravel' },
  { pattern: /php/i,            tag: 'PHP' },
  { pattern: /react\s*native/i, tag: 'React Native' },
  { pattern: /react/i,          tag: 'React' },
  { pattern: /next\.?js/i,      tag: 'Next.js' },
  { pattern: /vue/i,            tag: 'Vue.js' },
  { pattern: /nuxt/i,           tag: 'Nuxt.js' },
  { pattern: /electron/i,       tag: 'Electron' },
  { pattern: /node/i,           tag: 'Node.js' },
  { pattern: /typescript/i,     tag: 'TypeScript' },
  { pattern: /javascript/i,     tag: 'JavaScript' },
  { pattern: /full.?stack/i,    tag: 'Full-Stack' },
  { pattern: /front.?end/i,     tag: 'Frontend' },
  { pattern: /back.?end/i,      tag: 'Backend' },
  { pattern: /mobile/i,         tag: 'Mobile' },
];

function extractTags(text) {
  if (!text) return [];
  const found = [];
  const seen  = new Set();
  for (const { pattern, tag } of TAG_MAP) {
    if (pattern.test(text) && !seen.has(tag)) {
      found.push(tag);
      seen.add(tag);
    }
  }
  return found;
}

// ── Salary parser ────────────────────────────────────────────────────────────
// Tries to extract a numeric AED value from salary strings like:
//  "AED 8,000 – 12,000 per month"
//  "7500 AED"
//  "8k-12k AED"
function parseSalaryAED(text) {
  if (!text) return null;

  const str = text.replace(/,/g, '').toLowerCase();

  // Capture numbers (possibly with k suffix)
  const numbers = [];
  const re = /(\d+(?:\.\d+)?)\s*k?/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    let val = parseFloat(m[1]);
    if (/\d+k/.test(m[0])) val *= 1000;
    if (val > 500) numbers.push(val); // ignore small noise like "2 years"
  }

  if (numbers.length === 0) return null;

  // Return the lower bound (minimum salary shown)
  return Math.min(...numbers);
}

// ── Deduplication ────────────────────────────────────────────────────────────
function normalise(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function dedup(jobs) {
  const seen = new Map();
  const out  = [];

  for (const job of jobs) {
    // Primary key: URL
    if (seen.has(job.url)) continue;
    seen.set(job.url, true);

    // Secondary key: title + company (catches cross-platform duplicates)
    const key = `${normalise(job.title)}|${normalise(job.company)}`;
    if (seen.has(key)) continue;
    seen.set(key, true);

    out.push(job);
  }

  return out;
}

// ── Salary filter ────────────────────────────────────────────────────────────
// Returns true if the job should be shown (not below minSalary)
function passesSalaryFilter(job, minSalary) {
  if (job.salaryAED == null) return true;      // no salary info → show it
  return job.salaryAED >= minSalary;
}

// ── Date sort ────────────────────────────────────────────────────────────────
function sortByNewest(jobs) {
  return jobs.sort((a, b) => {
    const da = new Date(a.date || 0);
    const db = new Date(b.date || 0);
    return db - da;
  });
}

module.exports = { sleep, extractTags, parseSalaryAED, dedup, passesSalaryFilter, sortByNewest };
