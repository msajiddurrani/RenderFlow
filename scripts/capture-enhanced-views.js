const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const uploadsDir = path.join(__dirname, '../uploads');

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,960']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });

  console.log('Navigating to http://localhost:3333...');
  await page.goto('http://localhost:3333', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  // 1. Above the fold (Home Page showing tightened layout and removed badges)
  const homePath = path.join(uploadsDir, 'tightened-01-home-above-fold.png');
  await page.screenshot({ path: homePath });
  console.log('Saved:', homePath);

  // 2. Focused on Visionary Steps section
  const stepsElem = await page.$('.visionary-steps-section');
  if (stepsElem) {
    const stepsPath = path.join(uploadsDir, 'tightened-02-visionary-steps.png');
    await stepsElem.screenshot({ path: stepsPath });
    console.log('Saved:', stepsPath);
  }

  // 3. Full page
  const fullPath = path.join(uploadsDir, 'tightened-03-full-home.png');
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log('Saved:', fullPath);

  await browser.close();
  console.log('Screenshots captured successfully!');
}

capture().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
