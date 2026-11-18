const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\MD PCT\\.gemini\\antigravity\\brain\\f43628e8-d059-4f3a-b9bf-6d2a501642d5';

(async () => {
  console.log('--- Verifying Mobile UI at 390x844 (iPhone 14/15) & 375x667 (iPhone SE) ---');
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Test 1: 390x844 (iPhone screen matching user screenshot)
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3333', { waitUntil: 'networkidle0' });

  const navbarCheck = await page.evaluate(() => {
    const navIn = document.querySelector('.nav-in');
    const brand = document.querySelector('.brand');
    const navLinks = document.querySelector('.nav-links');
    const navActionBtn = document.querySelector('.nav-actions .btn');
    const plusSpan = navActionBtn.querySelector('.btn-nav-plus');
    const textSpan = navActionBtn.querySelector('.btn-nav-text');

    const navInRect = navIn.getBoundingClientRect();
    const btnRect = navActionBtn.getBoundingClientRect();
    const bodyScrollWidth = document.body.scrollWidth;
    const bodyClientWidth = document.body.clientWidth;

    const computedTextDisplay = textSpan ? window.getComputedStyle(textSpan).display : 'none';
    const computedPlusDisplay = plusSpan ? window.getComputedStyle(plusSpan).display : 'none';

    return {
      navInWidth: navInRect.width,
      btnRight: btnRect.right,
      btnWidth: btnRect.width,
      btnHeight: btnRect.height,
      btnVisibleText: navActionBtn.innerText.trim(),
      plusVisible: computedPlusDisplay !== 'none',
      textHidden: computedTextDisplay === 'none',
      bodyScrollWidth,
      bodyClientWidth,
      hasHorizontalOverflow: bodyScrollWidth > bodyClientWidth
    };
  });

  console.log('Navbar check at 390px:', navbarCheck);

  const footerCheck = await page.evaluate(() => {
    const footerMain = document.querySelector('.footer-main-row');
    const footerSocial = document.querySelector('.footer-social-wrap');
    const footerNav = document.querySelector('.footer-nav-wrap');
    const ghCard = document.querySelector('.footer-social-card');

    const fMainStyle = window.getComputedStyle(footerMain);
    const ghRect = ghCard ? ghCard.getBoundingClientRect() : null;

    return {
      display: fMainStyle.display,
      flexDirection: fMainStyle.flexDirection,
      alignItems: fMainStyle.alignItems,
      ghRight: ghRect ? ghRect.right : null,
      ghVisibleInsideScreen: ghRect ? (ghRect.right <= 390 && ghRect.left >= 0) : false
    };
  });

  console.log('Footer check at 390px:', footerCheck);

  if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile-viewport-390-top.png'), clip: { x: 0, y: 0, width: 390, height: 400 } });
  
  // Scroll to footer
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile-viewport-390-footer.png'), clip: { x: 0, y: Math.max(0, await page.evaluate(() => document.body.scrollHeight - 450)), width: 390, height: 450 } });

  // Test 2: 375x667 (iPhone SE)
  await page.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 300));

  const seCheck = await page.evaluate(() => {
    const navActionBtn = document.querySelector('.nav-actions .btn');
    const btnRect = navActionBtn.getBoundingClientRect();
    const bodyScrollWidth = document.body.scrollWidth;
    const bodyClientWidth = document.body.clientWidth;

    return {
      btnRight: btnRect.right,
      btnVisibleText: navActionBtn.innerText.trim(),
      bodyScrollWidth,
      bodyClientWidth,
      hasHorizontalOverflow: bodyScrollWidth > bodyClientWidth
    };
  });

  console.log('iPhone SE check at 375px:', seCheck);

  await browser.close();

  if (navbarCheck.hasHorizontalOverflow || seCheck.hasHorizontalOverflow) {
    throw new Error('FAIL: Mobile screen has horizontal overflow!');
  }
  if (!navbarCheck.textHidden || navbarCheck.btnVisibleText !== '+') {
    throw new Error(`FAIL: Navbar button visible text is "${navbarCheck.btnVisibleText}", expected exactly "+"`);
  }
  if (!footerCheck.ghVisibleInsideScreen) {
    throw new Error('FAIL: GitHub card is outside screen bounds!');
  }

  console.log('✓ ALL MOBILE UI CHECKS PASSED 100% PERFECTLY!');
})();
