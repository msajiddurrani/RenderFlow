const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const uploadsDir = path.join(__dirname, '../uploads');

async function verifyAll() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // 1. Home View
  console.log('1. Home View...');
  await page.goto('http://localhost:3333/#home', { waitUntil: 'networkidle0' });
  await page.evaluate(() => switchNav('landing'));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(uploadsDir, 'v2-01-home.png') });

  // 2. Add Content Step
  console.log('2. Add Content Step...');
  await page.evaluate(() => {
    switchNav('studio');
    setCreateStep(1);
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(uploadsDir, 'v2-02-add-content.png') });

  // 3. Preview Step (load real sample)
  console.log('3. Preview Step...');
  await page.evaluate(async () => {
    await loadPreset('renderflow');
    setCreateStep(2);
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(uploadsDir, 'v2-03-preview.png') });

  // 4. Download Step
  console.log('4. Download Step...');
  await page.evaluate(() => {
    setCreateStep(3);
    const v = document.getElementById('resultVideo');
    if (v) {
      v.src = '/output/render-1794931948716-source.mp4';
      v.load();
    }
    const fn = document.getElementById('resMetaFilename');
    if (fn) fn.textContent = 'RenderFlow_Master_1080p.mp4';
    const sz = document.getElementById('resMetaSizeBadge');
    if (sz) sz.textContent = '18.4 MB';
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(uploadsDir, 'v2-04-download.png') });

  // 5. History View
  console.log('5. History View...');
  await page.evaluate(async () => {
    switchNav('history');
    await loadHistory();
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(uploadsDir, 'v2-05-history.png') });

  await browser.close();
  console.log('All 5 views captured cleanly in uploads/v2-*.png');
}

verifyAll().catch(err => {
  console.error(err);
  process.exit(1);
});
