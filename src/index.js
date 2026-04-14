/**
 * Job Hunter — main entry point.
 *
 * Run: node src/index.js
 *
 * Flow:
 *  1. Run enabled scrapers sequentially (polite, avoids IP bans)
 *  2. Deduplicate across platforms
 *  3. Filter out explicitly low-salary jobs
 *  4. Mark new vs. seen (history tracking)
 *  5. Sort newest first
 *  6. Generate HTML report → auto-open in browser
 */

const chalk          = require('chalk');
const open           = require('open');
const config         = require('../config');
const { closeBrowser }  = require('./browser');
const { dedup, passesSalaryFilter, sortByNewest } = require('./utils');
const { markAndUpdate } = require('./history');
const { generateReport } = require('./report');

// Scrapers
const scrapers = {
  linkedin:   require('./scrapers/linkedin'),
  indeed:     require('./scrapers/indeed'),
  bayt:       require('./scrapers/bayt'),
  naukrigulf: require('./scrapers/naukrigulf'),
};

// ── Banner ───────────────────────────────────────────────────────────────────
function banner() {
  console.log(chalk.bold.cyan('\n╔══════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║       JOB HUNTER  —  Daily Run       ║'));
  console.log(chalk.bold.cyan('╚══════════════════════════════════════╝'));
  console.log(chalk.gray(`  Date     : ${new Date().toLocaleString()}`));
  console.log(chalk.gray(`  Keywords : ${config.keywords.join(', ')}`));
  console.log(chalk.gray(`  Location : ${config.location}`));
  console.log(chalk.gray(`  Min Sal  : ${config.minSalaryAED.toLocaleString()} AED`));
  console.log(chalk.gray(`  Age      : last ${config.maxAgeDays} day(s)`));
  console.log('');
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  banner();
  const allJobs = [];

  for (const [name, scraper] of Object.entries(scrapers)) {
    if (!config.platforms[name]) {
      console.log(chalk.gray(`  Skipping ${name} (disabled in config)`));
      continue;
    }
    console.log(chalk.bold(`\n▶ Scraping ${name.toUpperCase()}…`));
    try {
      const jobs = await scraper.run();
      allJobs.push(...jobs);
    } catch (err) {
      console.log(chalk.red(`  ${name} crashed: ${err.message}`));
    }
  }

  await closeBrowser();

  // ── Post-processing ──────────────────────────────────────────────────────
  console.log(chalk.bold('\n▶ Processing results…'));
  console.log(chalk.gray(`  Raw total     : ${allJobs.length}`));

  const deduplicated = dedup(allJobs);
  console.log(chalk.gray(`  After dedup   : ${deduplicated.length}`));

  const filtered = deduplicated.filter((j) =>
    passesSalaryFilter(j, config.minSalaryAED)
  );
  console.log(chalk.gray(`  After salary  : ${filtered.length}`));

  const withHistory = markAndUpdate(filtered);
  const newCount    = withHistory.filter((j) => j.isNew).length;
  console.log(chalk.green(`  New today     : ${newCount}`));

  const sorted = sortByNewest(withHistory);

  // ── Report ───────────────────────────────────────────────────────────────
  console.log(chalk.bold('\n▶ Generating report…'));
  const reportPath = generateReport(sorted, config.minSalaryAED);
  console.log(chalk.green(`  Report saved  : ${reportPath}`));

  if (config.autoOpen) {
    await open(reportPath);
    console.log(chalk.green('  Report opened in browser.'));
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const byPlatform = {};
  for (const j of sorted) {
    byPlatform[j.platform] = (byPlatform[j.platform] || 0) + 1;
  }

  console.log(chalk.bold.cyan('\n╔══════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║              SUMMARY                 ║'));
  console.log(chalk.bold.cyan('╠══════════════════════════════════════╣'));
  console.log(chalk.cyan(`║  Total unique jobs : ${String(sorted.length).padEnd(16)}║`));
  console.log(chalk.cyan(`║  New today         : ${String(newCount).padEnd(16)}║`));
  for (const [platform, count] of Object.entries(byPlatform)) {
    const line = `${platform.padEnd(18)}: ${count}`;
    console.log(chalk.cyan(`║  ${line.padEnd(36)}║`));
  }
  console.log(chalk.bold.cyan('╚══════════════════════════════════════╝\n'));
}

main().catch((err) => {
  console.error(chalk.red('\n[FATAL]'), err.message);
  closeBrowser().finally(() => process.exit(1));
});
