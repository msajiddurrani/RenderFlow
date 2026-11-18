const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const AudioCapturer = require('./audio-capturer');
const { compileMarkdownToHtml } = require('./markdown-compiler');
const EventEmitter = require('events');

const CHROME_PATH = process.env.CHROME_PATH || 
                    process.env.PUPPETEER_EXECUTABLE_PATH || 
                    process.env.CHROME_BIN || 
                    (process.platform === 'win32' 
                      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' 
                      : (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : '/usr/bin/google-chrome-stable'));
const FFMPEG_PATH = process.env.FFMPEG_PATH || (ffmpegInstaller && ffmpegInstaller.path) || 'ffmpeg';

class RendererEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.width = options.width || null;
    this.height = options.height || null;
    this.fps = options.fps || 30;
    this.defaultDuration = options.duration || 5;
    this.useGpu = options.useGpu !== false; // Hardware GPU enabled by default
    this.audioCapturer = new AudioCapturer({ sampleRate: 44100 });
  }

  /**
   * Render HTML or Markdown to MP4
   */
  async renderHtmlToMp4(inputFilePath, outputMp4Path, renderOptions = {}) {
    const startTime = Date.now();
    const fps = renderOptions.fps || this.fps;
    const useHardwareGpu = renderOptions.useGpu !== undefined ? renderOptions.useGpu : this.useGpu;

    let targetHtmlPath = path.resolve(inputFilePath);
    let tempCompiledHtml = null;

    // Handle Markdown (.md) input
    if (inputFilePath.toLowerCase().endsWith('.md')) {
      this.emit('status', { phase: 'compiling', message: 'Compiling Markdown to presentation slides...' });
      const mdContent = fs.readFileSync(inputFilePath, 'utf8');
      const compiledHtml = compileMarkdownToHtml(mdContent, {
        secondsPerSlide: renderOptions.secondsPerSlide || 4,
        width: renderOptions.width || this.width,
        height: renderOptions.height || this.height
      });
      tempCompiledHtml = path.resolve(inputFilePath.replace(/\.md$/i, '-compiled.html'));
      fs.writeFileSync(tempCompiledHtml, compiledHtml, 'utf8');
      targetHtmlPath = tempCompiledHtml;
    }

    this.emit('status', {
      phase: 'init',
      message: useHardwareGpu
        ? 'Launching Chrome with Direct3D Hardware GPU acceleration...'
        : 'Launching Chrome with SwiftShader software rasterizer...'
    });

    // Browser flags: use hardware GPU acceleration when enabled
    const chromeArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--allow-file-access-from-files',
      '--autoplay-policy=no-user-gesture-required',
      '--window-size=1920,1920'
    ];

    if (useHardwareGpu) {
      chromeArgs.push(
        '--ignore-gpu-blocklist',
        '--enable-gpu-rasterization',
        '--enable-zero-copy',
        '--enable-webgl',
        '--disable-gpu-vsync',
        '--run-all-compositor-stages-before-draw',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding'
      );
    } else {
      chromeArgs.push(
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader'
      );
    }

    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: chromeArgs
    });

    const page = await browser.newPage();

    // Comprehensive virtual clock & timer virtualization
    await page.evaluateOnNewDocument(() => {
      window.__STANDALONE_STEPPING__ = true;
      window.__VIRTUAL_TIME_MS__ = 0;
      window.__RAF_QUEUE__ = [];
      window.__TIMER_ID__ = 1000;
      window.__TIMERS__ = {};
      window.__INTERVALS__ = {};

      const _origPerfNow = performance.now.bind(performance);
      performance.now = () => window.__VIRTUAL_TIME_MS__;
      Date.now = () => 1700000000000 + window.__VIRTUAL_TIME_MS__;

      window.requestAnimationFrame = function(callback) {
        const id = window.__TIMER_ID__++;
        window.__RAF_QUEUE__.push({ id, callback });
        return id;
      };

      window.cancelAnimationFrame = function(id) {
        window.__RAF_QUEUE__ = window.__RAF_QUEUE__.filter(item => item.id !== id);
      };

      window.setTimeout = function(fn, delay = 0, ...args) {
        const id = window.__TIMER_ID__++;
        const fireAt = window.__VIRTUAL_TIME_MS__ + (delay || 0);
        window.__TIMERS__[id] = { fn, fireAt, args };
        return id;
      };
      window.clearTimeout = function(id) { delete window.__TIMERS__[id]; };

      window.setInterval = function(fn, interval = 16, ...args) {
        const id = window.__TIMER_ID__++;
        window.__INTERVALS__[id] = { fn, interval, nextFire: window.__VIRTUAL_TIME_MS__ + interval, args };
        return id;
      };
      window.clearInterval = function(id) { delete window.__INTERVALS__[id]; };

      window.__advanceFrame__ = function(newTimeMs) {
        window.__VIRTUAL_TIME_MS__ = newTimeMs;

        for (const [id, timer] of Object.entries(window.__TIMERS__)) {
          if (timer.fireAt <= newTimeMs) {
            try { timer.fn(...timer.args); } catch(e) {}
            delete window.__TIMERS__[id];
          }
        }

        for (const [id, interval] of Object.entries(window.__INTERVALS__)) {
          while (interval.nextFire <= newTimeMs) {
            try { interval.fn(...interval.args); } catch(e) {}
            interval.nextFire += interval.interval;
          }
        }

        const queue = window.__RAF_QUEUE__.slice();
        window.__RAF_QUEUE__ = [];
        for (const item of queue) {
          try { item.callback(newTimeMs); } catch(e) {}
        }
      };
    });

    const fileUrl = 'file:///' + targetHtmlPath.replace(/\\/g, '/');
    this.emit('status', { phase: 'loading', message: 'Analyzing document structure & animation hooks...' });

    await page.goto(fileUrl, { waitUntil: 'load', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1200));

    // Inspect page dimensions, duration, and hooks
    const pageMeta = await page.evaluate((defaultDur) => {
      let dur = defaultDur;
      if (typeof window.DUR === 'number' && window.DUR > 0) dur = window.DUR;
      const meta = document.querySelector('meta[name="render-duration"]');
      if (meta) {
        const val = parseFloat(meta.getAttribute('content'));
        if (!isNaN(val) && val > 0) dur = val;
      }
      const dataDur = document.body?.getAttribute('data-duration') || document.documentElement?.getAttribute('data-duration');
      if (dataDur) {
        const val = parseFloat(dataDur);
        if (!isNaN(val) && val > 0) dur = val;
      }

      let w = 1920, h = 1080;
      const st = document.getElementById('st') || document.getElementById('stage') || document.querySelector('.stage');
      if (st) {
        const sw = st.offsetWidth || parseInt(st.style.width, 10);
        const sh = st.offsetHeight || parseInt(st.style.height, 10);
        if (sw > 0 && sh > 0) { w = sw; h = sh; }
      } else {
        const c = document.querySelector('canvas');
        if (c && c.width > 0 && c.height > 0) {
          w = c.width; h = c.height;
        }
      }

      // Hide overlay play buttons
      const goBtn = document.getElementById('go') || document.querySelector('.play-btn') || document.querySelector('#play');
      if (goBtn) goBtn.style.display = 'none';

      return {
        dur,
        w,
        h,
        hasSeek: typeof window.seek === 'function',
        hasRenderFrame: typeof window.renderFrame === 'function',
        hasGsap: typeof window.gsap !== 'undefined',
        hasPcm: typeof window.pcm === 'function'
      };
    }, this.defaultDuration);

    let width = renderOptions.width || this.width || pageMeta.w;
    let height = renderOptions.height || this.height || pageMeta.h;
    if (width % 2 !== 0) width++;
    if (height % 2 !== 0) height++;

    const duration = renderOptions.duration || pageMeta.dur;
    const totalFrames = Math.round(duration * fps);

    await page.setViewport({ width, height, deviceScaleFactor: 1 });

    await page.evaluate(() => {
      const st = document.getElementById('st') || document.getElementById('stage');
      if (st) {
        st.style.setProperty('left', '0px', 'important');
        st.style.setProperty('top', '0px', 'important');
        st.style.setProperty('margin', '0px', 'important');
        st.style.setProperty('transform', 'none', 'important');
        try {
          Object.defineProperty(st.style, 'transform', {
            set: () => {},
            get: () => 'none'
          });
        } catch(e) {}
      }
      const go = document.getElementById('go');
      if (go) go.style.display = 'none';
    });

    console.log(`[RenderEngine] ${width}x${height} @ ${fps}fps | ${duration}s (${totalFrames} frames) | GPU: ${useHardwareGpu ? 'D3D-Hardware' : 'SwiftShader'}`);

    this.emit('status', {
      phase: 'audio',
      message: 'Extracting audio channels (Web Audio / PCM / Media Elements)...'
    });

    const tempAudioWav = outputMp4Path.replace(/\.mp4$/i, '-audio.wav');
    const audioResult = await this.audioCapturer.captureAudio(page, targetHtmlPath, tempAudioWav, duration);

    this.emit('status', { phase: 'ffmpeg-init', message: 'Initializing FFmpeg H.264 high-speed pipeline...' });
    const ffmpegArgs = [
      '-y',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-r', String(fps),
      '-i', 'pipe:0',
      '-i', tempAudioWav,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'ultrafast',
      '-crf', '20',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      outputMp4Path
    ];

    const ffmpegProcess = spawn(FFMPEG_PATH, ffmpegArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
    let ffmpegErrorOutput = '';
    ffmpegProcess.stderr.on('data', data => { ffmpegErrorOutput += data.toString(); });

    const cdpClient = await page.target().createCDPSession();
    const frameTimes = [];

    await page.evaluate(() => {
      window.__stepFrame__ = function(idx, t, ms) {
        if (typeof window.__advanceFrame__ === 'function') window.__advanceFrame__(ms);
        if (typeof window.seek === 'function') window.seek(t);
        if (typeof window.renderFrame === 'function') window.renderFrame(idx, t);
        if (typeof window.gsap !== 'undefined' && window.gsap.globalTimeline) window.gsap.globalTimeline.time(t);
      };
    });

    this.emit('status', {
      phase: 'rendering',
      message: `Rendering ${totalFrames} frames (${duration}s at ${width}x${height})...`,
      totalFrames,
      duration,
      width,
      height
    });

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const fStart = Date.now();
      const tSec = frameIndex / fps;
      const vTimeMs = tSec * 1000;

      await cdpClient.send('Runtime.evaluate', {
        expression: `window.__stepFrame__(${frameIndex},${tSec},${vTimeMs})`
      });

      const screenshot = await cdpClient.send('Page.captureScreenshot', {
        format: 'jpeg',
        quality: 82,
        optimizeForSpeed: true
      });

      const frameBuffer = Buffer.from(screenshot.data, 'base64');
      const canWrite = ffmpegProcess.stdin.write(frameBuffer);
      if (!canWrite) {
        await new Promise(resolve => ffmpegProcess.stdin.once('drain', resolve));
      }

      const fDuration = Date.now() - fStart;
      frameTimes.push(fDuration);

      const avgMs = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const pct = Math.round(((frameIndex + 1) / totalFrames) * 100);
      const etaSeconds = Math.round(((totalFrames - frameIndex - 1) * avgMs) / 1000);

      this.emit('progress', {
        frame: frameIndex + 1,
        totalFrames,
        percent: pct,
        avgFrameMs: Math.round(avgMs),
        effectiveFps: (1000 / avgMs).toFixed(1),
        etaSeconds
      });

      if ((frameIndex + 1) % 30 === 0 || frameIndex === totalFrames - 1) {
        console.log(`  [Progress] Frame ${frameIndex + 1}/${totalFrames} (${pct}%) | ${Math.round(avgMs)}ms/f | ${(1000/avgMs).toFixed(1)} FPS | ETA: ${etaSeconds}s`);
      }
    }

    ffmpegProcess.stdin.end();
    this.emit('status', { phase: 'muxing', message: 'Muxing pristine video stream & audio track...' });

    await new Promise((resolve, reject) => {
      ffmpegProcess.on('close', code => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg error (code ${code}): ${ffmpegErrorOutput.slice(-400)}`));
      });
      ffmpegProcess.on('error', reject);
    });

    await browser.close();

    // Clean up temporary compiled HTML or audio WAV
    try { if (fs.existsSync(tempAudioWav)) fs.unlinkSync(tempAudioWav); } catch(e) {}
    try { if (tempCompiledHtml && fs.existsSync(tempCompiledHtml)) fs.unlinkSync(tempCompiledHtml); } catch(e) {}

    const totalRenderSec = (Date.now() - startTime) / 1000;
    const avgFrameTimeMs = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const mp4Size = fs.existsSync(outputMp4Path) ? fs.statSync(outputMp4Path).size : 0;

    const metrics = {
      fixture: path.basename(inputFilePath),
      width,
      height,
      fps,
      durationSec: duration,
      totalFrames,
      totalRenderTimeSec: totalRenderSec.toFixed(2),
      avgFrameTimeMs: avgFrameTimeMs.toFixed(1),
      effectiveFps: (1000 / avgFrameTimeMs).toFixed(1),
      realTimeFactor: (totalRenderSec / duration).toFixed(2),
      mp4SizeBytes: mp4Size,
      audioCaptured: audioResult.type,
      gpuMode: useHardwareGpu ? 'Direct3D11 Hardware' : 'SwiftShader Software'
    };

    console.log(`[RenderEngine] Complete! ${outputMp4Path} (${(mp4Size / 1024).toFixed(1)} KB, ${totalRenderSec.toFixed(1)}s total)`);
    this.emit('status', { phase: 'done', message: 'Complete!', metrics });

    return metrics;
  }
}

module.exports = RendererEngine;
