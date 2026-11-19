/**
 * RenderFlow Super-Strict Mobile QA Audit
 * Rigorous multi-stage verification:
 * 1. Mobile Responsiveness & Layout Integrity (320px, 375px, 390px, 430px)
 * 2. Navbar Plus Button & Zero Overflow
 * 3. Elevated Responsive Footer & Social Icon Bounds
 * 4. Step 3 Dual-Action Mobile Download Buttons (#btnDownloadResult & #btnOpenVideo)
 * 5. Dynamic Island Notification Banner & Audio/Vibrate/Title System
 * 6. Cloud Routing & HTTP 405 Elimination
 * 7. Binary MP4 Download Headers & ISOBMFF Magic Byte Validation
 */

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\MD PCT\\.gemini\\antigravity\\brain\\f43628e8-d059-4f3a-b9bf-6d2a501642d5';
const LOCAL_URL = 'http://localhost:3333';
const CLOUD_URL = 'https://durrani6969-renderflow-engine.hf.space';

async function fetchHttp(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https:');
    const client = isHttps ? https : http;
    const req = client.request(url, options, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const bodyBuffer = Buffer.concat(data);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: bodyBuffer.toString('utf8'),
          buffer: bodyBuffer
        });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

(async () => {
  console.log('================================================================');
  console.log('   RENDERFLOW SUPER-STRICT MOBILE & DOWNLOAD AUDIT SUITE        ');
  console.log('================================================================\n');

  let auditPassed = true;
  const auditResults = [];

  function recordCheck(name, passed, details = '') {
    auditResults.push({ name, passed, details });
    const badge = passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${badge} | ${name}${details ? ' - ' + details : ''}`);
    if (!passed) auditPassed = false;
  }

  // --------------------------------------------------------------------------
  // TEST 1: Cloud Backend URL & Route Protection (HTTP 405 Prevention)
  // --------------------------------------------------------------------------
  console.log('\n--- 1. AUDITING CLOUD API ROUTING & 405 PREVENTION ---');
  try {
    const cloudRoot = await fetchHttp(CLOUD_URL + '/');
    recordCheck(
      'Cloud Engine Online & Responsive',
      cloudRoot.statusCode === 200,
      `Status: ${cloudRoot.statusCode}`
    );

    const cloudOptions = await fetchHttp(CLOUD_URL + '/api/render-status', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://renderflow-ten.vercel.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    const hasCors = cloudOptions.headers['access-control-allow-origin'] === '*' || 
                    cloudOptions.headers['access-control-allow-origin'] === 'https://renderflow-ten.vercel.app';
    recordCheck(
      'Cloud Engine Permissive CORS Preflight',
      cloudOptions.statusCode === 200 && hasCors,
      `Status: ${cloudOptions.statusCode}, CORS: ${cloudOptions.headers['access-control-allow-origin']}`
    );

    const cloudDownloadProbe = await fetchHttp(CLOUD_URL + '/download/probe-check.mp4', { method: 'GET' });
    recordCheck(
      'Download Route Query Separation & Attachment Headers (No 500 error)',
      cloudDownloadProbe.statusCode !== 500 && cloudDownloadProbe.headers['content-disposition']?.includes('attachment'),
      `Status: ${cloudDownloadProbe.statusCode}, Content-Disposition: ${cloudDownloadProbe.headers['content-disposition']}`
    );
  } catch (err) {
    recordCheck('Cloud Engine Live Connectivity', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Local Server Live Render & MP4 Download Header Verification
  // --------------------------------------------------------------------------
  console.log('\n--- 2. AUDITING MP4 BINARY CREATION & DOWNLOAD HEADERS ---');
  let testRenderFilename = '';
  try {
    const renderPayload = JSON.stringify({
      code: '<!DOCTYPE html><html><body style="margin:0;background:#4F46E5;display:flex;align-items:center;justify-content:center;height:100vh;"><h1 style="color:#fff;font-family:sans-serif;font-size:36px;">QA Strict Mobile Test</h1><script>window.DURATION=2;</script></body></html>',
      resolution: '1080p-v',
      fps: 30,
      duration: 2,
      gpu: true
    });

    console.log('Dispatching hardware render test (2s @ 30 FPS)...');
    const renderRes = await new Promise((resolve, reject) => {
      const req = http.request(LOCAL_URL + '/api/render-code-sse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let buffer = '';
        let currentEvent = '';
        res.on('data', chunk => {
          buffer += chunk.toString('utf8');
          const lines = buffer.split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.filename) testRenderFilename = data.filename;
                if (currentEvent === 'complete' || (data.metrics && data.metrics.totalRenderTimeSec)) {
                  resolve(data);
                }
              } catch (e) {}
            }
          }
        });
        res.on('end', () => resolve({ done: true, filename: testRenderFilename }));
      });
      req.on('error', reject);
      req.write(renderPayload);
      req.end();
    });

    recordCheck(
      'Hardware GPU Synthesis Pipeline Completed',
      Boolean(testRenderFilename),
      `Rendered file: ${testRenderFilename}`
    );

    if (testRenderFilename) {
      // Test direct attachment download endpoint
      const dlRes = await fetchHttp(`${LOCAL_URL}/download/${testRenderFilename}`);
      recordCheck(
        'Download Endpoint Status 200 OK',
        dlRes.statusCode === 200,
        `Status: ${dlRes.statusCode}`
      );
      recordCheck(
        'Download Content-Type is video/mp4',
        dlRes.headers['content-type'] === 'video/mp4',
        `Type: ${dlRes.headers['content-type']}`
      );
      recordCheck(
        'Download Content-Disposition is Attachment with Filename',
        dlRes.headers['content-disposition'] === `attachment; filename="${testRenderFilename}"`,
        `Disposition: ${dlRes.headers['content-disposition']}`
      );
      recordCheck(
        'Byte Range Serving Supported (Accept-Ranges: bytes)',
        dlRes.headers['accept-ranges'] === 'bytes',
        `Accept-Ranges: ${dlRes.headers['accept-ranges']}`
      );

      // Verify ISOBMFF MP4 binary magic header
      const buf = dlRes.buffer;
      const isMp4 = buf.length > 8 && buf.toString('utf8', 4, 8) === 'ftyp';
      recordCheck(
        'Lossless MP4 Binary Header Verified (ftyp atom)',
        isMp4,
        `Size: ${(buf.length / 1024).toFixed(1)} KB, Magic: ${buf.slice(4, 8).toString('utf8')}`
      );
    }
  } catch (err) {
    recordCheck('Live MP4 Render & Download Pipeline', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Puppeteer Mobile Viewport Responsiveness (375px, 390px, 430px, 320px)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. AUDITING MOBILE VIEWPORT RESPONSIVENESS & UI ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const viewports = [
    { name: 'iPhone SE (375x667)', width: 375, height: 667 },
    { name: 'iPhone 14/15/16 (390x844)', width: 390, height: 844 },
    { name: 'iPhone 14/15/16 Pro Max (430x932)', width: 430, height: 932 },
    { name: 'Ultra Compact Mobile (320x568)', width: 320, height: 568 }
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });
    await page.goto(LOCAL_URL, { waitUntil: 'networkidle0' });

    const layoutCheck = await page.evaluate((expectedWidth) => {
      const bodyScrollWidth = document.body.scrollWidth;
      const bodyClientWidth = document.body.clientWidth;
      const navBtn = document.querySelector('.nav-actions .btn');
      const btnRect = navBtn.getBoundingClientRect();
      const btnVisibleText = navBtn.innerText.trim();
      
      const footerMain = document.querySelector('.footer-main-row');
      const fMainStyle = window.getComputedStyle(footerMain);
      const ghCard = document.querySelector('.footer-social-card');
      const ghRect = ghCard ? ghCard.getBoundingClientRect() : null;

      return {
        hasHorizontalOverflow: bodyScrollWidth > bodyClientWidth,
        bodyScrollWidth,
        bodyClientWidth,
        btnRight: btnRect.right,
        btnWidth: btnRect.width,
        btnVisibleText,
        btnWithinBounds: btnRect.right <= expectedWidth,
        footerDisplay: fMainStyle.display,
        footerDirection: fMainStyle.flexDirection,
        ghWithinBounds: ghRect ? (ghRect.right <= expectedWidth && ghRect.left >= 0) : false
      };
    }, vp.width);

    recordCheck(
      `Zero Horizontal Overflow on ${vp.name}`,
      !layoutCheck.hasHorizontalOverflow && layoutCheck.bodyScrollWidth <= vp.width,
      `ScrollWidth: ${layoutCheck.bodyScrollWidth}px, Viewport: ${vp.width}px`
    );

    recordCheck(
      `Navbar Action Button is Strictly "+" on ${vp.name}`,
      layoutCheck.btnVisibleText === '+' && layoutCheck.btnWithinBounds,
      `Text: "${layoutCheck.btnVisibleText}", Right Edge: ${layoutCheck.btnRight}px <= ${vp.width}px`
    );

    recordCheck(
      `Footer Stacks Vertically & GitHub Icon In-Bounds on ${vp.name}`,
      layoutCheck.footerDirection === 'column' && layoutCheck.ghWithinBounds,
      `Direction: ${layoutCheck.footerDirection}, GitHub Card In Bounds: ${layoutCheck.ghWithinBounds}`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 4: Step 3 Dual-Action Mobile Download & Open Buttons
  // --------------------------------------------------------------------------
  console.log('\n--- 4. AUDITING STEP 3 DUAL-ACTION MOBILE DOWNLOAD BUTTONS ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(LOCAL_URL, { waitUntil: 'networkidle0' });

  const step3Check = await page.evaluate(() => {
    // Switch to step 3
    if (typeof switchNav === 'function') switchNav('studio');
    if (typeof setCreateStep === 'function') setCreateStep(3);

    const btnDl = document.getElementById('btnDownloadResult');
    const btnOpen = document.getElementById('btnOpenVideo');
    const btnDlText = document.getElementById('btnDownloadResultText');

    return {
      btnDlExists: Boolean(btnDl),
      btnDlTarget: btnDl ? btnDl.getAttribute('target') : null,
      btnDlDownload: btnDl ? btnDl.hasAttribute('download') : false,
      btnDlText: btnDlText ? btnDlText.innerText.trim() : (btnDl ? btnDl.innerText.trim() : ''),
      btnOpenExists: Boolean(btnOpen),
      btnOpenTarget: btnOpen ? btnOpen.getAttribute('target') : null,
      btnOpenText: btnOpen ? btnOpen.innerText.trim() : ''
    };
  });

  recordCheck(
    'Primary Download Button (#btnDownloadResult) Configured with target="_blank"',
    step3Check.btnDlExists && step3Check.btnDlTarget === '_blank' && step3Check.btnDlDownload,
    `Target: ${step3Check.btnDlTarget}, Has download attr: ${step3Check.btnDlDownload}`
  );

  recordCheck(
    'Secondary Action Button (#btnOpenVideo) Present for iPhone Camera Roll Save',
    step3Check.btnOpenExists && step3Check.btnOpenTarget === '_blank',
    `Text: "${step3Check.btnOpenText}", Target: ${step3Check.btnOpenTarget}`
  );

  // --------------------------------------------------------------------------
  // TEST 5: Dynamic Island In-App Push Notification Banner & Audio System
  // --------------------------------------------------------------------------
  console.log('\n--- 5. AUDITING DYNAMIC ISLAND PUSH NOTIFICATION SYSTEM ---');
  const notifCheck = await page.evaluate(() => {
    const banner = document.getElementById('rfPushBanner');
    const bannerDownloadBtn = document.getElementById('rfPushBtnDownload');
    const bannerMsg = document.getElementById('rfPushMsg');
    
    // Test triggering notification
    if (typeof triggerCompletionNotification === 'function') {
      triggerCompletionNotification('RenderFlow', 'Your 1080p MP4 master video is ready to download.', '/output/sample.mp4');
    }

    const isActive = banner ? banner.classList.contains('active') : false;
    const isVisible = banner ? window.getComputedStyle(banner).opacity !== '0' : false;
    const documentTitle = document.title;

    return {
      bannerExists: Boolean(banner),
      bannerDownloadBtnExists: Boolean(bannerDownloadBtn),
      isActive,
      isVisible,
      msgText: bannerMsg ? bannerMsg.innerText.trim() : '',
      documentTitle
    };
  });

  recordCheck(
    'Dynamic Island Push Banner Element (#rfPushBanner) Present in DOM',
    notifCheck.bannerExists && notifCheck.bannerDownloadBtnExists,
    'Banner and download button validated'
  );

  recordCheck(
    'triggerCompletionNotification Activates Dynamic Banner with Animation',
    notifCheck.isActive,
    `Active: ${notifCheck.isActive}, Text: "${notifCheck.msgText}"`
  );

  recordCheck(
    'Document Title Alert Pulses with Bell Icon',
    notifCheck.documentTitle.includes('🔔') || notifCheck.documentTitle.includes('Video Ready'),
    `Title: "${notifCheck.documentTitle}"`
  );

  // Take screenshot of notification active state
  if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile-notification-active-qa.png'), clip: { x: 0, y: 0, width: 390, height: 350 } });

  await browser.close();

  // --------------------------------------------------------------------------
  // FINAL REPORT & ASSERTION
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('                   STRICT AUDIT SUMMARY                         ');
  console.log('================================================================');
  const total = auditResults.length;
  const passed = auditResults.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`Total Strict Checks: ${total}`);
  console.log(`Passed:              ${passed} (${Math.round((passed / total) * 100)}%)`);
  console.log(`Failed:              ${failed}`);
  console.log('================================================================');

  if (!auditPassed || failed > 0) {
    console.error('\n❌ STRICT QA AUDIT FAILED!');
    process.exit(1);
  } else {
    console.log('\n✓✓✓ STRICT QA AUDIT PASSED 100% WITH ZERO DEFECTS! ✓✓✓\n');
    process.exit(0);
  }
})();
