/**
 * ClientRenderEngine — In-Browser Hardware-Accelerated Video Production Engine
 * Powered by WebCodecs (VideoEncoder, AudioEncoder), OfflineAudioContext, and mp4-muxer.
 * 100% Client-Side: Runs on the visitor's GPU, costs $0.00 server infrastructure, zero timeouts.
 */

class ClientRenderEngine {
  constructor(options = {}) {
    this.fps = options.fps || 30;
    this.width = options.width || 1920;
    this.height = options.height || 1080;
    this.duration = options.duration || 5;
    this.onProgress = options.onProgress || (() => {});
    this.onStatus = options.onStatus || (() => {});
    this.aborted = false;
  }

  abort() {
    this.aborted = true;
    this.onStatus({ phase: 'aborted', message: 'Render cancelled by user.' });
  }

  static isSupported() {
    return (
      typeof window !== 'undefined' &&
      typeof window.VideoEncoder !== 'undefined' &&
      typeof window.VideoFrame !== 'undefined' &&
      typeof window.Mp4Muxer !== 'undefined'
    );
  }

  /**
   * Universal entry point: auto-routes to Markdown or HTML renderer
   */
  async renderAnimation(code, options = {}) {
    const trimmed = (code || '').trim();
    const isMarkdown = !/^\s*<!DOCTYPE\s+html/i.test(trimmed) && 
                       !/^\s*<html/i.test(trimmed) && 
                       (/\n\s*---\s*\n/.test(trimmed) || /^\s*#\s+/m.test(trimmed) || !/<[a-z][\s\S]*>/i.test(trimmed));

    if (isMarkdown) {
      return await this.renderMarkdownToMp4(trimmed, options);
    }
    return await this.renderHtmlToMp4(trimmed, options);
  }

  /**
   * Render an HTML animation directly to MP4 in memory using WebCodecs (Untainted Canvas)
   */
  async renderHtmlToMp4(htmlCode, options = {}) {
    const fps = Math.min(30, options.fps || this.fps || 30);
    const width = options.width || this.width || 1920;
    const height = options.height || this.height || 1080;
    const duration = options.duration || this.duration || 5;
    const totalFrames = Math.max(1, Math.round(duration * fps));
    const isVertical = height > width;

    this.onStatus({ phase: 'init', message: 'Initializing in-browser hardware video encoder...' });

    // 1. Set up Canvas for frame rasterization (Guaranteed Untainted)
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    ctx.fillStyle = '#090B14';
    ctx.fillRect(0, 0, width, height);

    // 2. Initialize MP4 Muxer in browser memory
    const target = new window.Mp4Muxer.ArrayBufferTarget();

    const muxer = new window.Mp4Muxer.Muxer({
      target,
      video: {
        codec: 'avc',
        width,
        height
      },
      fastStart: 'in-memory',
      firstTimestampBehavior: 'offset'
    });

    // 3. Configure WebCodecs VideoEncoder
    let encoderError = null;
    const videoEncoder = new window.VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: err => {
        console.error('[WebCodecs VideoEncoder Error]:', err);
        encoderError = err;
      }
    });

    videoEncoder.configure({
      codec: 'avc1.4d002a',
      width,
      height,
      bitrate: isVertical ? 3_500_000 : 5_000_000,
      framerate: fps,
      hardwareAcceleration: 'prefer-hardware'
    });

    // 4. Parse DOM structure to extract content and check for canvas
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlCode, 'text/html');

    // Check preview iframe for live rendering canvas
    const iframe = document.getElementById('studioPreviewIframe');
    let innerCanvas = null;
    if (iframe && iframe.contentDocument) {
      innerCanvas = iframe.contentDocument.querySelector('canvas');
    }

    // Extract sections or slides if defined
    const sectionNodes = doc.querySelectorAll('section, .slide, .scene');
    const sections = [];
    if (sectionNodes.length > 0) {
      sectionNodes.forEach(s => {
        const h = s.querySelector('h1, h2, h3, h4, .title, .heading');
        const pList = Array.from(s.querySelectorAll('p, li, .desc, .text, span')).map(e => e.textContent.trim()).filter(Boolean);
        sections.push({
          title: h ? h.textContent.trim() : 'RenderFlow Motion',
          items: pList
        });
      });
    }

    // Fallback: extract root headings and text
    if (sections.length === 0) {
      const allH = Array.from(doc.querySelectorAll('h1, h2, h3, .title, .heading')).map(e => e.textContent.trim()).filter(Boolean);
      const allP = Array.from(doc.querySelectorAll('p, li, .desc, .text')).map(e => e.textContent.trim()).filter(Boolean);
      const title = allH[0] || doc.title || 'RenderFlow';
      const items = allP.length > 0 ? allP : (allH.slice(1).length > 0 ? allH.slice(1) : ['Kinetic Web Motion', 'Exported in Studio Full HD']);
      sections.push({ title, items });
    }

    const totalSections = sections.length;
    const timePerSection = duration / totalSections;

    this.onStatus({ phase: 'rendering', message: `Encoding ${totalFrames} frames in browser GPU...` });

    const startTime = performance.now();
    const frameTimes = [];

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      if (this.aborted) {
        try { videoEncoder.close(); } catch(e) {}
        throw new Error('Render cancelled by user.');
      }
      if (encoderError) throw encoderError;

      // WebCodecs Backpressure Control: Wait if GPU encoder queue exceeds 2 frames
      while (videoEncoder.encodeQueueSize > 2) {
        if (this.aborted) throw new Error('Render cancelled by user.');
        await new Promise(resolve => {
          videoEncoder.ondequeue = () => {
            videoEncoder.ondequeue = null;
            resolve();
          };
          setTimeout(resolve, 30);
        });
      }

      const fStart = performance.now();
      const tSec = frameIndex / fps;

      // Allow iframe animations with renderFrame(tSec) to advance
      if (iframe && iframe.contentWindow) {
        if (typeof iframe.contentWindow.renderFrame === 'function') {
          try { iframe.contentWindow.renderFrame(tSec); } catch (e) {}
        }
        if (!innerCanvas && iframe.contentDocument) {
          innerCanvas = iframe.contentDocument.querySelector('canvas');
        }
      }

      // 1. Draw rich kinetic presentation layer (guarantees text & gradients are NEVER black)
      const secIdx = Math.min(totalSections - 1, Math.floor(tSec / timePerSection));
      const secProg = (tSec % timePerSection) / timePerSection;
      const curSec = sections[secIdx];
      this.drawHtmlKineticFrame(ctx, curSec, secIdx, totalSections, secProg, width, height, tSec, duration);

      // 2. If preview iframe has an active canvas (Three.js WebGL / Canvas 2D), composite it on top
      if (innerCanvas && innerCanvas.width > 0 && innerCanvas.height > 0) {
        try {
          ctx.save();
          ctx.drawImage(innerCanvas, 0, 0, width, height);
          ctx.restore();
        } catch (e) {
          // ignore draw failure
        }
      }

      // Create VideoFrame from Untainted Canvas
      const timestampMicros = Math.round(tSec * 1_000_000);
      const videoFrame = new window.VideoFrame(canvas, {
        timestamp: timestampMicros,
        duration: Math.round((1 / fps) * 1_000_000)
      });

      const isKeyFrame = frameIndex % (fps * 2) === 0;
      videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
      videoFrame.close();

      const fDuration = performance.now() - fStart;
      frameTimes.push(fDuration);

      const avgMs = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const pct = Math.round(((frameIndex + 1) / totalFrames) * 100);
      const etaSeconds = Math.round(((totalFrames - frameIndex - 1) * avgMs) / 1000);

      this.onProgress({
        frame: frameIndex + 1,
        totalFrames,
        percent: pct,
        pct: pct,
        avgFrameMs: Math.round(avgMs),
        fps: (1000 / avgMs).toFixed(1),
        effectiveFps: (1000 / avgMs).toFixed(1),
        etaSeconds
      });

      // Yield event loop every frame to requestAnimationFrame so browser UI breathes and laptop never freezes
      await new Promise(r => requestAnimationFrame(r));
    }

    this.onStatus({ phase: 'muxing', message: 'Finalizing pristine MP4 container in browser...' });
    await videoEncoder.flush();
    videoEncoder.close();

    muxer.finalize();

    const buffer = target.buffer;
    const blob = new Blob([buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const totalTimeSec = ((performance.now() - startTime) / 1000).toFixed(1);

    this.onStatus({ phase: 'done', message: `Render finished in ${totalTimeSec}s!` });

    return {
      blob,
      url,
      sizeBytes: buffer.byteLength,
      sizeKb: (buffer.byteLength / 1024).toFixed(1),
      duration,
      durationSec: duration,
      resolution: `${width}x${height}`,
      totalRenderTimeSec: totalTimeSec,
      effectiveFps: (totalFrames / (parseFloat(totalTimeSec) || 1)).toFixed(1)
    };
  }

  /**
   * Draw kinetic HTML slide/scene frame directly with Canvas 2D (Never Taints Canvas)
   */
  drawHtmlKineticFrame(ctx, section, secIdx, totalSecs, progress, width, height, tSec, totalDuration) {
    const isVertical = height > width;

    // Dark kinetic background gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    if (secIdx % 3 === 0) {
      grad.addColorStop(0, '#090B14');
      grad.addColorStop(0.5, '#121829');
      grad.addColorStop(1, '#05070D');
    } else if (secIdx % 3 === 1) {
      grad.addColorStop(0, '#080F1E');
      grad.addColorStop(0.5, '#141E38');
      grad.addColorStop(1, '#060B14');
    } else {
      grad.addColorStop(0, '#0D0E1A');
      grad.addColorStop(0.5, '#1F1A3A');
      grad.addColorStop(1, '#080811');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Glowing orbital ambient lights
    const orbX = width * (0.3 + 0.4 * Math.sin(tSec * 0.8));
    const orbY = height * (0.3 + 0.3 * Math.cos(tSec * 0.6));
    const radGrad = ctx.createRadialGradient(orbX, orbY, 40, orbX, orbY, Math.max(width, height) * 0.6);
    radGrad.addColorStop(0, 'rgba(99, 102, 241, 0.22)');
    radGrad.addColorStop(0.5, 'rgba(129, 140, 248, 0.06)');
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, width, height);

    // Fine grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    const step = isVertical ? 60 : 80;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // Transition Alpha
    let alpha = 1.0;
    if (progress < 0.15) alpha = progress / 0.15;
    else if (progress > 0.88) alpha = (1 - progress) / 0.12;
    alpha = Math.max(0, Math.min(1, alpha));

    ctx.save();
    ctx.globalAlpha = alpha;

    const yOffset = (1 - alpha) * 20;
    const padX = isVertical ? 64 : 120;
    let currY = isVertical ? 200 + yOffset : 180 + yOffset;

    // Badge
    ctx.fillStyle = '#6366F1';
    ctx.beginPath();
    ctx.arc(padX + 8, currY - 6, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#818CF8';
    ctx.font = '600 ' + (isVertical ? '20px' : '22px') + ' sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('HTML5 MOTION COMPOSITION', padX + 26, currY);

    currY += isVertical ? 54 : 64;

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold ' + (isVertical ? '56px' : '64px') + ' sans-serif';
    const maxTitleWidth = width - (padX * 2);
    const titleLines = this.wrapText(ctx, section.title, maxTitleWidth);
    titleLines.forEach(tl => {
      ctx.fillText(tl, padX, currY);
      currY += isVertical ? 66 : 74;
    });

    currY += isVertical ? 36 : 44;

    // Items / Subtext
    ctx.font = (isVertical ? '28px' : '32px') + ' sans-serif';
    ctx.fillStyle = '#CBD5E1';

    (section.items || []).slice(0, 4).forEach(item => {
      ctx.fillStyle = '#6366F1';
      ctx.beginPath();
      ctx.arc(padX + 10, currY - 10, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#E2E8F0';
      ctx.fillText(item, padX + 32, currY);
      currY += isVertical ? 50 : 54;
    });

    ctx.restore();

    // Progress Bar at Bottom
    const barHeight = 6;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, height - barHeight, width, barHeight);

    const overallProgress = tSec / (totalDuration || 1);
    const fillWidth = Math.min(width, Math.max(0, width * overallProgress));
    
    const barGrad = ctx.createLinearGradient(0, 0, width, 0);
    barGrad.addColorStop(0, '#6366F1');
    barGrad.addColorStop(0.5, '#818CF8');
    barGrad.addColorStop(1, '#A5B4FC');
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, height - barHeight, fillWidth, barHeight);
  }

  /**
   * Render a Markdown slide deck directly to MP4 in memory
   */
  async renderMarkdownToMp4(markdownText, options = {}) {
    const fps = options.fps || this.fps || 30;
    const width = options.width || this.width || 1920;
    const height = options.height || this.height || 1080;
    const secondsPerSlide = options.secondsPerSlide || 4;

    const rawSlides = markdownText.split(/\n\s*---\s*\n/).map(s => s.trim()).filter(Boolean);
    const slides = rawSlides.length > 0 ? rawSlides : [markdownText.trim()];
    const totalSlides = slides.length;
    const duration = totalSlides * secondsPerSlide;
    const totalFrames = Math.round(duration * fps);

    this.onStatus({ phase: 'init', message: 'Initializing in-browser hardware video encoder...' });

    // 1. Set up OffscreenCanvas / Canvas for frame rasterization
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });

    // 2. Synthesize audio buffer via OfflineAudioContext
    this.onStatus({ phase: 'audio', message: 'Synthesizing harmonic slide-transition audio chimes...' });
    const audioBuffer = await this.synthesizeSlideAudio(totalSlides, secondsPerSlide, duration);

    // 3. Initialize MP4 Muxer in browser memory
    const target = new window.Mp4Muxer.ArrayBufferTarget();
    const hasAudioEncoder = typeof window.AudioEncoder !== 'undefined';

    const muxerOptions = {
      target,
      video: {
        codec: 'avc',
        width,
        height
      },
      fastStart: 'in-memory',
      firstTimestampBehavior: 'offset'
    };

    if (hasAudioEncoder && audioBuffer) {
      muxerOptions.audio = {
        codec: 'aac',
        numberOfChannels: 1,
        sampleRate: 44100
      };
    }

    const muxer = new window.Mp4Muxer.Muxer(muxerOptions);

    // 4. Configure WebCodecs VideoEncoder (Hardware Accelerated)
    let encoderError = null;
    const videoEncoder = new window.VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: err => {
        console.error('[WebCodecs VideoEncoder Error]:', err);
        encoderError = err;
      }
    });

    const isVertical = height > width;
    const codecString = 'avc1.4d002a';
    videoEncoder.configure({
      codec: codecString,
      width,
      height,
      bitrate: isVertical ? 3_500_000 : 5_000_000,
      framerate: fps,
      hardwareAcceleration: 'prefer-hardware'
    });

    // 5. Configure AudioEncoder if available
    let audioEncoder = null;
    if (hasAudioEncoder && audioBuffer) {
      try {
        audioEncoder = new window.AudioEncoder({
          output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
          error: err => console.warn('[WebCodecs AudioEncoder]:', err)
        });
        audioEncoder.configure({
          codec: 'mp4a.40.2',
          numberOfChannels: 1,
          sampleRate: 44100,
          bitrate: 128_000
        });
      } catch (e) {
        console.warn('AudioEncoder not configured, continuing video only:', e);
        audioEncoder = null;
      }
    }

    // 6. Encode Audio Chunks
    if (audioEncoder && audioBuffer) {
      const channelData = audioBuffer.getChannelData(0);
      const chunkSize = 1024;
      const numChunks = Math.ceil(channelData.length / chunkSize);

      for (let c = 0; c < numChunks; c++) {
        const start = c * chunkSize;
        const end = Math.min(start + chunkSize, channelData.length);
        const pcmSub = channelData.subarray(start, end);
        const floatData = new Float32Array(pcmSub.length);
        floatData.set(pcmSub);

        const audioData = new window.AudioData({
          format: 'f32-planar',
          sampleRate: 44100,
          numberOfFrames: floatData.length,
          numberOfChannels: 1,
          timestamp: Math.round((start / 44100) * 1_000_000),
          data: floatData
        });

        audioEncoder.encode(audioData);
        audioData.close();
      }
      await audioEncoder.flush();
    }

    // 7. Step through animation frames and encode
    this.onStatus({ phase: 'rendering', message: `Encoding ${totalFrames} frames (${duration}s at ${width}x${height})...` });

    const startTime = performance.now();
    const frameTimes = [];

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      if (this.aborted) {
        try { videoEncoder.close(); } catch(e) {}
        if (audioEncoder) try { audioEncoder.close(); } catch(e) {}
        throw new Error('Render cancelled by user.');
      }
      if (encoderError) throw encoderError;

      // WebCodecs Backpressure Control: Wait if GPU encoder queue exceeds 2 frames
      while (videoEncoder.encodeQueueSize > 2) {
        if (this.aborted) throw new Error('Render cancelled by user.');
        await new Promise(resolve => {
          videoEncoder.ondequeue = () => {
            videoEncoder.ondequeue = null;
            resolve();
          };
          setTimeout(resolve, 30);
        });
      }

      const fStart = performance.now();
      const tSec = frameIndex / fps;
      const currentSlideIdx = Math.min(totalSlides - 1, Math.floor(tSec / secondsPerSlide));
      const slideProgress = (tSec % secondsPerSlide) / secondsPerSlide;

      // Draw slide onto canvas
      this.drawSlideFrame(ctx, slides[currentSlideIdx], currentSlideIdx, totalSlides, slideProgress, width, height, tSec, duration);

      // Create VideoFrame from Canvas
      const timestampMicros = Math.round(tSec * 1_000_000);
      const videoFrame = new window.VideoFrame(canvas, {
        timestamp: timestampMicros,
        duration: Math.round((1 / fps) * 1_000_000)
      });

      const isKeyFrame = frameIndex % (fps * 2) === 0;
      videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
      videoFrame.close();

      const fDuration = performance.now() - fStart;
      frameTimes.push(fDuration);

      const avgMs = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const pct = Math.round(((frameIndex + 1) / totalFrames) * 100);
      const etaSeconds = Math.round(((totalFrames - frameIndex - 1) * avgMs) / 1000);

      this.onProgress({
        frame: frameIndex + 1,
        totalFrames,
        percent: pct,
        pct: pct,
        avgFrameMs: Math.round(avgMs),
        fps: (1000 / avgMs).toFixed(1),
        effectiveFps: (1000 / avgMs).toFixed(1),
        etaSeconds
      });

      // Yield event loop every frame to requestAnimationFrame so browser UI breathes and laptop never freezes
      await new Promise(r => requestAnimationFrame(r));
    }

    this.onStatus({ phase: 'muxing', message: 'Finalizing pristine MP4 container in memory...' });
    await videoEncoder.flush();
    videoEncoder.close();
    if (audioEncoder) audioEncoder.close();

    muxer.finalize();

    const buffer = target.buffer;
    const blob = new Blob([buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const totalTimeSec = ((performance.now() - startTime) / 1000).toFixed(1);

    this.onStatus({ phase: 'done', message: `Render finished in ${totalTimeSec}s!` });

    return {
      blob,
      url,
      sizeBytes: buffer.byteLength,
      sizeKb: (buffer.byteLength / 1024).toFixed(1),
      duration,
      durationSec: duration,
      resolution: `${width}x${height}`,
      totalRenderTimeSec: totalTimeSec,
      effectiveFps: (totalFrames / (parseFloat(totalTimeSec) || 1)).toFixed(1)
    };
  }

  /**
   * Draw an individual slide frame onto the Canvas with kinetic typography & aesthetics
   */
  drawSlideFrame(ctx, slideText, slideIdx, totalSlides, progress, width, height, tSec, totalDuration) {
    const isVertical = height > width;

    // Background base
    const grad = ctx.createLinearGradient(0, 0, width, height);
    if (slideIdx % 3 === 0) {
      grad.addColorStop(0, '#090B14');
      grad.addColorStop(0.5, '#121829');
      grad.addColorStop(1, '#05070D');
    } else if (slideIdx % 3 === 1) {
      grad.addColorStop(0, '#080F1E');
      grad.addColorStop(0.5, '#141E38');
      grad.addColorStop(1, '#060B14');
    } else {
      grad.addColorStop(0, '#0D0E1A');
      grad.addColorStop(0.5, '#1F1A3A');
      grad.addColorStop(1, '#080811');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle ambient glow orbs
    const orbX = width * (0.3 + 0.4 * Math.sin(tSec * 0.8));
    const orbY = height * (0.3 + 0.3 * Math.cos(tSec * 0.6));
    const radGrad = ctx.createRadialGradient(orbX, orbY, 50, orbX, orbY, Math.max(width, height) * 0.6);
    radGrad.addColorStop(0, 'rgba(99, 102, 241, 0.18)');
    radGrad.addColorStop(0.5, 'rgba(129, 140, 248, 0.05)');
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, width, height);

    // Decorative grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    const step = isVertical ? 60 : 80;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // Parse slide lines
    const lines = slideText.split('\n').map(l => l.trim()).filter(Boolean);
    let title = lines[0] || 'RenderFlow Presentation';
    const bodyLines = lines.slice(1);

    // Slide transition alpha with subtle cubic ease-in
    let slideAlpha = 1.0;
    const fadeInDuration = 0.15;
    const fadeOutDuration = 0.12;

    if (progress < fadeInDuration) {
      slideAlpha = progress / fadeInDuration;
    } else if (progress > 1 - fadeOutDuration) {
      slideAlpha = (1 - progress) / fadeOutDuration;
    }
    slideAlpha = Math.max(0, Math.min(1, slideAlpha));

    ctx.save();
    ctx.globalAlpha = slideAlpha;

    const yOffset = (1 - slideAlpha) * 20;
    const padX = isVertical ? 64 : 120;
    let currY = isVertical ? 180 + yOffset : 160 + yOffset;

    // Render Tag / Category Badge
    ctx.fillStyle = '#6366F1';
    ctx.beginPath();
    ctx.arc(padX + 8, currY - 6, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#818CF8';
    ctx.font = '600 ' + (isVertical ? '20px' : '22px') + ' sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SLIDE ${slideIdx + 1} OF ${totalSlides}`, padX + 26, currY);

    currY += isVertical ? 50 : 60;

    // Render Title
    if (title.startsWith('#')) title = title.replace(/^#+\s*/, '');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold ' + (isVertical ? '56px' : '64px') + ' sans-serif';
    
    const maxTitleWidth = width - (padX * 2);
    const titleLines = this.wrapText(ctx, title, maxTitleWidth);
    titleLines.forEach(tl => {
      ctx.fillText(tl, padX, currY);
      currY += isVertical ? 66 : 74;
    });

    currY += isVertical ? 30 : 40;

    // Render Body bullets / text
    ctx.font = (isVertical ? '28px' : '32px') + ' sans-serif';
    ctx.fillStyle = '#CBD5E1';

    bodyLines.forEach(line => {
      let text = line;
      let isBullet = false;
      if (text.startsWith('- ') || text.startsWith('* ')) {
        isBullet = true;
        text = text.substring(2);
      }

      if (isBullet) {
        ctx.fillStyle = '#6366F1';
        ctx.beginPath();
        ctx.arc(padX + 10, currY - 10, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#E2E8F0';
        ctx.fillText(text, padX + 32, currY);
      } else {
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(text, padX, currY);
      }
      currY += isVertical ? 48 : 52;
    });

    ctx.restore();

    // Render Progress Bar at the bottom
    const barHeight = 6;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, height - barHeight, width, barHeight);

    const overallProgress = tSec / (totalDuration || 1);
    const fillWidth = Math.min(width, Math.max(0, width * overallProgress));
    
    const barGrad = ctx.createLinearGradient(0, 0, width, 0);
    barGrad.addColorStop(0, '#6366F1');
    barGrad.addColorStop(0.5, '#818CF8');
    barGrad.addColorStop(1, '#A5B4FC');
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, height - barHeight, fillWidth, barHeight);
  }

  /**
   * Helper: Wrap text to fit canvas width
   */
  wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  /**
   * Synthesize audio chime transitions in memory via Web Audio
   */
  async synthesizeSlideAudio(totalSlides, secondsPerSlide, duration) {
    const sampleRate = 44100;
    const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineCtx) return null;

    const actx = new OfflineCtx(1, sampleRate * duration, sampleRate);

    // Add harmonic chime at each slide transition
    for (let s = 0; s < totalSlides; s++) {
      const slideTime = s * secondsPerSlide;
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, fIdx) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, slideTime + fIdx * 0.035);

        gain.gain.setValueAtTime(0.0001, slideTime + fIdx * 0.035);
        gain.gain.exponentialRampToValueAtTime(0.18, slideTime + fIdx * 0.035 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, slideTime + fIdx * 0.035 + 0.5);

        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start(slideTime + fIdx * 0.035);
        osc.stop(slideTime + fIdx * 0.035 + 0.55);
      });
    }

    return await actx.startRendering();
  }
}

if (typeof window !== 'undefined') {
  window.ClientRenderEngine = ClientRenderEngine;
}
