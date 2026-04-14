/**
 * Naukrigulf.com scraper — widely used for Gulf/UAE jobs.
 */
const { newPage } = require('../browser');
const config = require('../../config');
const { sleep, extractTags, parseSalaryAED } = require('../utils');
const chalk = require('chalk');

// Map keywords to Naukrigulf search terms
function buildUrl(keyword) {
  // Naukrigulf uses keyword-jobs-in-uae URL pattern + date filter in query
  const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  return `https://www.naukrigulf.com/${slug}-jobs-in-uae?posted_at=${config.maxAgeDays}d`;
}

async function scrapeNaukrigulf(keyword) {
  const jobs = [];
  const page = await newPage();
  const url  = buildUrl(keyword);

  try {
    console.log(chalk.blue(`  [Naukri]   ${keyword}`));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await sleep(2500);

    await page.waitForSelector('.ni-job-tuple, .srp-jobtuple-wrapper, [data-result-id]', { timeout: 15000 }).catch(() => null);

    const raw = await page.evaluate(() => {
      // Try multiple selector patterns — site layout varies
      const selectors = [
        '.ni-job-tuple',
        '.srp-jobtuple-wrapper',
        '[data-result-id]',
        '.job-tuple',
      ];

      let cards = [];
      for (const sel of selectors) {
        cards = [...document.querySelectorAll(sel)];
        if (cards.length > 0) break;
      }

      const results = [];
      cards.forEach((card) => {
        try {
          const titleEl  = card.querySelector('.title a, a.title, h2 a, [class*="title"] a');
          const compEl   = card.querySelector('.comp-name, [class*="company"], [class*="comp"]');
          const locEl    = card.querySelector('.locWdth, [class*="location"], [class*="loc"]');
          const salEl    = card.querySelector('.sal, [class*="salary"], [class*="sal"]');
          const dateEl   = card.querySelector('[class*="freshness"], [class*="date"], [class*="posted"]');

          const title    = titleEl?.textContent?.trim();
          const company  = compEl?.textContent?.trim();
          const location = locEl?.textContent?.trim();
          const salary   = salEl?.textContent?.trim();
          const date     = dateEl?.textContent?.trim();
          const href     = titleEl?.href;

          if (title && href) {
            results.push({ title, company: company || '', location: location || '', salary: salary || null, date: date || '', url: href });
          }
        } catch (_) { /* skip */ }
      });
      return results;
    });

    raw.forEach((j) => {
      jobs.push({
        title:     j.title,
        company:   j.company,
        location:  j.location,
        salary:    j.salary,
        salaryAED: parseSalaryAED(j.salary),
        date:      j.date,
        url:       j.url,
        platform:  'Naukrigulf',
        tags:      extractTags(j.title),
      });
    });

    console.log(chalk.green(`  [Naukri]   "${keyword}" → ${raw.length} jobs`));
  } catch (err) {
    console.log(chalk.yellow(`  [Naukri]   "${keyword}" failed: ${err.message}`));
  } finally {
    await page.close();
  }

  return jobs;
}

async function run() {
  const allJobs = [];
  for (const keyword of config.keywords) {
    const jobs = await scrapeNaukrigulf(keyword);
    allJobs.push(...jobs);
    await sleep(config.delayBetweenMs);
  }
  return allJobs;
}

module.exports = { run };
