const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const FFMPEG_PATH = ffmpegInstaller.path;

class AudioCapturer {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 44100;
  }

  /**
   * Helper to write raw 16-bit Mono PCM buffer to a valid WAV file
   */
  rawPcmToWav(rawBuffer, sampleRate = 44100, numChannels = 1) {
    const numSamples = rawBuffer.length / 2;
    const wavHeader = Buffer.alloc(44);

    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(36 + rawBuffer.length, 4);
    wavHeader.write('WAVE', 8);
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
    wavHeader.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
    wavHeader.writeUInt16LE(numChannels, 22);
    wavHeader.writeUInt32LE(sampleRate, 24);
    wavHeader.writeUInt32LE(sampleRate * numChannels * 2, 28);
    wavHeader.writeUInt16LE(numChannels * 2, 32);
    wavHeader.writeUInt16LE(16, 34); // BitsPerSample
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(rawBuffer.length, 40);

    return Buffer.concat([wavHeader, rawBuffer]);
  }

  /**
   * Extract audio from a page after navigation
   */
  async captureAudio(page, fixturePath, outputAudioPath, duration = 5) {
    const fixtureDir = path.dirname(fixturePath);

    // 1. Check if the page has window.pcm() hook (raw 16-bit PCM base64)
    const hasPcmHook = await page.evaluate(() => typeof window.pcm === 'function');
    if (hasPcmHook) {
      console.log('  [Audio] Detected window.pcm() custom audio synthesizer hook.');
      try {
        const base64Pcm = await page.evaluate(async () => await window.pcm());
        if (base64Pcm) {
          const rawBuffer = Buffer.from(base64Pcm, 'base64');
          const wavFileBuffer = this.rawPcmToWav(rawBuffer, this.sampleRate, 1);
          fs.writeFileSync(outputAudioPath, wavFileBuffer);
          console.log(`  [Audio] Converted window.pcm() to WAV: ${outputAudioPath} (${wavFileBuffer.length} bytes)`);
          return { success: true, type: 'window-pcm', path: outputAudioPath, bytes: wavFileBuffer.length };
        }
      } catch (err) {
        console.warn('  [Audio] window.pcm() execution error:', err.message);
      }
    }

    // 2. Check if the page has window.__bakeAudioWav hook
    const hasWebAudioBake = await page.evaluate(() => typeof window.__bakeAudioWav === 'function');
    if (hasWebAudioBake) {
      console.log('  [Audio] Detected window.__bakeAudioWav hook.');
      try {
        const base64Wav = await page.evaluate(async (sr) => await window.__bakeAudioWav(sr), this.sampleRate);
        if (base64Wav) {
          const audioBuffer = Buffer.from(base64Wav, 'base64');
          fs.writeFileSync(outputAudioPath, audioBuffer);
          console.log(`  [Audio] Wrote baked Web Audio WAV to ${outputAudioPath} (${audioBuffer.length} bytes)`);
          return { success: true, type: 'web-audio', path: outputAudioPath, bytes: audioBuffer.length };
        }
      } catch (err) {
        console.warn('  [Audio] window.__bakeAudioWav error:', err.message);
      }
    }

    // 3. Check for HTML5 <audio> elements
    const audioSrc = await page.evaluate(() => {
      const el = document.querySelector('audio');
      return el ? el.getAttribute('src') || el.src : null;
    });

    if (audioSrc) {
      console.log(`  [Audio] Detected HTML5 <audio> tag: ${audioSrc}`);
      const resolvedSrc = path.isAbsolute(audioSrc) ? audioSrc : path.resolve(fixtureDir, audioSrc);
      if (fs.existsSync(resolvedSrc)) {
        execSync(`"${FFMPEG_PATH}" -y -i "${resolvedSrc}" -t ${duration} -ac 1 -ar ${this.sampleRate} "${outputAudioPath}"`, { stdio: 'pipe' });
        const stats = fs.statSync(outputAudioPath);
        return { success: true, type: 'html5-audio', path: outputAudioPath, bytes: stats.size };
      }
    }

    // 4. Check for HTML5 <video> elements with audio
    const videoSrc = await page.evaluate(() => {
      const el = document.querySelector('video');
      return el ? el.getAttribute('src') || el.src : null;
    });

    if (videoSrc) {
      console.log(`  [Audio] Detected HTML5 <video> tag: ${videoSrc}`);
      const resolvedSrc = path.isAbsolute(videoSrc) ? videoSrc : path.resolve(fixtureDir, videoSrc);
      if (fs.existsSync(resolvedSrc)) {
        try {
          execSync(`"${FFMPEG_PATH}" -y -i "${resolvedSrc}" -vn -t ${duration} -ac 1 -ar ${this.sampleRate} "${outputAudioPath}"`, { stdio: 'pipe' });
          const stats = fs.statSync(outputAudioPath);
          return { success: true, type: 'html5-video-audio', path: outputAudioPath, bytes: stats.size };
        } catch (err) {
          console.warn('  [Audio] Video audio extraction error:', err.message);
        }
      }
    }

    // 5. Default fallback: Synchronized silent audio track
    console.log('  [Audio] No audio hook detected. Generating silent AAC-compatible audio track.');
    execSync(`"${FFMPEG_PATH}" -y -f lavfi -i anullsrc=r=${this.sampleRate}:cl=mono -t ${duration} "${outputAudioPath}"`, { stdio: 'pipe' });
    const stats = fs.statSync(outputAudioPath);
    return { success: true, type: 'silent', path: outputAudioPath, bytes: stats.size };
  }
}

module.exports = AudioCapturer;
