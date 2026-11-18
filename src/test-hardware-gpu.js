const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testGpuLaunch() {
  console.log('Testing Chrome launch with Hardware GPU acceleration...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--ignore-gpu-blocklist',
      '--enable-gpu-rasterization',
      '--enable-zero-copy',
      '--enable-webgl',
      '--window-size=1920,1080'
    ]
  });

  const page = await browser.newPage();
  const info = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return { supported: false };
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      supported: true,
      vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown',
      renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown'
    };
  });

  console.log('Hardware WebGL Info:', info);
  await browser.close();
  return info;
}

testGpuLaunch().catch(console.error);
