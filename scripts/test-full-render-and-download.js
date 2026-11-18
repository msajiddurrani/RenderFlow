const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

(async () => {
  const downloadDir = path.join(__dirname, '..', 'tmp-downloads-e2e');
  if (fs.existsSync(downloadDir)) fs.rmSync(downloadDir, { recursive: true, force: true });
  fs.mkdirSync(downloadDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const client = await page.target().createCDPSession();
  await client.send('Browser.setDownloadBehavior', {
    behavior: 'allowAndName',
    downloadPath: downloadDir,
    eventsEnabled: true
  });
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir
  });

  page.on('console', msg => console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text()));
  page.on('pageerror', err => console.error('[PAGE ERROR]', err.message));
  page.on('requestfailed', req => console.error('[REQ FAILED]', req.url(), req.failure()?.errorText));

  console.log('1. Loading http://localhost:3333...');
  await page.goto('http://localhost:3333', { waitUntil: 'networkidle2' });

  console.log('2. Loading sample and advancing to step 2...');
  await page.evaluate(() => {
    switchNav('studio');
    loadPreset('renderflow');
    setCreateStep(2);
  });

  await new Promise(r => setTimeout(r, 1000));

  console.log('3. Clicking "Create MP4 video" (#btnStudioBake)...');
  await page.click('#btnStudioBake');

  console.log('4. Waiting for render to complete...');
  let completed = false;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const status = await page.evaluate(() => {
      const hudPhase = document.getElementById('hudPhaseText')?.textContent;
      const hudPct = document.getElementById('hudPct')?.textContent;
      const step3Visible = document.getElementById('stepDownload')?.style.display !== 'none';
      const btnHref = document.getElementById('btnDownloadResult')?.href;
      return { hudPhase, hudPct, step3Visible, btnHref };
    });
    console.log(`[Tick ${i+1}]`, status);
    if (status.step3Visible || status.hudPhase?.includes('Complete')) {
      completed = true;
      break;
    }
  }

  if (!completed) {
    console.error('Render did not complete in 40 seconds!');
    await browser.close();
    process.exit(1);
  }

  console.log('5. Waiting 2 seconds for UI animation...');
  await new Promise(r => setTimeout(r, 2000));

  console.log('6. Render completed! Checking stepDownload visibility and button properties...');
  const btnInfo = await page.evaluate(() => {
    const btn = document.getElementById('btnDownloadResult');
    const step3 = document.getElementById('stepDownload');
    return {
      step3Display: step3?.style.display,
      btnHref: btn?.href,
      btnDownload: btn?.getAttribute('download'),
      currentResultUrl: window.currentResultUrl,
      currentResultFilename: window.currentResultFilename,
      hasBlob: !!window.currentResultBlob
    };
  });
  console.log('Button & State Info:', btnInfo);

  console.log('7. Clicking Download MP4 button (#btnDownloadResult)...');
  await page.click('#btnDownloadResult');

  console.log('8. Waiting 10 seconds for file download to appear in filesystem...');
  await new Promise(r => setTimeout(r, 10000));

  const files = fs.readdirSync(downloadDir);
  console.log('9. Downloaded files in dir:', files);
  for (const f of files) {
    const stats = fs.statSync(path.join(downloadDir, f));
    console.log(`- File: ${f}, Size: ${stats.size} bytes`);
  }

  await browser.close();
})();
