const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const uploadsDir = path.join(__dirname, '../uploads');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Desktop Test for Footer (1280x900)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('http://localhost:3333', { waitUntil: 'networkidle0' });

    const footerElem = await page.$('.site-footer');
    if (footerElem) {
      await footerElem.screenshot({ path: path.join(uploadsDir, 'desktop-footer.png') });
      console.log('Saved uploads/desktop-footer.png');
    }

    // Verify footer social links
    const socialLinks = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.footer-social-card'));
      return cards.map(c => ({ href: c.href, target: c.target, title: c.title }));
    });
    console.log('Desktop Social Links:', socialLinks);
    await page.close();
  }

  // 2. Mobile Test (390px - iPhone 14)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:3333', { waitUntil: 'networkidle0' });

    const metricsHome = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth > window.innerWidth
    }));
    console.log('Mobile 390px Home overflow:', metricsHome);

    await page.screenshot({ path: path.join(uploadsDir, 'mobile-390-home.png'), fullPage: true });

    const footerElem = await page.$('.site-footer');
    if (footerElem) {
      await footerElem.screenshot({ path: path.join(uploadsDir, 'mobile-390-footer.png') });
      console.log('Saved uploads/mobile-390-footer.png');
    }

    // Navigate to Create
    await page.click('#tabNavStudio');
    await new Promise(r => setTimeout(r, 600));

    const metricsCreate = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth > window.innerWidth
    }));
    console.log('Mobile 390px Create overflow:', metricsCreate);

    // Verify format pills text
    const formatPills = await page.evaluate(() => {
      const pills = Array.from(document.querySelectorAll('.drop-formats-bar .drop-format-pill'));
      return pills.map(p => p.textContent.trim());
    });
    console.log('Format pills present:', formatPills);

    await page.screenshot({ path: path.join(uploadsDir, 'mobile-390-create.png'), fullPage: true });

    // Navigate to History
    await page.click('#tabNavHistory');
    await new Promise(r => setTimeout(r, 600));

    const metricsHistory = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth > window.innerWidth
    }));
    console.log('Mobile 390px History overflow:', metricsHistory);

    await page.screenshot({ path: path.join(uploadsDir, 'mobile-390-history.png'), fullPage: true });
    await page.close();
  }

  // 3. Mobile Test (375px - iPhone SE)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:3333', { waitUntil: 'networkidle0' });

    const metricsHome375 = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth > window.innerWidth
    }));
    console.log('Mobile 375px Home overflow:', metricsHome375);
    await page.close();
  }

  await browser.close();
  console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
})();
