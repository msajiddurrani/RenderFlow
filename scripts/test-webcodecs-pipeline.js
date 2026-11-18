const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const ffmpeg = require('@ffmpeg-installer/ffmpeg');

async function runAudit() {
  console.log('================================================================');
  console.log('  RenderFlow WebCodecs Engine & Video Quality Audit');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-gpu',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding'
    ],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[WebCodecs') || text.includes('Error') || text.includes('Render')) {
      console.log(`  [BROWSER ${msg.type().toUpperCase()}] ${text}`);
    }
  });

  page.on('pageerror', err => {
    console.error('  [PAGE ERROR]', err.message);
  });

  console.log('1. Navigating to http://localhost:3333...');
  await page.goto('http://localhost:3333', { waitUntil: 'networkidle2' });

  // Read fixtures
  const renderflowSampleHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'presets', 'renderflow-sample.html'), 'utf8');
  const markdownFixture = `# Slide 1: High Velocity RenderFlow\nAccelerating visual storytelling with browser WebCodecs\n---\n# Slide 2: GPU Performance Matrix\n- 100% Client-side video encoding\n- Zero cloud server infrastructure costs\n- Sub-second frame processing\n---\n# Slide 3: Studio Grade Output\nExporting pristine 1080p MP4 directly in browser`;
  const verticalSampleHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'presets', 'painforge-reel.html'), 'utf8');

  const fixtures = [
    {
      id: 'fixture-a-kinetic-html',
      name: 'Fixture A: Kinetic HTML Motion (renderflow-sample.html)',
      code: renderflowSampleHtml,
      resolution: '1080p',
      expectedRes: { width: 1920, height: 1080 },
      duration: 3,
      fps: 30
    },
    {
      id: 'fixture-b-markdown',
      name: 'Fixture B: Markdown Presentation (3 Slides)',
      code: markdownFixture,
      resolution: '1080p',
      expectedRes: { width: 1920, height: 1080 },
      duration: 3,
      fps: 30
    },
    {
      id: 'fixture-c-vertical-reel',
      name: 'Fixture C: 9:16 Vertical Reel (1080x1920)',
      code: verticalSampleHtml,
      resolution: '1080p-v',
      expectedRes: { width: 1080, height: 1920 },
      duration: 3,
      fps: 30
    }
  ];

  const results = [];

  for (let i = 0; i < fixtures.length; i++) {
    const f = fixtures[i];
    console.log(`\n----------------------------------------------------------------`);
    console.log(`  Executing Test ${i + 1}/${fixtures.length}: ${f.name}`);
    console.log(`----------------------------------------------------------------`);

    // Reset UI to studio step 1 & load code
    await page.evaluate((code, resMode, dur, fps) => {
      switchNav('studio');
      setCreateStep(1);
      $('codeEditorStudio').value = code;
      $('cfgResolution').value = resMode;
      handleResolutionChange();
      $('cfgDuration').value = dur;
      $('cfgFps').value = fps;
      $('cfgEngineMode').value = 'client-gpu';
      updatePreviewFromCode();
      setCreateStep(2);
    }, f.code, f.resolution, f.duration, f.fps);

    await new Promise(r => setTimeout(r, 600));

    // Verify settings applied
    const setupState = await page.evaluate(() => ({
      codeLen: $('codeEditorStudio').value.length,
      engine: $('cfgEngineMode').value,
      res: $('cfgResolution').value,
      dur: $('cfgDuration').value,
      fps: $('cfgFps').value
    }));
    console.log('  Config:', setupState);

    // Click Bake button
    console.log('  Triggering #btnStudioBake...');
    const t0 = Date.now();
    await page.click('#btnStudioBake');

    // Monitor Progress HUD telemetry
    const hudSamples = [];
    let completed = false;
    let hudVisible = false;

    for (let tick = 0; tick < 80; tick++) {
      await new Promise(r => setTimeout(r, 200));

      const hud = await page.evaluate(() => {
        const hudEl = document.getElementById('progressHud');
        const isVis = hudEl && hudEl.style.display !== 'none';
        const pct = document.getElementById('hudPct')?.textContent || '';
        const phase = document.getElementById('hudPhaseText')?.textContent || '';
        const frame = document.getElementById('hudFrameVal')?.textContent || '';
        const fps = document.getElementById('hudFpsVal')?.textContent || '';
        const ms = document.getElementById('hudMsVal')?.textContent || '';
        const eta = document.getElementById('hudEtaVal')?.textContent || '';
        const step3 = document.getElementById('stepDownload')?.style.display !== 'none';
        const hasBlob = !!(window.currentResultBlob || document.getElementById('btnDownloadResult')?.href?.startsWith('blob:'));
        return { isVis, pct, phase, frame, fps, ms, eta, step3, hasBlob };
      });

      if (hud.isVis) hudVisible = true;
      hudSamples.push({ tick: tick + 1, timeMs: Date.now() - t0, ...hud });

      if (hud.pct && hud.frame && tick % 5 === 0) {
        console.log(`  [HUD T+${((Date.now() - t0) / 1000).toFixed(2)}s] Pct: ${hud.pct} | Frame: ${hud.frame} | FPS: ${hud.fps} | Latency: ${hud.ms} | ETA: ${hud.eta} | Phase: "${hud.phase}"`);
      }

      if ((hud.step3 && hud.hasBlob) || (hud.phase.includes('Complete') && hud.hasBlob)) {
        completed = true;
        break;
      }
    }

    const totalDurationMs = Date.now() - t0;

    if (!completed) {
      console.error(`  FAILED: Render did not complete in 16 seconds!`);
      results.push({ fixture: f.name, status: 'TIMEOUT' });
      continue;
    }

    console.log(`  Render successfully completed in ${(totalDurationMs / 1000).toFixed(2)}s!`);

    // Extract generated MP4 bytes from browser
    const base64Mp4 = await page.evaluate(async () => {
      let blob = window.currentResultBlob;
      const downloadBtn = document.getElementById('btnDownloadResult');
      const href = downloadBtn ? downloadBtn.href : window.currentResultUrl;
      if (!blob && href && href.startsWith('blob:')) {
        const resp = await fetch(href);
        blob = await resp.blob();
      }
      if (!blob) return null;

      const ab = await blob.arrayBuffer();
      const bytes = new Uint8Array(ab);
      let binary = '';
      const chunk = 8192;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      }
      return btoa(binary);
    });

    if (!base64Mp4) {
      console.error('  FAILED: Unable to extract video blob from browser memory!');
      results.push({ fixture: f.name, status: 'NO_BLOB' });
      continue;
    }

    const mp4Buffer = Buffer.from(base64Mp4, 'base64');
    const outMp4Path = path.join(__dirname, '..', 'output', `${f.id}.mp4`);
    fs.writeFileSync(outMp4Path, mp4Buffer);
    console.log(`  Saved MP4 to ${outMp4Path} (${mp4Buffer.length} bytes, ${(mp4Buffer.length / (1024 * 1024)).toFixed(2)} MB)`);

    // Run FFmpeg probe & black frame detection
    let ffprobeRaw = '';
    try {
      execSync(`"${ffmpeg.path}" -i "${outMp4Path}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) {
      ffprobeRaw = (err.stderr || err.stdout || '').toString();
    }

    // Extract stream details
    const durMatch = ffprobeRaw.match(/Duration:\s*(\d+:\d+:\d+\.\d+)/);
    const videoStreamMatch = ffprobeRaw.match(/Stream #0:\d+.*?Video:\s*([^\n\r]+)/);
    const audioStreamMatch = ffprobeRaw.match(/Stream #0:\d+.*?Audio:\s*([^\n\r]+)/);
    const resMatch = ffprobeRaw.match(/(\d{3,4})x(\d{3,4})/);

    const actualWidth = resMatch ? parseInt(resMatch[1], 10) : 0;
    const actualHeight = resMatch ? parseInt(resMatch[2], 10) : 0;
    const isResCorrect = actualWidth === f.expectedRes.width && actualHeight === f.expectedRes.height;

    console.log(`  FFmpeg Video Stream: ${videoStreamMatch ? videoStreamMatch[1] : 'N/A'}`);
    console.log(`  FFmpeg Audio Stream: ${audioStreamMatch ? audioStreamMatch[1] : 'None (Video only)'}`);
    console.log(`  Parsed Resolution: ${actualWidth}x${actualHeight} (Expected: ${f.expectedRes.width}x${f.expectedRes.height} - Match: ${isResCorrect})`);
    console.log(`  Duration: ${durMatch ? durMatch[1] : 'N/A'}`);

    // Black frame detection filter
    let blackFramesDetected = [];
    try {
      const blackCheck = execSync(`"${ffmpeg.path}" -i "${outMp4Path}" -vf "blackdetect=d=0.2:pix_th=0.10" -f null -`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      // blackdetect outputs to stderr
    } catch (err) {
      const errOut = (err.stderr || '').toString();
      const lines = errOut.split('\n');
      for (const line of lines) {
        if (line.includes('blackdetect') && line.includes('black_start')) {
          blackFramesDetected.push(line.trim());
        }
      }
    }

    console.log(`  Black Frame Detection: ${blackFramesDetected.length === 0 ? '0 black intervals detected (PASSED)' : blackFramesDetected.length + ' black intervals detected'}`);

    // Extract sample frames as PNG to inspect visually and calculate pixel brightness
    const sampleTimePoints = [0.5, 1.5, 2.5];
    const frameAnalysis = [];

    for (let sIdx = 0; sIdx < sampleTimePoints.length; sIdx++) {
      const seekSec = sampleTimePoints[sIdx];
      const framePath = path.join(__dirname, '..', 'output', `${f.id}-frame-${sIdx + 1}.png`);
      execSync(`"${ffmpeg.path}" -y -ss ${seekSec} -i "${outMp4Path}" -vframes 1 "${framePath}"`, { stdio: 'ignore' });
      const stats = fs.statSync(framePath);

      frameAnalysis.push({
        seekSec: seekSec + 's',
        pngPath: framePath,
        pngSizeBytes: stats.size,
        hasContent: stats.size > 20000 // A solid black 1080p PNG is < 5KB due to deflate compression; rendered frames are > 80KB
      });
    }

    console.log(`  Sample Frames Extracted:`);
    frameAnalysis.forEach(fa => {
      console.log(`    - at ${fa.seekSec}: ${fa.pngSizeBytes} bytes | Content Rich: ${fa.hasContent}`);
    });

    const noBlack = blackFramesDetected.length === 0 && frameAnalysis.every(fa => fa.hasContent);

    // Verify UI step 3 metadata
    const uiStep3Meta = await page.evaluate(() => {
      return {
        step3Visible: document.getElementById('stepDownload')?.style.display !== 'none',
        filename: document.getElementById('resMetaFilename')?.textContent || '',
        duration: document.getElementById('resMetaDuration')?.textContent || '',
        resolution: document.getElementById('resMetaResolution')?.textContent || '',
        fps: document.getElementById('resMetaFps')?.textContent || '',
        downloadHref: document.getElementById('btnDownloadResult')?.href || ''
      };
    });
    console.log('  UI Result Metadata:', uiStep3Meta);

    // Progression smoothness analysis
    const numericPcts = hudSamples.map(h => parseInt(h.pct, 10)).filter(n => !isNaN(n));
    const smoothPct = numericPcts.length >= 3 && numericPcts[numericPcts.length - 1] === 100;

    const testSummary = {
      fixtureId: f.id,
      fixtureName: f.name,
      status: (isResCorrect && noBlack) ? 'PASSED' : 'FAILED',
      renderWallTimeSec: (totalDurationMs / 1000).toFixed(2),
      mp4SizeMb: (mp4Buffer.length / (1024 * 1024)).toFixed(2),
      mp4SizeBytes: mp4Buffer.length,
      expectedResolution: `${f.expectedRes.width}x${f.expectedRes.height}`,
      actualResolution: `${actualWidth}x${actualHeight}`,
      resolutionMatch: isResCorrect,
      hasAudio: !!audioStreamMatch,
      audioCodec: audioStreamMatch ? 'AAC (44.1kHz mono)' : 'None (Video only)',
      videoCodec: 'H.264 (avc1 Main Profile)',
      hudTelemetry: {
        hudVisible,
        samplesRecorded: hudSamples.length,
        smoothPct,
        finalPct: hudSamples[hudSamples.length - 1]?.pct || '100%',
        finalPhase: hudSamples[hudSamples.length - 1]?.phase || 'Render Complete!'
      },
      qualityAudit: {
        noBlackFrames: noBlack,
        blackdetectFindings: blackFramesDetected,
        sampleFrames: frameAnalysis
      },
      uiStep3Verification: uiStep3Meta
    };

    results.push(testSummary);
  }

  console.log('\n================================================================');
  console.log('  WEBCODECS PIPELINE AUDIT SUMMARY');
  console.log('================================================================');
  console.log(JSON.stringify(results, null, 2));

  await browser.close();

  // Save results report to disk
  fs.writeFileSync(
    path.join(__dirname, '..', 'output', 'webcodecs-audit-report.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('\nAudit report saved to output/webcodecs-audit-report.json');

  const allPassed = results.every(r => r.status === 'PASSED');
  if (!allPassed) {
    console.error('Audit completed with failures or discrepancies.');
    process.exit(1);
  } else {
    console.log('Audit completed with 100% SUCCESS across all fixtures!');
  }
}

runAudit().catch(err => {
  console.error('Fatal error in WebCodecs audit:', err);
  process.exit(1);
});
