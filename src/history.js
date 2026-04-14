/**
 * Tracks job URLs seen in previous runs so we can mark NEW vs SEEN jobs.
 * Stored in data/history.json — old entries expire after 30 days.
 */
const fs   = require('fs');
const path = require('path');
const config = require('../config');

const HISTORY_FILE  = path.join(config.dataDir, 'history.json');
const EXPIRE_MS     = 30 * 24 * 60 * 60 * 1000; // 30 days

function load() {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return {};
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
  } catch (_) {
    return {};
  }
}

function save(data) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Marks jobs as new/seen and persists the new URLs.
 * @param {object[]} jobs
 * @returns {object[]} same jobs with `.isNew` boolean added
 */
function markAndUpdate(jobs) {
  const history = load();
  const now     = Date.now();

  // Prune expired entries
  for (const [url, ts] of Object.entries(history)) {
    if (now - ts > EXPIRE_MS) delete history[url];
  }

  const result = jobs.map((job) => {
    const isNew = !history[job.url];
    if (isNew) history[job.url] = now;
    return { ...job, isNew };
  });

  save(history);
  return result;
}

module.exports = { markAndUpdate };
