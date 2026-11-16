const http = require('http');

http.get('http://localhost:3333/api/history', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('History API Status:', res.statusCode);
    console.log('History API Content-Type:', res.headers['content-type']);
    try {
      const data = JSON.parse(body);
      console.log('History records count:', data.records ? data.records.length : 0);
      console.log('Test PASSED: Server API returns valid JSON.');
    } catch (e) {
      console.error('History API returned non-JSON:', body.slice(0, 100));
    }
  });
}).on('error', err => {
  console.error('Error:', err.message);
});
