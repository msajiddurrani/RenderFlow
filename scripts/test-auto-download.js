const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('--- AUDITING AUTOMATIC MP4 DOWNLOAD ON RENDER COMPLETE ---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERR:', err.message));
    await page.goto('http://localhost:3333', { waitUntil: 'load', timeout: 15000 });

    // Spy on HTMLAnchorElement.prototype.click to detect automated download triggers
    const downloadResult = await page.evaluate(async () => {
      let clickTriggered = false;
      let clickedHref = '';
      let clickedDownload = '';

      const origClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function() {
        clickTriggered = true;
        clickedHref = this.href;
        clickedDownload = this.download;
        origClick.call(this);
      };

      // Mock completion event with a known MP4 fixture/file
      const testFilename = 'render-1795202210614-source.mp4';
      const testUrl = '/output/' + testFilename;

      handleServerEvent('complete', {
        success: true,
        filename: testFilename,
        url: testUrl,
        metrics: { mp4SizeBytes: 24189, totalRenderTimeSec: 2.1, fps: 30 }
      });

      if (window.lastAutoDownloadPromise) {
        await window.lastAutoDownloadPromise;
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }

      const btnDl = document.getElementById('btnDownloadResult');
      const btnOpen = document.getElementById('btnOpenVideo');

      return {
        step3Visible: document.getElementById('stepDownload').style.display === 'block',
        clickTriggered,
        clickedHrefStartsBlob: clickedHref.startsWith('blob:'),
        clickedDownload,
        btnDlHref: btnDl ? btnDl.href : '',
        btnDlDownloadAttr: btnDl ? btnDl.getAttribute('download') : '',
        btnOpenText: btnOpen ? btnOpen.innerText : ''
      };
    });

    console.log('Automated Download Trigger Result:', downloadResult);

    if (!downloadResult.step3Visible) {
      throw new Error('Step 3 (Download) was not displayed upon completion!');
    }
    if (!downloadResult.clickTriggered) {
      throw new Error('Automated download a.click() was not triggered!');
    }
    if (!downloadResult.clickedHrefStartsBlob) {
      throw new Error('Automated download did not download the binary blob URL!');
    }
    if (downloadResult.clickedDownload !== 'render-1795202210614-source.mp4') {
      throw new Error('Automated download filename mismatch!');
    }

    console.log('\n✓✓✓ AUTOMATED MP4 DOWNLOAD AUDIT PASSED 100%! ✓✓✓');
  } finally {
    await browser.close();
  }
})();
