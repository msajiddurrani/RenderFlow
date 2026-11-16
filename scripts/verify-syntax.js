const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('public/index.html', 'utf8');
const scriptMatches = html.match(/<script>([\s\S]*?)<\/script>/);

if (!scriptMatches) {
  console.error('No inline script found!');
  process.exit(1);
}

try {
  new vm.Script(scriptMatches[1]);
  console.log('SUCCESS: Script syntax is 100% valid!');
} catch (e) {
  console.error('Syntax error in index.html script:', e);
  process.exit(1);
}
