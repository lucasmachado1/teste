const fs = require('fs');
const path = require('path');

const packagePath = path.join(process.cwd(), 'node_modules', 'postcss', 'package.json');

if (!fs.existsSync(packagePath)) {
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
pkg.exports = pkg.exports || {};

const requiredSubpaths = {
  './lib/parser': './lib/parser.js',
  './lib/stringifier': './lib/stringifier.js',
  './lib/tokenize': './lib/tokenize.js'
};

let changed = false;
Object.entries(requiredSubpaths).forEach(([key, value]) => {
  if (!pkg.exports[key]) {
    pkg.exports[key] = value;
    changed = true;
  }
});

if (changed) {
  fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log('Patched PostCSS package exports for Next.js 10 compatibility.');
}
