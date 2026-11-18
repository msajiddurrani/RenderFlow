const https = require('https');

const postData = JSON.stringify({
  code: '<!DOCTYPE html><html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;color:#fff;font-family:sans-serif;font-size:48px;">Test Render 123</body></html>',
  format: 'html',
  filename: 'test-cloud-render.html',
  fps: 30,
  duration: 2,
  width: 640,
  height: 360,
  useGpu: false
});

const req = https.request('https://durrani6969-renderflow-engine.hf.space/api/render-code-sse', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, res => {
  console.log('HTTP STATUS:', res.statusCode);
  res.on('data', chunk => {
    process.stdout.write(chunk.toString());
  });
  res.on('end', () => {
    console.log('\n--- Stream Complete ---');
    process.exit(0);
  });
});

req.on('error', err => {
  console.error('Request Error:', err.message);
  process.exit(1);
});

req.write(postData);
req.end();
