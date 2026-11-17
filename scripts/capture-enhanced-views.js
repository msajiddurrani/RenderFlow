const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const uploadsDir = path.join(__dirname, '../uploads');

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  console.log('Navigating to http://localhost:3333...');
  await page.goto('http://localhost:3333', { waitUntil: 'networkidle0' });

  // 1. Full Home Page Screenshot
  const homePath = path.join(uploadsDir, 'recreated-01-home.png');
  await page.screenshot({ path: homePath });
  console.log('Saved:', homePath);

  // 2. Focused Hero Section Screenshot
  const heroElem = await page.$('.home-hero');
  if (heroElem) {
    const heroPath = path.join(uploadsDir, 'recreated-02-hero.png');
    await heroElem.screenshot({ path: heroPath });
    console.log('Saved:', heroPath);
  }

  // 3. Focused 3D Morphic Scene Screenshot
  const sceneElem = await page.$('.clay-scene-wrapper');
  if (sceneElem) {
    const scenePath = path.join(uploadsDir, 'recreated-03-3d-scene.png');
    await sceneElem.screenshot({ path: scenePath });
    console.log('Saved:', scenePath);
  }

  await browser.close();
  console.log('Screenshots captured successfully!');
}

capture().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
