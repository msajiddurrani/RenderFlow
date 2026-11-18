const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const ffmpeg = require('@ffmpeg-installer/ffmpeg');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('=== TESTING REAL HTML VIDEO RENDERING E2E ===');
  const dlDir = path.resolve('tmp-real-test-dl');
  if (fs.existsSync(dlDir)) fs.rmSync(dlDir, { recursive: true, force: true });
  fs.mkdirSync(dlDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: dlDir
  });

  console.log('1. Loading http://localhost:3333...');
  await page.goto('http://localhost:3333', { waitUntil: 'networkidle0' });

  console.log('2. Loading sample and advancing to step 2...');
  await page.evaluate(() => {
    loadSampleAndPreview();
  });
  await new Promise(r => setTimeout(r, 2000));

  // Check which engine is selected
  const engineSelected = await page.evaluate(() => {
    return {
      cfgEngineMode: document.getElementById('cfgEngineMode').value,
      currentAppMode: window.currentAppMode || currentAppMode
    };
  });
  console.log('Engine configuration:', engineSelected);

  console.log('3. Clicking "Create MP4 video" (#btnStudioBake)...');
  await page.click('#btnStudioBake');

  console.log('4. Waiting for render to complete...');
  let completed = false;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 1500));
    const state = await page.evaluate(() => {
      const hud = document.getElementById('progressHud');
      const step3 = document.getElementById('stepDownload');
      const hudText = document.getElementById('hudPhaseText')?.textContent;
      const hudPct = document.getElementById('hudPct')?.textContent;
      return {
        step3Visible: step3 && step3.style.display !== 'none',
        hudText,
        hudPct
      };
    });
    console.log(`[Tick ${i + 1}] HUD: ${state.hudPct} - ${state.hudText} (Step 3: ${state.step3Visible})`);
    if (state.step3Visible) {
      completed = true;
      break;
    }
  }

  if (!completed) {
    throw new Error('Render timed out!');
  }

  console.log('5. Clicking Download MP4 button (#btnDownloadResult)...');
  await page.click('#btnDownloadResult');
  await new Promise(r => setTimeout(r, 3000));

  const downloadedFiles = fs.readdirSync(dlDir);
  console.log('Downloaded files:', downloadedFiles);
  if (downloadedFiles.length === 0) {
    throw new Error('No downloaded file found!');
  }

  const downloadedVideoPath = path.join(dlDir, downloadedFiles[0]);
  console.log('Downloaded file size:', fs.statSync(downloadedVideoPath).size, 'bytes');

  // 6. Extract frame from downloaded video to prove it is the REAL video
  const framePng = path.join(dlDir, 'verified-frame.png');
  execSync(`"${ffmpeg.path}" -y -ss 00:00:01.0 -i "${downloadedVideoPath}" -vframes 1 "${framePng}"`);
  console.log('Frame extracted to:', framePng);

  await browser.close();
  console.log('=== REAL HTML E2E TEST PASSED 100%! ===');
})();
