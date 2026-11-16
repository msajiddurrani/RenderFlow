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
    this.onProgress = options.onProgress || (() => {});
    this.onStatus = options.onStatus || (() => {});
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
   * Render a Markdown slide deck directly to MP4 in memory
   */
  async renderMarkdownToMp4(markdownText, options = {}) {
    const fps = options.fps || this.fps;
    const width = options.width || this.width;
    const height = options.height || this.height;
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
    const codecString = 'avc1.4d002a'; // H.264 Main Profile Level 4.2
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

        const audioData = new AudioData({
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
      if (encoderError) throw encoderError;

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
        avgFrameMs: Math.round(avgMs),
        effectiveFps: (1000 / avgMs).toFixed(1),
        etaSeconds
      });

      // Yield event loop every 5 frames so UI stays silky smooth
      if (frameIndex % 5 === 0) {
        await new Promise(r => setTimeout(r, 0));
      }
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
   * Draw high-typography presentation slide onto Canvas
   */
  drawSlideFrame(ctx, slideText, slideIdx, totalSlides, progress, width, height, tSec, totalDuration) {
    const isVertical = height > width;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0a0d14');
    bgGrad.addColorStop(0.6, '#0f172a');
    bgGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle ambient glow
    const glowGrad = ctx.createRadialGradient(width * 0.7, height * 0.3, 10, width * 0.7, height * 0.3, width * 0.5);
    glowGrad.addColorStop(0, 'rgba(99, 102, 241, 0.18)');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    // Decorative geometric grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const step = 80;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // Top branding badge
    ctx.save();
    const padX = isVertical ? 60 : 120;
    const topY = isVertical ? 100 : 100;

    // Category / Slide Tag
    ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.4)';
    ctx.lineWidth = 1.5;
    const tagW = 180, tagH = 36;
    ctx.beginPath();
    ctx.roundRect(padX, topY, tagW, tagH, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#a5b4fc';
    ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`SLIDE ${slideIdx + 1} OF ${totalSlides}`, padX + tagW / 2, topY + tagH / 2);
    ctx.restore();

    // Parse slide markdown lines
    const lines = slideText.split('\n').map(l => l.trim()).filter(Boolean);
    let title = lines[0] || 'Presentation Slide';
    if (title.startsWith('#')) title = title.replace(/^#+\s*/, '');
    const bodyLines = lines.slice(1);

    // Title entrance animation (eases in during first 0.3s of slide)
    const enterEase = Math.min(1, progress * 4);
    const titleOffsetY = (1 - enterEase) * 20;

    // Draw Slide Title
    ctx.save();
    ctx.font = isVertical ? '800 52px "Plus Jakarta Sans", sans-serif' : '800 68px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    // Wrap title if long
    const maxTitleW = width - padX * 2;
    const titleLines = this.wrapText(ctx, title, maxTitleW);
    let currY = topY + 80 + titleOffsetY;

    titleLines.forEach(tl => {
      ctx.fillText(tl, padX, currY);
      currY += isVertical ? 62 : 78;
    });

    // Decorative color accent line
    const accentGrad = ctx.createLinearGradient(padX, 0, padX + 260, 0);
    accentGrad.addColorStop(0, '#4f46e5');
    accentGrad.addColorStop(0.5, '#7c3aed');
    accentGrad.addColorStop(1, '#ec4899');
    ctx.fillStyle = accentGrad;
    ctx.fillRect(padX, currY + 12, 180, 5);
    currY += 46;

    // Draw Body content / bullet points
    ctx.font = isVertical ? '500 28px "Plus Jakarta Sans", sans-serif' : '500 32px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#cbd5e1';

    bodyLines.forEach((line, lIdx) => {
      let text = line;
      let isBullet = false;
      if (text.startsWith('- ') || text.startsWith('* ')) {
        isBullet = true;
        text = text.substring(2);
      }

      if (isBullet) {
        ctx.fillStyle = '#818cf8';
        ctx.beginPath();
        ctx.arc(padX + 12, currY + 16, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(text, padX + 36, currY);
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(text, padX, currY);
      }

      currY += isVertical ? 48 : 54;
    });
    ctx.restore();

    // Bottom timeline bar
    const barHeight = 8;
    const totalProgress = Math.max(0, Math.min(1, tSec / totalDuration));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, height - barHeight, width, barHeight);

    const progGrad = ctx.createLinearGradient(0, 0, width, 0);
    progGrad.addColorStop(0, '#4f46e5');
    progGrad.addColorStop(0.5, '#7c3aed');
    progGrad.addColorStop(1, '#ec4899');
    ctx.fillStyle = progGrad;
    ctx.fillRect(0, height - barHeight, width * totalProgress, barHeight);

    // Footer brand note
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '600 16px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Jane Motion Studio • 1080p WebCodecs', width - padX, height - 30);
  }

  wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

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
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Pristine Major Chime)
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
