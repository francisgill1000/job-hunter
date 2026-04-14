const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const config = require('../config');

puppeteer.use(StealthPlugin());

let _browser = null;

async function getBrowser() {
  if (_browser) return _browser;

  _browser = await puppeteer.launch({
    headless: config.headless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1366,768',
    ],
  });

  return _browser;
}

async function newPage() {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setViewport({ width: 1366, height: 768 });
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

  // Block images / media / fonts → faster scrape
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'media', 'font'].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });

  page.setDefaultNavigationTimeout(config.timeout);
  return page;
}

async function closeBrowser() {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}

module.exports = { newPage, closeBrowser };
