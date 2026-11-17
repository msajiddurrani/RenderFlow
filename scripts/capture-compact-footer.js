const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function captureFooter() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3333', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  const footerEl = await page.$('.compact-footer');
  if (footerEl) {
    await footerEl.screenshot({ path: path.join(__dirname, '../uploads/compact-footer-clean.png') });
    console.log('Saved compact footer screenshot!');
  }
  await browser.close();
}

captureFooter().catch(console.error);
