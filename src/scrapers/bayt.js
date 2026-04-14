/**
 * Bayt.com scraper — most popular job board in the Middle East / UAE.
 * Bayt often shows salary ranges which helps filter properly.
 */
const { newPage } = require('../browser');
const config = require('../../config');
const { sleep, extractTags, parseSalaryAED } = require('../utils');
const chalk = require('chalk');

// Map our generic keywords to Bayt's URL slug format
function toSlug(keyword) {
  return keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
}

async function scrapeBayt(keyword) {
  const jobs = [];
  const page = await newPage();

  // Bayt age filter values: 1=today, 3=3 days, 7=week, 30=month
  const slug = toSlug(keyword);
  const url  = `https://www.bayt.com/en/uae/jobs/${slug}-jobs/?filters%5Bjb_age_i%5D%5B0%5D=${config.maxAgeDays}&filters%5Bjb_age_i%5D%5B1%5D=${config.maxAgeDays}`;

  try {
    console.log(chalk.blue(`  [Bayt]     ${keyword}`));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    await page.waitForSelector('li[data-js-job], .has-pointer-d', { timeout: 15000 }).catch(() => null);

    const raw = await page.evaluate(() => {
      const cards = document.querySelectorAll('li[data-js-job]');
      const results = [];

      cards.forEach((card) => {
        try {
          const titleEl  = card.querySelector('h2.m0 a, h2 a');
          const compEl   = card.querySelector('[data-automation-id="company-name-container"] a, .t-default');
          const locEl    = card.querySelector('[data-automation-id="job-location-link-list"], .lbl-location');
          const salEl    = card.querySelector('[data-automation-id="salary-detail"], .t-small.t-mute');
          const dateEl   = card.querySelector('[data-automation-id="job-date"], .t-mute.is-block');

          const title    = titleEl?.textContent?.trim();
          const company  = compEl?.textContent?.trim();
          const location = locEl?.textContent?.trim();
          const salary   = salEl?.textContent?.trim();
          const date     = dateEl?.textContent?.trim();
          const url      = titleEl?.href;

          if (title && url) {
            results.push({ title, company: company || '', location: location || '', salary: salary || null, date: date || '', url });
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
        platform:  'Bayt',
        tags:      extractTags(j.title),
      });
    });

    console.log(chalk.green(`  [Bayt]     "${keyword}" → ${raw.length} jobs`));
  } catch (err) {
    console.log(chalk.yellow(`  [Bayt]     "${keyword}" failed: ${err.message}`));
  } finally {
    await page.close();
  }

  return jobs;
}

async function run() {
  const allJobs = [];
  for (const keyword of config.keywords) {
    const jobs = await scrapeBayt(keyword);
    allJobs.push(...jobs);
    await sleep(config.delayBetweenMs);
  }
  return allJobs;
}

module.exports = { run };
