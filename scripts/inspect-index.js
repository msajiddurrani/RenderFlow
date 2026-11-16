const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

const idRegex = /id=["']([^"']+)["']/g;
const ids = new Set();
let match;
while ((match = idRegex.exec(html)) !== null) {
  ids.add(match[1]);
}
console.log('Total unique IDs:', ids.size);
console.log(Array.from(ids).sort());

const fnRegex = /function\s+([a-zA-Z0-9_$]+)\s*\(/g;
const fns = new Set();
while ((match = fnRegex.exec(html)) !== null) {
  fns.add(match[1]);
}
console.log('\nTotal functions:', fns.size);
console.log(Array.from(fns).sort());
