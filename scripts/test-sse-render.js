const http = require('http');

const postData = JSON.stringify({
  code: `<!DOCTYPE html><html><body style="background:#09090b;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;">
    <h1 id="t" style="font-size:72px;font-family:sans-serif;">PREVIEW TEST</h1>
    <script>
      window.renderFrame = function(idx, t) {
        document.getElementById('t').innerText = 'FRAME ' + idx + ' (' + t.toFixed(2) + 's)';
      };
    </script>
  </body></html>`,
  format: 'html',
  filename: 'test-preview.html',
  resolution: '720p',
  fps: 30,
  duration: 1
});

const req = http.request('http://localhost:3333/api/render-code-sse', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  console.log('Status code:', res.statusCode);
  res.on('data', chunk => {
    const text = chunk.toString();
    if (text.includes('complete') || text.includes('progress') || text.includes('status')) {
      console.log('SSE message received:', text.trim().slice(0, 150));
    }
  });
  res.on('end', () => console.log('SSE Stream finished'));
});

req.on('error', e => console.error('Req error:', e));
req.write(postData);
req.end();
