/**
 * Generates a self-contained HTML report with filtering, search,
 * and one-click Apply links. No external dependencies — fully offline.
 */
const fs   = require('fs');
const path = require('path');
const config = require('../config');

const PLATFORM_COLORS = {
  LinkedIn:   '#0a66c2',
  Indeed:     '#2164f3',
  Bayt:       '#cc0000',
  Naukrigulf: '#f15a22',
};

const TAG_COLORS = {
  'Laravel':      '#ff4d4d',
  'PHP':          '#8892be',
  'React':        '#61dafb',
  'React Native': '#20232a',
  'Next.js':      '#000000',
  'Vue.js':       '#42b883',
  'Nuxt.js':      '#00c58e',
  'Electron':     '#47848f',
  'Node.js':      '#68a063',
  'TypeScript':   '#3178c6',
  'JavaScript':   '#f7df1e',
  'Full-Stack':   '#a855f7',
  'Frontend':     '#ec4899',
  'Backend':      '#6366f1',
  'Mobile':       '#f59e0b',
};

function tagChip(tag) {
  const bg  = TAG_COLORS[tag] || '#555';
  const txt = (tag === 'JavaScript' || tag === 'React Native') ? '#111' : '#fff';
  return `<span class="tag" style="background:${bg};color:${txt}">${tag}</span>`;
}

function platformBadge(platform) {
  const bg = PLATFORM_COLORS[platform] || '#555';
  return `<span class="platform-badge" style="background:${bg}">${platform}</span>`;
}

function salaryBadge(job, minSalary) {
  if (!job.salary) return '<span class="badge badge-unknown">Salary not disclosed</span>';
  if (job.salaryAED != null && job.salaryAED < minSalary) {
    return `<span class="badge badge-low">⚠ ${job.salary}</span>`;
  }
  return `<span class="badge badge-good">💰 ${job.salary}</span>`;
}

function newBadge(isNew) {
  return isNew
    ? '<span class="badge badge-new">🆕 NEW</span>'
    : '';
}

function jobCard(job, minSalary) {
  const tags     = (job.tags || []).map(tagChip).join(' ');
  const platform = platformBadge(job.platform);
  const salary   = salaryBadge(job, minSalary);
  const isNewB   = newBadge(job.isNew);
  const date     = job.date ? `<span class="date">${job.date}</span>` : '';
  const location = job.location ? `<span class="location">📍 ${job.location}</span>` : '';
  const company  = job.company  ? `<span class="company">🏢 ${job.company}</span>` : '';

  // Data attributes used for client-side filtering
  const dataTags     = (job.tags || []).join(',');
  const dataPlatform = job.platform;
  const dataNew      = job.isNew ? '1' : '0';

  return `
  <div class="card" data-tags="${dataTags}" data-platform="${dataPlatform}" data-new="${dataNew}">
    <div class="card-header">
      ${platform}
      ${isNewB}
      ${date}
    </div>
    <h3 class="job-title">${escHtml(job.title)}</h3>
    <div class="meta">${company}${location}</div>
    <div class="salary-row">${salary}</div>
    <div class="tags-row">${tags}</div>
    <a class="apply-btn" href="${escHtml(job.url)}" target="_blank" rel="noopener">
      View &amp; Apply →
    </a>
  </div>`.trim();
}

function escHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildReport(jobs, date, minSalary) {
  const total       = jobs.length;
  const newCount    = jobs.filter((j) => j.isNew).length;
  const byPlatform  = {};
  const byTag       = {};

  for (const job of jobs) {
    byPlatform[job.platform] = (byPlatform[job.platform] || 0) + 1;
    for (const tag of job.tags || []) {
      byTag[tag] = (byTag[tag] || 0) + 1;
    }
  }

  const platformStats = Object.entries(byPlatform)
    .sort((a, b) => b[1] - a[1])
    .map(([p, n]) => `<div class="stat-pill" style="border-color:${PLATFORM_COLORS[p] || '#555'}">${p}: <strong>${n}</strong></div>`)
    .join('');

  const tagStats = Object.entries(byTag)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `<div class="stat-pill">${t}: <strong>${n}</strong></div>`)
    .join('');

  // All unique platforms and tags for filter buttons
  const platforms = Object.keys(byPlatform);
  const allTags   = Object.keys(byTag).sort();

  const platformBtns = platforms.map((p) =>
    `<button class="filter-btn" data-filter="platform" data-value="${p}" style="border-color:${PLATFORM_COLORS[p] || '#555'}">${p}</button>`
  ).join('');

  const tagBtns = allTags.map((t) =>
    `<button class="filter-btn" data-filter="tag" data-value="${t}">${t}</button>`
  ).join('');

  const cards = jobs.map((j) => jobCard(j, minSalary)).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Job Hunt — ${date}</title>
<style>
  :root {
    --bg:      #0f0f1a;
    --surface: #1a1a2e;
    --card:    #16213e;
    --border:  #2a2a4a;
    --text:    #e2e8f0;
    --muted:   #94a3b8;
    --accent:  #6366f1;
    --green:   #22c55e;
    --yellow:  #eab308;
    --red:     #ef4444;
    --new:     #f59e0b;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }

  /* ── Header ── */
  header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 20px 24px 12px;
    position: sticky; top: 0; z-index: 10;
  }
  .header-top {
    display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 12px;
  }
  header h1 { font-size: 20px; color: var(--text); }
  .header-meta { color: var(--muted); font-size: 13px; }
  .counts { display: flex; gap: 12px; flex-wrap: wrap; }
  .count-badge {
    padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;
  }
  .count-total  { background: var(--accent); color: #fff; }
  .count-new    { background: var(--new);    color: #000; }

  /* ── Stats pills ── */
  .stats-row {
    display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;
  }
  .stat-pill {
    border: 1px solid var(--border); border-radius: 20px;
    padding: 2px 10px; font-size: 12px; color: var(--muted);
  }

  /* ── Controls ── */
  .controls {
    display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
  }
  input[type=search] {
    background: var(--card); border: 1px solid var(--border);
    color: var(--text); padding: 6px 12px; border-radius: 6px;
    outline: none; width: 220px; font-size: 13px;
  }
  input[type=search]:focus { border-color: var(--accent); }

  .filter-group { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .filter-label { color: var(--muted); font-size: 12px; white-space: nowrap; }

  .filter-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
    padding: 3px 10px; border-radius: 20px;
    cursor: pointer; font-size: 12px; transition: all .15s;
  }
  .filter-btn:hover  { color: var(--text); border-color: #666; }
  .filter-btn.active { color: #fff; background: var(--accent); border-color: var(--accent); }

  .toggle-btn {
    background: var(--card); border: 1px solid var(--border);
    color: var(--muted); padding: 4px 12px; border-radius: 6px;
    cursor: pointer; font-size: 12px; margin-left: auto;
  }
  .toggle-btn.active { color: var(--new); border-color: var(--new); }

  /* ── Grid ── */
  main { padding: 20px 24px; }
  #result-count { color: var(--muted); font-size: 13px; margin-bottom: 14px; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
    gap: 16px;
  }

  /* ── Job Card ── */
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px;
    display: flex; flex-direction: column; gap: 8px;
    transition: border-color .15s, transform .1s;
    position: relative; z-index: 0;
  }
  .card:hover { border-color: var(--accent); transform: translateY(-2px); }
  .card.hidden { display: none; }

  .card-header {
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  }
  .platform-badge {
    padding: 2px 8px; border-radius: 12px;
    font-size: 11px; font-weight: 700; color: #fff;
  }
  .date { color: var(--muted); font-size: 11px; margin-left: auto; }

  .job-title {
    font-size: 15px; font-weight: 600; color: var(--text); line-height: 1.3;
  }
  .meta { display: flex; flex-direction: column; gap: 2px; }
  .company, .location { font-size: 12px; color: var(--muted); }

  .salary-row { }
  .badge {
    display: inline-block; padding: 2px 10px;
    border-radius: 20px; font-size: 11px; font-weight: 600;
  }
  .badge-good    { background: #14532d; color: var(--green); }
  .badge-low     { background: #422006; color: var(--yellow); }
  .badge-unknown { background: var(--bg); color: var(--muted); border: 1px solid var(--border); }
  .badge-new     { background: #78350f; color: var(--new); }

  .tags-row { display: flex; gap: 4px; flex-wrap: wrap; }
  .tag {
    padding: 2px 7px; border-radius: 10px; font-size: 11px; font-weight: 600;
  }

  .apply-btn {
    display: block; margin-top: 4px;
    background: var(--accent);
    color: #fff; text-decoration: none;
    padding: 7px 14px; border-radius: 6px;
    font-size: 13px; font-weight: 600; text-align: center;
    transition: opacity .15s;
  }
  .apply-btn:hover { opacity: .85; }

  /* ── Empty state ── */
  #empty {
    text-align: center; padding: 60px 20px;
    color: var(--muted); display: none;
  }
  #empty h2 { font-size: 18px; margin-bottom: 8px; }

  /* ── Mobile ── */
  @media (max-width: 600px) {
    header { padding: 12px 14px 10px; }
    header h1 { font-size: 17px; }
    .header-meta { font-size: 11px; }
    .header-top { gap: 8px; margin-bottom: 8px; }

    .stats-row { gap: 5px; margin-bottom: 6px; }

    .controls { gap: 8px; }
    input[type=search] { width: 100%; font-size: 16px; /* prevents iOS zoom */ }

    .filter-group { gap: 5px; }
    .filter-btn, .toggle-btn { padding: 6px 12px; font-size: 12px; min-height: 34px; }
    .toggle-btn { margin-left: 0; }

    main { padding: 14px; }
    .grid { grid-template-columns: 1fr; gap: 12px; }

    .card { padding: 14px; }
    .job-title { font-size: 15px; }

    .apply-btn {
      padding: 12px 14px;
      font-size: 15px;
      min-height: 48px;
      display: flex; align-items: center; justify-content: center;
    }
  }
</style>
</head>
<body>

<header>
  <div class="header-top">
    <h1>Job Hunt Results</h1>
    <div class="counts">
      <span class="count-badge count-total">${total} jobs found</span>
      ${newCount > 0 ? `<span class="count-badge count-new">${newCount} new today</span>` : ''}
    </div>
    <span class="header-meta">Searched: ${date} &nbsp;|&nbsp; Min salary: ${minSalary.toLocaleString()} AED</span>
  </div>

  <div class="stats-row">${platformStats}</div>
  <div class="stats-row">${tagStats}</div>

  <div class="controls">
    <input type="search" id="search-box" placeholder="Search title / company…">

    <div class="filter-group">
      <span class="filter-label">Platform:</span>
      ${platformBtns}
    </div>

    <div class="filter-group">
      <span class="filter-label">Tech:</span>
      ${tagBtns}
    </div>

    <button class="toggle-btn" id="new-only-btn">Show new only</button>
  </div>
</header>

<main>
  <div id="result-count"></div>
  <div class="grid" id="grid">
    ${cards}
  </div>
  <div id="empty">
    <h2>No jobs match your filters</h2>
    <p>Try removing some filters or running the hunt again tomorrow.</p>
  </div>
</main>

<script>
(function () {
  const grid        = document.getElementById('grid');
  const searchBox   = document.getElementById('search-box');
  const newOnlyBtn  = document.getElementById('new-only-btn');
  const resultCount = document.getElementById('result-count');
  const emptyState  = document.getElementById('empty');

  const state = {
    query:      '',
    platforms:  new Set(),
    tags:       new Set(),
    newOnly:    false,
  };

  function applyFilters() {
    const cards  = grid.querySelectorAll('.card');
    let visible  = 0;

    cards.forEach((card) => {
      const title    = card.querySelector('.job-title')?.textContent?.toLowerCase() || '';
      const company  = card.querySelector('.company')?.textContent?.toLowerCase() || '';
      const platform = card.dataset.platform || '';
      const tags     = card.dataset.tags ? card.dataset.tags.split(',') : [];
      const isNew    = card.dataset.new === '1';

      let show = true;

      // Text search
      if (state.query) {
        const q = state.query.toLowerCase();
        if (!title.includes(q) && !company.includes(q)) show = false;
      }

      // Platform filter (OR logic — any selected platform matches)
      if (show && state.platforms.size > 0) {
        if (!state.platforms.has(platform)) show = false;
      }

      // Tag filter (AND logic — all selected tags must be present)
      if (show && state.tags.size > 0) {
        for (const t of state.tags) {
          if (!tags.includes(t)) { show = false; break; }
        }
      }

      // New-only toggle
      if (show && state.newOnly && !isNew) show = false;

      card.classList.toggle('hidden', !show);
      if (show) visible++;
    });

    resultCount.textContent = \`Showing \${visible} of ${total} jobs\`;
    emptyState.style.display = visible === 0 ? 'block' : 'none';
    grid.style.display       = visible === 0 ? 'none'  : '';
  }

  // Search input
  searchBox.addEventListener('input', (e) => {
    state.query = e.target.value.trim();
    applyFilters();
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type  = btn.dataset.filter;
      const value = btn.dataset.value;
      const set   = type === 'platform' ? state.platforms : state.tags;

      if (set.has(value)) {
        set.delete(value);
        btn.classList.remove('active');
      } else {
        set.add(value);
        btn.classList.add('active');
      }
      applyFilters();
    });
  });

  // New-only toggle
  newOnlyBtn.addEventListener('click', () => {
    state.newOnly = !state.newOnly;
    newOnlyBtn.classList.toggle('active', state.newOnly);
    newOnlyBtn.textContent = state.newOnly ? 'Show all' : 'Show new only';
    applyFilters();
  });

  applyFilters();
})();
</script>
</body>
</html>`;
}

function generateReport(jobs, minSalary) {
  const now  = new Date();
  const date = now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const html = buildReport(jobs, date, minSalary);

  fs.mkdirSync(config.outputDir, { recursive: true });

  // Dated archive copy  (output/jobs-2026-04-15.html)
  const datedPath = path.join(config.outputDir, `jobs-${now.toISOString().slice(0, 10)}.html`);
  fs.writeFileSync(datedPath, html, 'utf-8');

  // index.html — always overwritten, served by Netlify
  const indexPath = path.join(config.outputDir, 'index.html');
  fs.writeFileSync(indexPath, html, 'utf-8');

  return indexPath;
}

module.exports = { generateReport };
