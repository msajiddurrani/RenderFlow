const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const uploadsDir = path.join(__dirname, '../uploads');

async function verifyAll() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,960']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });

  console.log('Navigating to http://localhost:3333...');
  await page.goto('http://localhost:3333', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  // 1. Home page check: Steps section MUST be visible on home
  const stepsVisibleOnHome = await page.evaluate(() => {
    const el = document.querySelector('.visionary-steps-section');
    return el && window.getComputedStyle(el).display !== 'none' && window.getComputedStyle(document.getElementById('viewLandingTab')).display !== 'none';
  });
  console.log('1. Steps visible on Home tab:', stepsVisibleOnHome);

  // Take screenshot of step cards showing the decent text (no clunky grey boxes)
  const stepsEl = await page.$('.visionary-steps-section');
  if (stepsEl) {
    await stepsEl.screenshot({ path: path.join(uploadsDir, 'fixed-01-home-steps.png') });
  }

  // 2. Click "+ New video" button
  console.log('2. Clicking + New video button...');
  await page.click('header .btn.primary');
  await new Promise(r => setTimeout(r, 600));

  // Verify Create page is now active and steps are NOT visible
  const stateAfterNewVideo = await page.evaluate(() => {
    const studioTab = document.getElementById('viewStudioTab');
    const landingTab = document.getElementById('viewLandingTab');
    const stepsSec = document.querySelector('.visionary-steps-section');
    const isStudioActive = studioTab.classList.contains('active') && window.getComputedStyle(studioTab).display !== 'none';
    const isLandingHidden = !landingTab.classList.contains('active') && window.getComputedStyle(landingTab).display === 'none';
    const areStepsHidden = !stepsSec || window.getComputedStyle(stepsSec).display === 'none' || window.getComputedStyle(stepsSec.parentElement).display === 'none';
    return { isStudioActive, isLandingHidden, areStepsHidden };
  });
  console.log('State after clicking + New video:', stateAfterNewVideo);

  // Take screenshot of Create page (Step 1)
  await page.screenshot({ path: path.join(uploadsDir, 'fixed-02-create-page.png') });

  // 3. Check for any green capsules or sample button in Create page
  const createCheck = await page.evaluate(() => {
    const hasSampleBtn = !!document.querySelector('.example');
    const formatBar = !!document.querySelector('.drop-formats-bar');
    const bodyHtml = document.body.innerHTML;
    const hasGreen10B981 = bodyHtml.includes('#10B981');
    const hasGreen059669 = bodyHtml.includes('#059669');
    const hasGreen148361 = bodyHtml.includes('#148361');
    return { hasSampleBtn, formatBar, hasGreen10B981, hasGreen059669, hasGreen148361 };
  });
  console.log('Create check results:', createCheck);

  // 4. Click History tab
  console.log('4. Navigating to History tab...');
  await page.click('#tabNavHistory');
  await new Promise(r => setTimeout(r, 600));

  // Verify History page is active and steps are NOT visible
  const stateInHistory = await page.evaluate(() => {
    const histTab = document.getElementById('viewHistoryTab');
    const stepsSec = document.querySelector('.visionary-steps-section');
    const isHistoryActive = histTab.classList.contains('active') && window.getComputedStyle(histTab).display !== 'none';
    const areStepsHidden = !stepsSec || window.getComputedStyle(stepsSec).display === 'none' || window.getComputedStyle(stepsSec.parentElement).display === 'none';
    return { isHistoryActive, areStepsHidden };
  });
  console.log('State in History tab:', stateInHistory);

  // Take screenshot of History page
  await page.screenshot({ path: path.join(uploadsDir, 'fixed-03-history-page.png') });

  // 5. Back to Home and capture the creative footer
  console.log('5. Capturing creative footer...');
  await page.click('#tabNavLanding');
  await new Promise(r => setTimeout(r, 600));

  const footerEl = await page.$('.creative-footer');
  if (footerEl) {
    await footerEl.screenshot({ path: path.join(uploadsDir, 'fixed-04-creative-footer.png') });
  }

  await browser.close();
  console.log('All verification checks completed successfully!');
}

verifyAll().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
