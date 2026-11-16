const fs = require('fs');
const path = require('path');

async function testUploadApi() {
  console.log('Testing upload API endpoint...');
  const testHtml = `<!DOCTYPE html>
<html>
<head><meta name="render-duration" content="1.5"></head>
<body style="margin:0;background:#030712;display:flex;align-items:center;justify-content:center;width:1920px;height:1080px;">
  <h1 id="title" style="color:#38bdf8;font-size:72px;font-family:sans-serif;">UPLOAD TEST ANIMATION</h1>
  <script>
    window.renderFrame = function(f) {
      document.getElementById('title').style.transform = 'scale(' + (1 + Math.sin(f * 0.1) * 0.2) + ')';
    };
  </script>
</body>
</html>`;

  const res = await fetch('http://localhost:3333/api/render-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      htmlCode: testHtml,
      filename: 'api-test.html',
      resolution: '1080p',
      fps: 30,
      duration: 1.5
    })
  });

  const data = await res.json();
  console.log('Upload API response:', data);
  if (data.success && fs.existsSync(path.resolve(__dirname, '..', data.url.replace(/^\//, '')))) {
    console.log('SUCCESS! File rendered and exists on disk at:', data.url);
  } else {
    console.error('FAIL:', data);
  }
}

testUploadApi().catch(console.error);
