/**
 * LinkedIn public job search scraper (no login required).
 * Returns jobs posted in the last 24 h by default.
 */
const { newPage } = require('../browser');
const config = require('../../config');
const { randomDelay, extractTags } = require('../utils');
const chalk = require('chalk');

const BASE = 'https://www.linkedin.com/jobs/search/';

async function scrapeLinkedIn(keyword) {
  const jobs = [];
  const page = await newPage();

  const secondsBack = config.maxAgeDays * 24 * 60 * 60;
  const params = new URLSearchParams({
    keywords: keyword,
    location: config.location,
    f_TPR: `r${secondsBack}`,  // e.g. r259200 = last 3 days
    sortBy: 'DD',               // date descending
    start: '0',
  });

  const url = `${BASE}?${params.toString()}`;

  try {
    console.log(chalk.blue(`  [LinkedIn] ${keyword}`));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    // Wait for job cards
    await page.waitForSelector(
      'ul.jobs-search__results-list, .jobs-search-results-list',
      { timeout: 15000 }
    ).catch(() => null);

    const raw = await page.evaluate(() => {
      const cards = document.querySelectorAll(
        'ul.jobs-search__results-list li, .jobs-search-results-list li'
      );
      const results = [];

      cards.forEach((card) => {
        try {
          const titleEl  = card.querySelector('h3.base-search-card__title, .base-card__full-link');
          const compEl   = card.querySelector('h4.base-search-card__subtitle a, .base-search-card__subtitle');
          const locEl    = card.querySelector('.job-search-card__location');
          const dateEl   = card.querySelector('time');
          const linkEl   = card.querySelector('a.base-card__full-link, a[href*="/jobs/view/"]');

          const title    = titleEl?.textContent?.trim();
          const company  = compEl?.textContent?.trim();
          const location = locEl?.textContent?.trim();
          const date     = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim();
          const url      = linkEl?.href;

          if (title && url) {
            results.push({ title, company: company || '', location: location || '', date: date || '', url });
          }
        } catch (_) { /* skip bad card */ }
      });
      return results;
    });

    raw.forEach((j) => {
      jobs.push({
        title:    j.title,
        company:  j.company,
        location: j.location,
        salary:   null,
        date:     j.date,
        url:      j.url,
        platform: 'LinkedIn',
        tags:     extractTags(j.title),
      });
    });

    console.log(chalk.green(`  [LinkedIn] "${keyword}" → ${raw.length} jobs`));
  } catch (err) {
    console.log(chalk.yellow(`  [LinkedIn] "${keyword}" failed: ${err.message}`));
  } finally {
    await page.close();
  }

  return jobs;
}

async function run() {
  const allJobs = [];
  for (const keyword of config.keywords) {
    const jobs = await scrapeLinkedIn(keyword);
    allJobs.push(...jobs);
    await randomDelay(...config.delayBetweenMs);
  }
  return allJobs;
}

module.exports = { run };
