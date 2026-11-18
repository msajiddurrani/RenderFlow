const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const ffmpeg = require('@ffmpeg-installer/ffmpeg');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('======================================================');
  console.log('  INTELLIGENT STEP-BY-STEP QA AUDIT AGENT');
  console.log('======================================================');

  const testDownloadDir = path.resolve('tmp-qa-audit-downloads');
  if (fs.existsSync(testDownloadDir)) fs.rmSync(testDownloadDir, { recursive: true, force: true });
  fs.mkdirSync(testDownloadDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const cdp = await page.target().createCDPSession();
  await cdp.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: testDownloadDir
  });

  try {
    const browserCdp = await browser.target().createCDPSession();
    await browserCdp.send('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: testDownloadDir,
      eventsEnabled: true
    });
  } catch (e) {}

  // Collect console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Error') || text.includes('RenderFlow') || text.includes('Hardware')) {
      console.log('  [Browser Console]:', text);
    }
  });

  console.log('\n--> [QA STEP 0]: Load http://localhost:3333 & Inspect Hero Section');
  await page.goto('http://localhost:3333', { waitUntil: 'networkidle0', timeout: 30000 });

  const heroButtons = await page.evaluate(() => {
    const heroDiv = document.querySelector('.hero-actions');
    if (!heroDiv) return { error: 'No .hero-actions element found' };
    const buttons = Array.from(heroDiv.querySelectorAll('button')).map(b => ({
      id: b.id,
      text: b.textContent.trim().replace(/\s+/g, ' '),
      hasSvg: !!b.querySelector('svg')
    }));
    return { count: buttons.length, buttons };
  });

  console.log('  Hero action buttons count:', heroButtons.count);
  console.log('  Hero action buttons details:', JSON.stringify(heroButtons.buttons, null, 2));

  if (heroButtons.count !== 2) {
    throw new Error(`QA FAIL: Expected exactly 2 hero buttons, found ${heroButtons.count}`);
  }
  if (!heroButtons.buttons.some(b => b.id === 'btnHeroBake' && b.text.includes('Create a video'))) {
    throw new Error('QA FAIL: Missing primary "Create a video" button (#btnHeroBake)');
  }
  if (!heroButtons.buttons.some(b => b.id === 'btnViewLive' && b.text.includes('Try an example'))) {
    throw new Error('QA FAIL: Missing secondary "Try an example" button (#btnViewLive)');
  }
  console.log('  ✓ [QA STEP 0 PASSED]: Hero section has exactly the clean 2-button layout.');

  console.log('\n--> [QA STEP 1]: Click "Create a video" (#btnHeroBake) & Verify Step 1');
  await page.click('#btnHeroBake');
  await new Promise(r => setTimeout(r, 600));

  const step1State = await page.evaluate(() => {
    const stepAddContent = document.getElementById('stepAddContent');
    const studioTab = document.getElementById('viewStudioTab');
    const progStep1 = document.getElementById('progStep1');
    return {
      studioActive: studioTab && studioTab.classList.contains('active'),
      step1Visible: stepAddContent && stepAddContent.style.display !== 'none',
      prog1Active: progStep1 && progStep1.classList.contains('active')
    };
  });
  console.log('  Step 1 state:', step1State);
  if (!step1State.studioActive || !step1State.step1Visible) {
    throw new Error('QA FAIL: Clicking #btnHeroBake did not navigate to Step 1 (Add Content)');
  }
  console.log('  ✓ [QA STEP 1 PASSED]: Successfully navigated to Step 1 (Add Content).');

  console.log('\n--> [QA STEP 2]: Upload Real HTML File (painforge-reel.html) & Inspect Properties');
  const painforgePath = path.resolve('public/presets/painforge-reel.html');
  const fileInput = await page.$('#fileInputStudio');
  await fileInput.uploadFile(painforgePath);
  await new Promise(r => setTimeout(r, 1500));

  const step2State = await page.evaluate(() => {
    const stepPreview = document.getElementById('stepPreview');
    const cfgDuration = document.getElementById('cfgDuration')?.value;
    const cfgResolution = document.getElementById('cfgResolution')?.value;
    const durBadge = document.getElementById('durAutoBadge')?.textContent;
    const editorVal = document.getElementById('codeEditorStudio')?.value || '';
    const codeLen = editorVal.length;
    return {
      stepPreviewVisible: stepPreview && stepPreview.style.display !== 'none',
      cfgDuration,
      cfgResolution,
      durBadge,
      codeLen
    };
  });

  console.log('  Step 2 properties:', step2State);
  if (!step2State.stepPreviewVisible) {
    throw new Error('QA FAIL: Step 2 (Preview) is not visible after file upload');
  }
  if (parseFloat(step2State.cfgDuration) !== 46) {
    throw new Error(`QA FAIL: Expected duration to auto-detect as 46, got "${step2State.cfgDuration}"`);
  }
  if (step2State.cfgResolution !== '1080p-v') {
    throw new Error(`QA FAIL: Expected vertical resolution "1080p-v", got "${step2State.cfgResolution}"`);
  }
  console.log('  ✓ [QA STEP 2 PASSED]: File uploaded, detected 46s duration & 1080p-v vertical reel resolution.');

  const isFullRender = process.argv.includes('--full');
  if (!isFullRender) {
    console.log('  [Fast QA Regression Mode]: Setting duration override to 3s for rapid end-to-end audit (use --full for full 46s).');
    await page.evaluate(() => {
      document.getElementById('cfgDuration').value = '3';
    });
  }

  console.log('\n--> [QA STEP 3]: Click "Create MP4 video" (#btnStudioBake) & Monitor Render');
  await page.click('#btnStudioBake');

  let renderDone = false;
  let lastReportedPct = -1;
  const startTime = Date.now();

  for (let tick = 0; tick < 300; tick++) { // up to 450 seconds (1380 frames at ~4-5 fps)
    await new Promise(r => setTimeout(r, 1500));
    const renderStatus = await page.evaluate(() => {
      const hud = document.getElementById('progressHud');
      const hudText = document.getElementById('hudPhaseText')?.textContent;
      const hudPct = document.getElementById('hudPct')?.textContent;
      const hudFrame = document.getElementById('hudFrameVal')?.textContent;
      const step3 = document.getElementById('stepDownload');
      const step3Vis = step3 && step3.style.display !== 'none';
      return {
        hudVisible: hud && hud.style.display !== 'none',
        hudText,
        hudPct,
        hudFrame,
        step3Vis
      };
    });

    const numPct = parseInt(renderStatus.hudPct || '0', 10);
    if (numPct !== lastReportedPct && numPct % 10 === 0) {
      console.log(`  [Render Progress]: ${renderStatus.hudPct} | Frame: ${renderStatus.hudFrame} | Phase: ${renderStatus.hudText}`);
      lastReportedPct = numPct;
    }

    if (renderStatus.step3Vis) {
      renderDone = true;
      console.log(`  [Render Complete in ${((Date.now() - startTime) / 1000).toFixed(1)}s!]`);
      break;
    }
  }

  if (!renderDone) {
    throw new Error('QA FAIL: Render did not complete within timeout!');
  }
  console.log('  ✓ [QA STEP 3 PASSED]: Video rendering completed successfully to 100%.');

  console.log('\n--> [QA STEP 4]: Inspect Step 3 (Download Screen) Metadata');
  const meta = await page.evaluate(() => {
    return {
      filename: document.getElementById('resMetaFilename')?.textContent,
      duration: document.getElementById('resMetaDuration')?.textContent,
      size: document.getElementById('resMetaSizeBadge')?.textContent,
      resolution: document.getElementById('resMetaResolution')?.textContent,
      fps: document.getElementById('resMetaFps')?.textContent,
      videoSrc: document.getElementById('resultVideo')?.src,
      downloadHref: document.getElementById('btnDownloadResult')?.href
    };
  });

  console.log('  Step 3 metadata:', meta);
  if (!meta.filename || !meta.filename.endsWith('.mp4')) {
    throw new Error(`QA FAIL: Invalid metadata filename: ${meta.filename}`);
  }
  if (!meta.duration.includes('46') && !meta.duration.includes('3')) {
    throw new Error(`QA FAIL: Expected duration to contain 46s or 3s, got ${meta.duration}`);
  }
  console.log('  ✓ [QA STEP 4 PASSED]: Step 3 download screen displays accurate metadata.');

  console.log('\n--> [QA STEP 5]: Trigger MP4 Download (#btnDownloadResult) & Verify Disk Binary');
  await page.click('#btnDownloadResult');

  let downloadedVideo = null;
  for (let w = 0; w < 40; w++) { // wait up to 20s for download to finish
    await new Promise(r => setTimeout(r, 500));
    const files = fs.readdirSync(testDownloadDir);
    const mp4s = files.filter(f => f.endsWith('.mp4') && !f.endsWith('.crdownload'));
    if (mp4s.length > 0) {
      downloadedVideo = path.join(testDownloadDir, mp4s[0]);
      break;
    }
  }

  const downloadedFiles = fs.readdirSync(testDownloadDir);
  console.log('  Files in download folder:', downloadedFiles);
  if (!downloadedVideo) {
    throw new Error('QA FAIL: No MP4 file found in download directory after clicking download!');
  }

  const videoStats = fs.statSync(downloadedVideo);
  console.log(`  Downloaded MP4: ${path.basename(downloadedVideo)} (${videoStats.size} bytes)`);

  const minBytes = isFullRender ? 10000000 : 500000;
  if (videoStats.size < minBytes) {
    throw new Error(`QA FAIL: Downloaded MP4 is suspiciously small (${videoStats.size} bytes)`);
  }

  // Check MP4 ISOBMFF header
  const headerBuf = Buffer.alloc(12);
  const fd = fs.openSync(downloadedVideo, 'r');
  fs.readSync(fd, headerBuf, 0, 12, 0);
  fs.closeSync(fd);
  const ftypStr = headerBuf.slice(4, 8).toString('utf8');
  console.log(`  MP4 Magic Header Box: "${ftypStr}"`);
  if (ftypStr !== 'ftyp') {
    throw new Error(`QA FAIL: Downloaded file is not a valid MP4 container (magic was "${ftypStr}")`);
  }
  console.log('  ✓ [QA STEP 5 PASSED]: MP4 file downloaded with valid ISOBMFF container and healthy byte size.');

  console.log('\n--> [QA STEP 6]: Deep Frame Extraction & Quality Inspection via FFmpeg');
  if (isFullRender || meta.duration.includes('46')) {
    const frame2s = path.join(testDownloadDir, 'qa-frame-2s.png');
    const frame20s = path.join(testDownloadDir, 'qa-frame-20s.png');
    const frame40s = path.join(testDownloadDir, 'qa-frame-40s.png');

    execSync(`"${ffmpeg.path}" -y -ss 00:00:02.0 -i "${downloadedVideo}" -vframes 1 "${frame2s}"`, { stdio: 'pipe' });
    execSync(`"${ffmpeg.path}" -y -ss 00:00:20.0 -i "${downloadedVideo}" -vframes 1 "${frame20s}"`, { stdio: 'pipe' });
    execSync(`"${ffmpeg.path}" -y -ss 00:00:40.0 -i "${downloadedVideo}" -vframes 1 "${frame40s}"`, { stdio: 'pipe' });

    const sz2s = fs.statSync(frame2s).size;
    const sz20s = fs.statSync(frame20s).size;
    const sz40s = fs.statSync(frame40s).size;
    console.log(`  Extracted frame at t=2s: ${sz2s} bytes`);
    console.log(`  Extracted frame at t=20s: ${sz20s} bytes`);
    console.log(`  Extracted frame at t=40s: ${sz40s} bytes`);

    if (sz2s === 0 || sz20s === 0 || sz40s === 0) {
      throw new Error('QA FAIL: One or more extracted frames are empty!');
    }
  } else {
    const frame1s = path.join(testDownloadDir, 'qa-frame-1s.png');
    execSync(`"${ffmpeg.path}" -y -ss 00:00:01.0 -i "${downloadedVideo}" -vframes 1 "${frame1s}"`, { stdio: 'pipe' });
    const sz1s = fs.statSync(frame1s).size;
    console.log(`  Extracted frame at t=1s: ${sz1s} bytes`);
    if (sz1s === 0) {
      throw new Error('QA FAIL: Extracted frame is empty!');
    }
  }
  console.log('  ✓ [QA STEP 6 PASSED]: High-fidelity frames extracted from real video.');

  console.log('\n--> [QA STEP 7]: Check History Grid Integration');
  await page.evaluate(() => switchNav('history'));
  await new Promise(r => setTimeout(r, 1200));

  const historyState = await page.evaluate(() => {
    const historyCards = document.querySelectorAll('.history-card');
    return {
      cardCount: historyCards.length,
      firstCardTitle: historyCards[0]?.querySelector('.h-title')?.textContent
    };
  });
  console.log('  History cards state:', historyState);
  if (historyState.cardCount === 0) {
    throw new Error('QA FAIL: Rendered video not present in History grid!');
  }
  console.log('  ✓ [QA STEP 7 PASSED]: Rendered video successfully recorded in Vault History.');

  await browser.close();

  console.log('\n======================================================');
  console.log('  🎉 ALL 8 QA AUDIT STEPS PASSED WITH 100% SUCCESS!');
  console.log('======================================================');
  process.exit(0);
})().catch(err => {
  console.error('\n❌ QA AUDIT FAILED:', err);
  process.exit(1);
});
