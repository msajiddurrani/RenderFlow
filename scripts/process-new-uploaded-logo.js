const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const logoPath = 'C:/Users/MD PCT/.gemini/antigravity/brain/f43628e8-d059-4f3a-b9bf-6d2a501642d5/.user_uploaded/media_1794936358175_10adf923.png';
const base64Img = fs.readFileSync(logoPath).toString('base64');
const publicDir = path.join(__dirname, '../public');

async function processNewLogo() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new'
  });
  const page = await browser.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <body>
      <img id="srcImg" src="data:image/png;base64,${base64Img}" />
      <script>
        window.processLogo = function() {
          const img = document.getElementById('srcImg');
          const w = img.naturalWidth;
          const h = img.naturalHeight;

          const rawC = document.createElement('canvas');
          rawC.width = w;
          rawC.height = h;
          const ctx = rawC.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const imgData = ctx.getImageData(0, 0, w, h);
          const d = imgData.data;

          // Find exact bounding box of the 3D logo
          let minX = w, maxX = 0, minY = h, maxY = 0;

          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const idx = (y * w + x) * 4;
              const r = d[idx], g = d[idx+1], b = d[idx+2];
              
              // Calculate distance from pure white background
              const distFromWhite = Math.sqrt((255-r)*(255-r) + (255-g)*(255-g) + (255-b)*(255-b));
              
              if (distFromWhite < 16) {
                d[idx+3] = 0; // Completely transparent
              } else if (distFromWhite < 48) {
                // Smooth anti-aliased edge transition
                const alphaFactor = (distFromWhite - 16) / 32;
                d[idx+3] = Math.round(alphaFactor * 255);
                
                // Unpremultiply color to remove white halo
                const invA = 255 / Math.max(1, d[idx+3]);
                d[idx] = Math.min(255, Math.max(0, Math.round((r - 255 * (1 - alphaFactor)) * invA)));
                d[idx+1] = Math.min(255, Math.max(0, Math.round((g - 255 * (1 - alphaFactor)) * invA)));
                d[idx+2] = Math.min(255, Math.max(0, Math.round((b - 255 * (1 - alphaFactor)) * invA)));
              }

              // Track bounding box of visible pixels
              if (d[idx+3] > 25) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          ctx.putImageData(imgData, 0, 0);

          const bboxW = Math.max(1, maxX - minX + 1);
          const bboxH = Math.max(1, maxY - minY + 1);

          console.log('BBox:', minX, minY, bboxW, bboxH);

          // Render tightly bounded logo & favicon
          function makeSized(size, paddingRatio = 0.04) {
            const outC = document.createElement('canvas');
            outC.width = size;
            outC.height = size;
            const oCtx = outC.getContext('2d');
            oCtx.imageSmoothingEnabled = true;
            oCtx.imageSmoothingQuality = 'high';

            const maxDim = Math.max(bboxW, bboxH);
            const targetDim = size * (1 - paddingRatio * 2);
            const scale = targetDim / maxDim;

            const drawW = bboxW * scale;
            const drawH = bboxH * scale;
            const dx = (size - drawW) / 2;
            const dy = (size - drawH) / 2;

            oCtx.drawImage(rawC, minX, minY, bboxW, bboxH, dx, dy, drawW, drawH);
            return outC.toDataURL('image/png');
          }

          return {
            w, h, bboxW, bboxH,
            fav32: makeSized(32, 0.02),
            fav64: makeSized(64, 0.02),
            fav128: makeSized(128, 0.03),
            fav192: makeSized(192, 0.03),
            fav512: makeSized(512, 0.04),
            logo4k: makeSized(2048, 0.04)
          };
        };
      </script>
    </body>
    </html>
  `);

  await page.waitForSelector('#srcImg');
  const results = await page.evaluate(() => {
    const img = document.getElementById('srcImg');
    if (img.complete) return window.processLogo();
    return new Promise(res => { img.onload = () => res(window.processLogo()); });
  });

  console.log('Processed logo:', results.w, 'x', results.h, 'BBox:', results.bboxW, 'x', results.bboxH);

  function saveB64(dataUrl, fname) {
    const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(path.join(publicDir, fname), Buffer.from(b64, 'base64'));
  }

  saveB64(results.fav32, 'favicon-32x32.png');
  saveB64(results.fav64, 'favicon.png');
  saveB64(results.fav128, 'favicon-128x128.png');
  saveB64(results.fav192, 'favicon-192x192.png');
  saveB64(results.fav64, 'favicon.ico');
  saveB64(results.fav512, 'RenderFlow_Logo_Transparent.png');
  saveB64(results.logo4k, 'RenderFlow_Logo_4K.png');

  console.log('All new logos and favicons saved successfully in public/ !');
  await browser.close();
}

processNewLogo().catch(console.error);
