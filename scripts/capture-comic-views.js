const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const workspaceDir = path.join(__dirname, '..');
const uploadsDir = path.join(workspaceDir, 'uploads');
const artifactDir = 'C:\\Users\\MD PCT\\.gemini\\antigravity\\brain\\f43628e8-d059-4f3a-b9bf-6d2a501642d5';

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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
  const homePath = path.join(uploadsDir, 'comic-01-home.png');
  await page.screenshot({ path: homePath, fullPage: false });
  fs.copyFileSync(homePath, path.join(artifactDir, 'comic-01-home.png'));
  console.log('Captured comic-01-home.png');

  // 2. Create View -> Step 1 (Add Content)
  await page.evaluate(() => {
    switchNav('studio');
    setCreateStep(1);
  });
  await new Promise(r => setTimeout(r, 600));
  const addPath = path.join(uploadsDir, 'comic-02-add-content.png');
  await page.screenshot({ path: addPath, fullPage: false });
  fs.copyFileSync(addPath, path.join(artifactDir, 'comic-02-add-content.png'));
  console.log('Captured comic-02-add-content.png');

  // 3. Create View -> Step 2 (Preview) with sample loaded
  await page.evaluate(async () => {
    await loadPreset('sample');
    setCreateStep(2);
  });
  await new Promise(r => setTimeout(r, 1500));
  const prevPath = path.join(uploadsDir, 'comic-03-preview.png');
  await page.screenshot({ path: prevPath, fullPage: false });
  fs.copyFileSync(prevPath, path.join(artifactDir, 'comic-03-preview.png'));
  console.log('Captured comic-03-preview.png');

  // 4. Create View -> Step 3 (Download)
  await page.evaluate(() => {
    const v = document.getElementById('resultVideo');
    v.src = '/output/PainForge-Reel-FULL-46s.mp4';
    v.load();
    document.getElementById('resMetaFilename').textContent = 'RenderFlow_Demo_Reel.mp4';
    document.getElementById('resMetaSizeBadge').textContent = '44.6 MB';
    document.getElementById('resMetaDuration').textContent = '46.0s';
    document.getElementById('resMetaResolution').textContent = 'Portrait · 9:16 (1080×1920)';
    document.getElementById('resMetaTime').textContent = '30.7s';
    document.getElementById('resMetaFps').textContent = 'Full HD · 30 FPS';
    setCreateStep(3);
  });
  await new Promise(r => setTimeout(r, 1000));
  const dlPath = path.join(uploadsDir, 'comic-04-download.png');
  await page.screenshot({ path: dlPath, fullPage: false });
  fs.copyFileSync(dlPath, path.join(artifactDir, 'comic-04-download.png'));
  console.log('Captured comic-04-download.png');

  // 5. History View
  await page.evaluate(async () => {
    switchNav('history');
    await loadHistory();
  });
  await new Promise(r => setTimeout(r, 1000));
  const histPath = path.join(uploadsDir, 'comic-05-history.png');
  await page.screenshot({ path: histPath, fullPage: false });
  fs.copyFileSync(histPath, path.join(artifactDir, 'comic-05-history.png'));
  console.log('Captured comic-05-history.png');

  await browser.close();
  console.log('All 5 comic view screenshots captured and copied to artifacts!');
}

capture().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
