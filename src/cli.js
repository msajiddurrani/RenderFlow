#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const RendererEngine = require('./renderer-engine');
const { probeMedia } = require('./verify-mp4');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    input: null,
    output: null,
    fps: 30,
    width: null,
    height: null,
    duration: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-o' || arg === '--output') {
      options.output = args[++i];
    } else if (arg === '--fps') {
      options.fps = parseInt(args[++i], 10);
    } else if (arg === '--width') {
      options.width = parseInt(args[++i], 10);
    } else if (arg === '--height') {
      options.height = parseInt(args[++i], 10);
    } else if (arg === '--duration' || arg === '-d') {
      options.duration = parseFloat(args[++i]);
    } else if (arg === '--resolution' || arg === '-r') {
      const res = args[++i].toLowerCase();
      if (res === '1080p') {
        options.width = 1920; options.height = 1080;
      } else if (res === '1080p-v' || res === 'vertical' || res === 'reel') {
        options.width = 1080; options.height = 1920;
      } else if (res === '720p') {
        options.width = 1280; options.height = 720;
      } else if (res === '4k') {
        options.width = 3840; options.height = 2160;
      }
    } else if (!options.input && !arg.startsWith('-')) {
      options.input = arg;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();

  if (!options.input) {
    console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                  HTML-to-MP4 Render Engine CLI                     ║
╚════════════════════════════════════════════════════════════════════╝

Usage:
  node src/cli.js <input.html> [options]

Options:
  -o, --output <file.mp4>    Output MP4 path (default: output/<input>.mp4)
  -r, --resolution <res>     Resolution: auto, 1080p, 1080p-v (reel), 720p, 4k
  --fps <number>             Target frame rate (default: 30)
  -d, --duration <seconds>   Override animation duration in seconds
  --width <pixels>           Custom viewport width
  --height <pixels>          Custom viewport height
`);
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), options.input);
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const outputPath = options.output
    ? path.resolve(process.cwd(), options.output)
    : path.resolve(process.cwd(), 'output', path.basename(inputPath, path.extname(inputPath)) + '.mp4');

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const engine = new RendererEngine({
    width: options.width,
    height: options.height,
    fps: options.fps,
    duration: options.duration
  });

  const metrics = await engine.renderHtmlToMp4(inputPath, outputPath, {
    width: options.width,
    height: options.height,
    fps: options.fps,
    duration: options.duration
  });

  const probe = probeMedia(outputPath);

  console.log(`\n✅ Render finished successfully in ${metrics.totalRenderTimeSec}s!`);
  console.log(`   MP4 Size:    ${(metrics.mp4SizeBytes / 1024).toFixed(1)} KB`);
  console.log(`   Resolution:  ${probe.resolution}`);
  console.log(`   Video Codec: ${probe.videoCodec}`);
  console.log(`   Audio Codec: ${probe.audioCodec}`);
  console.log(`   Duration:    ${probe.duration}`);
  console.log(`   File:        ${outputPath}\n`);
}

main().catch(err => {
  console.error('\n❌ Render failed:', err);
  process.exit(1);
});
