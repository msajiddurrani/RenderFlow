const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('Testing server render of PainForge Reel HTML...');

// Check if task-652 is responding
http.get('http://localhost:3333/api/history', (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log('History status:', res.statusCode);
    const data = JSON.parse(body);
    console.log('Available records:');
    data.records.forEach(r => console.log(` - ${r.filename} (${r.resolution}, ${r.duration}, ${r.sizeKb} KB) -> URL: ${r.url}`));
  });
}).on('error', err => {
  console.error('Server error:', err.message);
});
