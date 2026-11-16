const { execSync } = require('child_process');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const FFMPEG_PATH = ffmpegInstaller.path;

function probeMedia(filePath) {
  try {
    const cmd = `"${FFMPEG_PATH}" -i "${filePath}"`;
    // FFmpeg outputs media info to stderr
    execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    const output = (err.stderr || '').toString();
    const videoMatch = output.match(/Stream #0:\d.*Video: ([^,\n]+)/);
    const resolutionMatch = output.match(/, (\d{3,4}x\d{3,4})/);
    const audioMatch = output.match(/Stream #0:\d.*Audio: ([^,\n]+)/);
    const durationMatch = output.match(/Duration: (\d{2}:\d{2}:\d{2}\.\d{2})/);

    return {
      hasVideo: !!videoMatch,
      videoCodec: videoMatch ? videoMatch[1].trim() : 'None',
      resolution: resolutionMatch ? resolutionMatch[1].trim() : 'Unknown',
      hasAudio: !!audioMatch,
      audioCodec: audioMatch ? audioMatch[1].trim() : 'None',
      duration: durationMatch ? durationMatch[1] : 'Unknown'
    };
  }
  return { hasVideo: false, hasAudio: false };
}

module.exports = { probeMedia };
