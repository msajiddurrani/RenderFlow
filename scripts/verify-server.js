const http = require('http');

http.get('http://localhost:3333', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    console.log('Content-Type:', res.headers['content-type']);
    console.log('Includes Jane Motion:', body.includes('Jane Motion Studio'));
    console.log('Includes IndexedDB Vault:', body.includes('JaneVaultDB'));
    console.log('Sandboxed iframe:', body.includes('sandbox="allow-scripts"'));
    console.log('Length:', body.length);
  });
}).on('error', (err) => {
  console.error('Error fetching localhost:3333:', err.message);
});
