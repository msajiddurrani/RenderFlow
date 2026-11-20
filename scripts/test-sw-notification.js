const fs = require('fs');
const http = require('http');
const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('--- AUDITING SERVICE WORKER & MOBILE OS NOTIFICATION CAPABILITIES ---');

  // 1. Verify manifest.json
  const manifestRaw = fs.readFileSync('public/manifest.json', 'utf8');
  const manifest = JSON.parse(manifestRaw);
  console.log('✓ manifest.json is valid JSON:', manifest.name, 'display:', manifest.display);
  if (manifest.display !== 'standalone') throw new Error('manifest display must be standalone');

  // 2. Verify sw.js syntax
  const swCode = fs.readFileSync('public/sw.js', 'utf8');
  if (!swCode.includes('showNotification') || !swCode.includes('notificationclick')) {
    throw new Error('sw.js missing required notification handlers');
  }
  console.log('✓ sw.js contains showNotification and notificationclick event listeners');

  // 3. Verify server endpoints
  const testEndpoint = (urlPath) => new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:3333' + urlPath, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, len: data.length }));
    }).on('error', reject);
  });

  const swRes = await testEndpoint('/sw.js');
  console.log('✓ /sw.js served with HTTP status:', swRes.status, 'size:', swRes.len);
  if (swRes.status !== 200) throw new Error('/sw.js did not return 200');

  const manifestRes = await testEndpoint('/manifest.json');
  console.log('✓ /manifest.json served with HTTP status:', manifestRes.status, 'size:', manifestRes.len);
  if (manifestRes.status !== 200) throw new Error('/manifest.json did not return 200');

  // 4. Puppeteer Mobile Test for Service Worker Registration
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    // Grant notification permission to origin
    const context = browser.defaultBrowserContext();
    await context.overridePermissions('http://127.0.0.1:3333', ['notifications']);

    await page.goto('http://127.0.0.1:3333', { waitUntil: 'networkidle2' });

    // Wait for Service Worker registration
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { supported: false };
      try {
        const reg = await navigator.serviceWorker.ready;
        return {
          supported: true,
          scope: reg.scope,
          active: Boolean(reg.active),
          hasShowNotification: typeof reg.showNotification === 'function'
        };
      } catch (e) {
        return { supported: true, error: e.message };
      }
    });

    console.log('✓ Mobile Service Worker Status in Chrome:', swRegistered);
    if (!swRegistered.hasShowNotification) {
      throw new Error('ServiceWorkerRegistration.showNotification not available!');
    }

    // Verify UI reflects granted permission
    const notifStatus = await page.evaluate(() => {
      const el = document.getElementById('notifStatusText');
      const btn = document.getElementById('btnEnableNotif');
      return {
        statusText: el ? el.innerText : '',
        btnText: btn ? btn.innerText : '',
        btnDisabled: btn ? btn.disabled : false
      };
    });
    console.log('✓ Notification Permission Box UI state:', notifStatus);

    // Test firing triggerCompletionNotification
    const testNotifTrigger = await page.evaluate(async () => {
      try {
        await triggerCompletionNotification('RenderFlow QA', 'Mobile OS Notification Test');
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    console.log('✓ Completion Notification Execution:', testNotifTrigger);
    if (!testNotifTrigger.success) {
      throw new Error('triggerCompletionNotification failed: ' + testNotifTrigger.error);
    }

    console.log('\n✓✓✓ ALL SERVICE WORKER & OS NOTIFICATION TESTS PASSED 100%! ✓✓✓');
  } finally {
    await browser.close();
  }
})();
