/**
 * Indeed UAE scraper — ae.indeed.com
 */
const { newPage } = require('../browser');
const config = require('../../config');
const { sleep, extractTags, parseSalaryAED } = require('../utils');
const chalk = require('chalk');

async function scrapeIndeed(keyword) {
  const jobs = [];
  const page = await newPage();

  const params = new URLSearchParams({
    q:       keyword,
    l:       'United Arab Emirates',
    fromage: String(config.maxAgeDays), // number of days back
    sort:    'date',
    radius:  '50',
  });

  const url = `https://ae.indeed.com/jobs?${params.toString()}`;

  try {
    console.log(chalk.blue(`  [Indeed]   ${keyword}`));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    // Dismiss any cookie/consent overlay
    const closeBtn = await page.$('[id*="onetrust-accept"], button[aria-label="close"]');
    if (closeBtn) await closeBtn.click().catch(() => null);

    await page.waitForSelector('[data-jk], .job_seen_beacon', { timeout: 15000 }).catch(() => null);

    const raw = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-jk], .job_seen_beacon');
      const results = [];

      cards.forEach((card) => {
        try {
          const jk       = card.getAttribute('data-jk') || card.closest('[data-jk]')?.getAttribute('data-jk');
          const titleEl  = card.querySelector('h2.jobTitle a span[title], h2.jobTitle span[title], h2.jobTitle a');
          const compEl   = card.querySelector('[data-testid="company-name"], .companyName');
          const locEl    = card.querySelector('[data-testid="text-location"], .companyLocation');
          const salEl    = card.querySelector('[data-testid="attribute_snippet_testid"], .salary-snippet-container, .estimated-salary');
          const dateEl   = card.querySelector('[data-testid="myJobsStateDate"], .date');

          const title    = titleEl?.getAttribute('title') || titleEl?.textContent?.trim();
          const company  = compEl?.textContent?.trim();
          const location = locEl?.textContent?.trim();
          const salary   = salEl?.textContent?.trim();
          const date     = dateEl?.textContent?.trim();
          const url      = jk ? `https://ae.indeed.com/viewjob?jk=${jk}` : null;

          if (title && url) {
            results.push({ title, company: company || '', location: location || '', salary: salary || null, date: date || '', url });
          }
        } catch (_) { /* skip */ }
      });
      return results;
    });

    raw.forEach((j) => {
      jobs.push({
        title:    j.title,
        company:  j.company,
        location: j.location,
        salary:   j.salary,
        salaryAED: parseSalaryAED(j.salary),
        date:     j.date,
        url:      j.url,
        platform: 'Indeed',
        tags:     extractTags(j.title),
      });
    });

    console.log(chalk.green(`  [Indeed]   "${keyword}" → ${raw.length} jobs`));
  } catch (err) {
    console.log(chalk.yellow(`  [Indeed]   "${keyword}" failed: ${err.message}`));
  } finally {
    await page.close();
  }

  return jobs;
}

async function run() {
  const allJobs = [];
  for (const keyword of config.keywords) {
    const jobs = await scrapeIndeed(keyword);
    allJobs.push(...jobs);
    await sleep(config.delayBetweenMs);
  }
  return allJobs;
}

module.exports = { run };
