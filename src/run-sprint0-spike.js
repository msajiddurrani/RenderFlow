const fs = require('fs');
const path = require('path');
const RendererEngine = require('./renderer-engine');
const { probeMedia } = require('./verify-mp4');

async function runSprint0Spike() {
  console.log('=================================================================');
  console.log('       SPRINT 0 SPIKE: AUDIO CAPTURE & SOFTWARE WEBGL 1080P       ');
  console.log('=================================================================\n');

  const engine = new RendererEngine({ width: 1920, height: 1080, fps: 30, duration: 3 });
  const outputDir = path.resolve(__dirname, '../output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const fixtures = [
    {
      file: 'sample-1-web-audio.html',
      name: 'Sample 1: Web Audio Synth (Offline Context + Canvas)',
      category: 'Audio Spike'
    },
    {
      file: 'sample-2-html5-audio.html',
      name: 'Sample 2: HTML5 <audio> Tag + CSS/DOM Animations',
      category: 'Audio Spike'
    },
    {
      file: 'sample-3-html5-video.html',
      name: 'Sample 3: HTML5 <video> with Audio + Overlay Compositing',
      category: 'Audio Spike'
    },
    {
      file: 'sample-4-threejs-cube.html',
      name: 'Sample 4: Three.js 3D WebGL (SwiftShader 1080p, No GPU)',
      category: 'WebGL 1080p Spike'
    },
    {
      file: 'sample-5-threejs-web-audio.html',
      name: 'Sample 5: Combined Three.js 1080p + Web Audio Synth',
      category: 'Combined Spike'
    }
  ];

  const results = [];

  for (let i = 0; i < fixtures.length; i++) {
    const item = fixtures[i];
    const htmlPath = path.resolve(__dirname, '../fixtures', item.file);
    const mp4Path = path.resolve(outputDir, item.file.replace('.html', '.mp4'));

    try {
      const metrics = await engine.renderHtmlToMp4(htmlPath, mp4Path, { width: 1920, height: 1080, fps: 30 });
      const probe = probeMedia(mp4Path);

      results.push({
        id: `SAMPLE-${i + 1}`,
        category: item.category,
        name: item.name,
        file: item.file,
        metrics,
        verification: probe,
        pass: probe.hasVideo && probe.hasAudio && metrics.mp4SizeBytes > 10000
      });
    } catch (err) {
      console.error(`FAILED rendering ${item.file}:`, err);
      results.push({
        id: `SAMPLE-${i + 1}`,
        category: item.category,
        name: item.name,
        file: item.file,
        error: err.message,
        pass: false
      });
    }
  }

  // Save full results JSON
  const resultsJsonPath = path.join(outputDir, 'sprint0-benchmark-results.json');
  fs.writeFileSync(resultsJsonPath, JSON.stringify(results, null, 2));

  console.log('\n=================================================================');
  console.log('                 SPRINT 0 BENCHMARK SUMMARY TABLE                 ');
  console.log('=================================================================');
  console.table(results.map(r => ({
    ID: r.id,
    Fixture: r.file,
    'Render Time (s)': r.metrics ? r.metrics.totalRenderTimeSec : 'FAIL',
    'Avg Frame (ms)': r.metrics ? r.metrics.avgFrameTimeMs : 'FAIL',
    'Effective FPS': r.metrics ? r.metrics.effectiveFps : 'FAIL',
    'RealTime Factor': r.metrics ? `${r.metrics.realTimeFactor}x` : 'FAIL',
    'Video Codec': r.verification ? r.verification.videoCodec : 'FAIL',
    'Audio Codec': r.verification ? r.verification.audioCodec : 'FAIL',
    'Status': r.pass ? 'PASS (GO)' : 'FAIL (NO-GO)'
  })));

  console.log('\n=================================================================');
  console.log('             RENDER COST PER MINUTE OF FINISHED VIDEO             ');
  console.log('=================================================================');
  console.table(results.filter(r => r.pass).map(r => ({
    ID: r.id,
    Fixture: r.file,
    'Client-Side (WebCodecs)': r.metrics.costAnalysis.clientSideWebCodecs,
    'Dedicated VPS (Hetzner)': r.metrics.costAnalysis.dedicatedVpsPerVideoMin,
    'Serverless (AWS/GCP)': r.metrics.costAnalysis.serverlessPerVideoMin
  })));

  return results;
}

runSprint0Spike().catch(err => {
  console.error('Fatal error running spike:', err);
  process.exit(1);
});
