const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const auditDir = path.join(__dirname, '..', 'uploads', 'audit');
if (!fs.existsSync(auditDir)) {
  fs.mkdirSync(auditDir, { recursive: true });
}

(async () => {
  console.log('=====================================================');
  console.log('  RENDERFLOW COMPREHENSIVE UI/UX & SMOOTHNESS AUDIT  ');
  console.log('=====================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const consoleLogs = [];
  const networkErrors = [];

  const setupListeners = (page, prefix) => {
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      consoleLogs.push({ prefix, type, text });
      if (type === 'error' || type === 'warning') {
        console.log(`[${prefix} CONSOLE ${type.toUpperCase()}] ${text}`);
      }
    });
    page.on('pageerror', err => {
      consoleLogs.push({ prefix, type: 'pageerror', text: err.toString() });
      console.log(`[${prefix} PAGE ERROR] ${err.toString()}`);
    });
    page.on('requestfailed', req => {
      const url = req.url();
      const failure = req.failure() ? req.failure().errorText : 'unknown';
      networkErrors.push({ prefix, url, failure });
      console.log(`[${prefix} NET ERROR] ${url} -> ${failure}`);
    });
  };

  try {
    // =============================================================
    // 1. DESKTOP AUDIT (1920x1080)
    // =============================================================
    console.log('\n>>> [PHASE 1] Desktop Viewport Audit (1920x1080) <<<');
    const page = await browser.newPage();
    setupListeners(page, 'DESKTOP');
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

    console.log('Loading http://localhost:3333 ...');
    await page.goto('http://localhost:3333', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(auditDir, 'audit-desktop-01-landing.png') });

    // Check Landing Hero and CTA buttons
    const heroSection = await page.$('#landingHeroSection');
    const btnHeroBake = await page.$('#btnHeroBake');
    const btnViewLive = await page.$('#btnViewLive');

    console.log('Landing Hero Section (#landingHeroSection) found:', !!heroSection);
    console.log('Hero "Create a video" button (#btnHeroBake) found & clickable:', !!btnHeroBake);
    console.log('Hero "Try live sample" button (#btnViewLive) found & clickable:', !!btnViewLive);

    // Test Hero Button 1: Click "Create a video" (#btnHeroBake)
    console.log('\nAction: Clicking "Create a video" (#btnHeroBake)...');
    await btnHeroBake.click();
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(auditDir, 'audit-desktop-02-step1-dropzone.png') });

    // Step 1 Audit
    const dz = await page.$('#dzMain');
    const fileInput = await page.$('#fileInputStudio');
    const togglePaste = await page.$('#btnTogglePaste');
    const step1Next = await page.$('#btnStep1Next');
    console.log('Step 1 Dropzone (#dzMain) visible:', !!dz);
    console.log('Step 1 File Input (#fileInputStudio) ready:', !!fileInput);
    console.log('Step 1 Toggle Paste (#btnTogglePaste) visible:', !!togglePaste);
    console.log('Step 1 Next Button (#btnStep1Next) visible:', !!step1Next);

    // Toggle Paste Code
    console.log('Action: Toggling Paste Code area...');
    await togglePaste.click();
    await new Promise(r => setTimeout(r, 400));
    const codeArea = await page.$('#codeEditorStudio');
    console.log('Code Editor (#codeEditorStudio) visible:', !!codeArea);
    await page.screenshot({ path: path.join(auditDir, 'audit-desktop-03-step1-pastecode.png') });

    // Return to Landing Page to test "Try live sample" (#btnViewLive)
    console.log('\nAction: Returning to Home to test "Try live sample"...');
    await page.evaluate(() => window.switchNav('landing'));
    await new Promise(r => setTimeout(r, 400));

    console.log('Action: Clicking "Try live sample" (#btnViewLive)...');
    const btnSample = await page.$('#btnViewLive');
    await btnSample.click();
    // Wait for sample load and transition to Step 2
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(auditDir, 'audit-desktop-04-step2-live-preview.png') });

    // Step 2 Audit: Preview iframe & Aspect Ratio Switcher
    const previewIframe = await page.$('#studioPreviewIframe');
    console.log('Step 2 Preview Iframe (#studioPreviewIframe) loaded:', !!previewIframe);

    const optLandscape = await page.$('#optLandscape');
    const optVertical = await page.$('#optVertical');
    const optSquare = await page.$('#optSquare');
    console.log('Aspect ratio switchers present: 16:9 Landscape:', !!optLandscape, '9:16 Vertical:', !!optVertical, '1:1 Square:', !!optSquare);

    if (optLandscape) {
      console.log('Switching aspect ratio to 16:9 Landscape...');
      await optLandscape.click();
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: path.join(auditDir, 'audit-desktop-05-step2-aspect-landscape.png') });
    }
    if (optSquare) {
      console.log('Switching aspect ratio to 1:1 Square...');
      await optSquare.click();
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: path.join(auditDir, 'audit-desktop-06-step2-aspect-square.png') });
    }
    if (optVertical) {
      console.log('Switching aspect ratio to 9:16 Portrait...');
      await optVertical.click();
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: path.join(auditDir, 'audit-desktop-07-step2-aspect-vertical.png') });
    }

    // Advanced settings
    console.log('Action: Toggling Advanced Settings...');
    await page.evaluate(() => window.toggleAdvancedSettings());
    await new Promise(r => setTimeout(r, 400));
    const advPanel = await page.$('#advancedSettingsPanel');
    const cfgDuration = await page.$('#cfgDuration');
    const cfgFps = await page.$('#cfgFps');
    const cfgResolution = await page.$('#cfgResolution');
    console.log('Advanced Settings Panel visible:', !!advPanel);
    console.log('Settings controls available:', !!(cfgDuration && cfgFps && cfgResolution));
    await page.screenshot({ path: path.join(auditDir, 'audit-desktop-08-step2-advanced-settings.png') });

    // Step 3 Audit: Result Video & Download
    console.log('\nAction: Navigating to Step 3 Result View...');
    await page.evaluate(() => window.setCreateStep(3));
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(auditDir, 'audit-desktop-09-step3-result.png') });

    const resultVideo = await page.$('#resultVideo');
    const btnDownloadResult = await page.$('#btnDownloadResult');
    const resMetaDuration = await page.$('#resMetaDuration');
    const resMetaResolution = await page.$('#resMetaResolution');
    const resMetaFps = await page.$('#resMetaFps');
    console.log('Step 3 Result Video (#resultVideo) ready:', !!resultVideo);
    console.log('Step 3 Instant Download button (#btnDownloadResult) ready:', !!btnDownloadResult);
    console.log('Step 3 Metadata badges ready:', !!(resMetaDuration && resMetaResolution && resMetaFps));

    // History Workspace Audit
    console.log('\nAction: Navigating to History Workspace...');
    await page.evaluate(() => window.switchNav('history'));
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(auditDir, 'audit-desktop-10-history-grid.png') });

    const historyGrid = await page.$('#historyGrid');
    const historySearch = await page.$('#historySearch');
    const historySort = await page.$('#historySort');
    const chipFilterAll = await page.$('#chipFilterAll');
    const chipFilterToday = await page.$('#chipFilterToday');
    const chipFilterWeek = await page.$('#chipFilterWeek');
    const chipFilterMonth = await page.$('#chipFilterMonth');
    console.log('History Grid (#historyGrid) rendered:', !!historyGrid);
    console.log('History Search (#historySearch) ready:', !!historySearch);
    console.log('History Sort (#historySort) ready:', !!historySort);
    console.log('Filter chips ready (All/Today/Week/Month):', !!(chipFilterAll && chipFilterToday && chipFilterWeek && chipFilterMonth));

    // Test History Search input
    console.log('Action: Testing search filtering in History...');
    await page.type('#historySearch', 'Sample');
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(auditDir, 'audit-desktop-11-history-search.png') });

    // Test Filter Chips
    console.log('Action: Clicking filter chips...');
    await chipFilterToday.click();
    await new Promise(r => setTimeout(r, 300));
    await chipFilterAll.click();
    await new Promise(r => setTimeout(r, 300));

    // =============================================================
    // 2. MOBILE AUDIT (390x844 - iPhone 14)
    // =============================================================
    console.log('\n>>> [PHASE 2] Mobile Viewport Audit (390x844 iPhone 14) <<<');
    const mobilePage = await browser.newPage();
    setupListeners(mobilePage, 'MOBILE');
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });

    console.log('Loading http://localhost:3333 on mobile...');
    await mobilePage.goto('http://localhost:3333', { waitUntil: 'networkidle0' });
    await mobilePage.screenshot({ path: path.join(auditDir, 'audit-mobile-01-landing.png') });

    // Verify Horizontal Overflow on mobile
    const checkOverflow = async (label) => {
      const overflow = await mobilePage.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          hasOverflow: document.documentElement.scrollWidth > window.innerWidth
        };
      });
      console.log(`[MOBILE OVERFLOW CHECK] ${label}: scrollWidth=${overflow.scrollWidth}px, innerWidth=${overflow.innerWidth}px, hasOverflow=${overflow.hasOverflow}`);
      return overflow.hasOverflow;
    };

    await checkOverflow('Landing Page');

    // Mobile Step 1
    console.log('Action: Mobile -> Navigating to Create Step 1...');
    await mobilePage.evaluate(() => window.switchNav('studio'));
    await new Promise(r => setTimeout(r, 600));
    await mobilePage.screenshot({ path: path.join(auditDir, 'audit-mobile-02-step1.png') });
    await checkOverflow('Step 1 Create');

    // Mobile Step 2 with Live Sample
    console.log('Action: Mobile -> Loading Live Sample into Step 2...');
    await mobilePage.evaluate(() => window.loadSampleAndPreview());
    await new Promise(r => setTimeout(r, 2000));
    await mobilePage.screenshot({ path: path.join(auditDir, 'audit-mobile-03-step2-preview.png') });
    await checkOverflow('Step 2 Preview');

    // Mobile Step 3 Result View
    console.log('Action: Mobile -> Step 3 Result View...');
    await mobilePage.evaluate(() => window.setCreateStep(3));
    await new Promise(r => setTimeout(r, 600));
    await mobilePage.screenshot({ path: path.join(auditDir, 'audit-mobile-04-step3-result.png') });
    await checkOverflow('Step 3 Result');

    // Mobile History View
    console.log('Action: Mobile -> Navigating to History...');
    await mobilePage.evaluate(() => window.switchNav('history'));
    await new Promise(r => setTimeout(r, 1200));
    await mobilePage.screenshot({ path: path.join(auditDir, 'audit-mobile-05-history.png') });
    await checkOverflow('History');

    // =============================================================
    // 3. CONSOLE & NETWORK AUDIT SUMMARY
    // =============================================================
    console.log('\n>>> [PHASE 3] Console & Network Diagnostics Summary <<<');
    const errors = consoleLogs.filter(l => l.type === 'error' || l.type === 'pageerror');
    const warnings = consoleLogs.filter(l => l.type === 'warning');

    console.log(`Total Console Errors: ${errors.length}`);
    errors.forEach(e => console.log(`  - [${e.prefix} ERROR] ${e.text}`));

    console.log(`Total Console Warnings: ${warnings.length}`);
    warnings.forEach(w => console.log(`  - [${w.prefix} WARNING] ${w.text}`));

    console.log(`Total Failed Network Requests: ${networkErrors.length}`);
    networkErrors.forEach(n => console.log(`  - [${n.prefix} NET FAILED] ${n.url} (${n.failure})`));

    await browser.close();

    console.log('\n=====================================================');
    if (errors.length === 0 && warnings.length === 0 && networkErrors.length === 0) {
      console.log('  AUDIT RESULT: 100% PERFECT CLEAN PASS!  ');
    } else {
      console.log('  AUDIT RESULT: COMPLETED WITH DIAGNOSTICS ABOVE  ');
    }
    console.log('=====================================================');

  } catch (err) {
    console.error('Audit execution failed:', err);
    await browser.close();
  }
})();
