/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const atlasPath = path.join(__dirname, '..', '.expo', 'atlas.jsonl');
const lines = fs.readFileSync(atlasPath, 'utf8').split('\n').filter(Boolean);

const metadata = JSON.parse(lines[0]);
if (lines.length < 2) {
  console.error('No bundle data in atlas');
  process.exit(1);
}

const bundleData = JSON.parse(lines[1]);
const modules = bundleData[6] || [];
const projectRoot = bundleData[2] || '';

function getPackageName(absolutePath) {
  const match = absolutePath.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);
  if (match) return match[1];
  if (absolutePath.includes(projectRoot)) return '(app)';
  return '(unknown)';
}

function getRelativePath(absolutePath) {
  const nodeMod = absolutePath.indexOf('node_modules/');
  if (nodeMod >= 0) return absolutePath.slice(nodeMod);
  const appPath = absolutePath.indexOf(projectRoot);
  if (appPath >= 0) return absolutePath.slice(projectRoot.length).replace(/^\//, '');
  return path.basename(absolutePath);
}

const byPackage = {};
const byModule = [];

for (const mod of modules) {
  const size = mod.size || 0;
  const pkg = getPackageName(mod.absolutePath || '');
  byPackage[pkg] = (byPackage[pkg] || 0) + size;
  byModule.push({
    path: getRelativePath(mod.absolutePath || ''),
    package: pkg,
    size,
  });
}

byModule.sort((a, b) => b.size - a.size);

const hljsModules = byModule.filter(m => m.path.includes('highlight.js') || m.path.includes('lowlight'));
const hljsTotal = hljsModules.reduce((s, m) => s + m.size, 0);

console.log('=== HIGHLIGHT.JS / LOWLIGHT ANALYSIS ===\n');
console.log('Total highlight.js + lowlight:', (hljsTotal / 1024).toFixed(1), 'KB');
console.log('\nModules:');
hljsModules.forEach(m => {
  console.log(`  ${(m.size / 1024).toFixed(1).padStart(8)} KB  ${m.path}`);
});

console.log('\n=== TOP 25 PACKAGES ===\n');
const sortedPkgs = Object.entries(byPackage).sort((a, b) => b[1] - a[1]).slice(0, 25);
sortedPkgs.forEach(([pkg, size]) => {
  console.log(`${(size / 1024).toFixed(1).padStart(8)} KB  ${pkg}`);
});

console.log('\n=== TOP 30 MODULES ===\n');
byModule.slice(0, 30).forEach(m => {
  console.log(`  ${(m.size / 1024).toFixed(1).padStart(8)} KB  ${m.package}  ${m.path}`);
});

console.log('\n=== TOTAL MODULES:', modules.length, '===');
