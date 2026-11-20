const https = require('https');

const postData = JSON.stringify({
  code: '<!DOCTYPE html><html><body style="margin:0;background:#4F46E5;"><h1 style="color:white;">HF Space Test</h1><script>window.DURATION=2;</script></body></html>',
  resolution: '1080p-v',
  fps: 30,
  duration: 2,
  gpu: true
});

console.log('Sending render request to Hugging Face Space...');
const req = https.request('https://durrani6969-renderflow-engine.hf.space/api/render-code-sse', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  console.log('SSE HTTP Status:', res.statusCode);
  let buffer = '';
  let filename = '';
  res.on('data', chunk => {
    buffer += chunk.toString('utf8');
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const d = JSON.parse(line.slice(6));
          if (d.pct !== undefined) process.stdout.write(d.pct + '% ');
          if (d.percent !== undefined) process.stdout.write(d.percent + '% ');
          if (d.filename) filename = d.filename;
          if (d.metrics) {
            console.log('\nRender completed! Metrics:', d.metrics);
            testDownload(d.filename);
          }
        } catch(e) {}
      }
    }
  });
  res.on('end', () => console.log('\nSSE Stream ended.'));
});

req.on('error', (err) => console.error('SSE Error:', err));
req.write(postData);
req.end();

function testDownload(fn) {
  if (!fn) return;
  console.log('\nAttempting GET on /download/' + fn + '...');
  https.get('https://durrani6969-renderflow-engine.hf.space/download/' + fn, (res) => {
    console.log('Download Status:', res.statusCode);
    console.log('Download Headers:', res.headers);
    let bytes = 0;
    res.on('data', c => bytes += c.length);
    res.on('end', () => console.log('Downloaded total bytes:', bytes));
  }).on('error', (err) => console.error('Download error:', err));
}
