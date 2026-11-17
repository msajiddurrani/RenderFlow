const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = path.join(__dirname, '..');

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  // 1. Home View
  console.log('Navigating to http://localhost:3333/#home ...');
  await page.goto('http://localhost:3333/#home', { waitUntil: 'networkidle0' });
  await page.evaluate(() => switchNav('landing'));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactDir, 'uploads', 'view-01-home.png'), fullPage: false });
  console.log('Captured view-01-home.png');

  // 2. Create View -> Step 1 (Add Content)
  await page.evaluate(() => {
    switchNav('studio');
    setCreateStep(1);
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactDir, 'uploads', 'view-02-add-content.png'), fullPage: false });
  console.log('Captured view-02-add-content.png');

  // 3. Create View -> Step 2 (Preview) with PainForge sample loaded
  await page.evaluate(async () => {
    await loadPreset('painforge');
    setCreateStep(2);
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(artifactDir, 'uploads', 'view-03-preview.png'), fullPage: false });
  console.log('Captured view-03-preview.png');

  // 4. Create View -> Step 3 (Download)
  await page.evaluate(() => {
    const v = document.getElementById('resultVideo');
    v.src = '/output/PainForge-Reel-FULL-46s.mp4';
    v.load();
    document.getElementById('resMetaFilename').textContent = 'PainForge — Reel.mp4';
    document.getElementById('resMetaSizeBadge').textContent = '44.6 MB';
    document.getElementById('resMetaDuration').textContent = '46.0s';
    document.getElementById('resMetaResolution').textContent = 'Portrait · 9:16 (1080×1920)';
    document.getElementById('resMetaTime').textContent = '30.7s';
    document.getElementById('resMetaFps').textContent = 'Full HD · 30 FPS';
    setCreateStep(3);
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(artifactDir, 'uploads', 'view-04-download.png'), fullPage: false });
  console.log('Captured view-04-download.png');

  // 5. History View
  await page.evaluate(async () => {
    switchNav('history');
    await loadHistory();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(artifactDir, 'uploads', 'view-05-history.png'), fullPage: false });
  console.log('Captured view-05-history.png');

  await browser.close();
  console.log('All 5 view screenshots successfully captured!');
}

capture().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
