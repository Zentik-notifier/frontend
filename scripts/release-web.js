#!/usr/bin/env node

// Unified release script: version bump + EAS update + Railway deploy
// Usage: node scripts/release-web.js [patch|minor|major]

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const colors = { reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m' };
const log = (c, m) => console.log(`${colors[c]}${m}${colors.reset}`);
const info = (m) => log('blue', `ℹ️  ${m}`);
const ok = (m) => log('green', `✅ ${m}`);
const warn = (m) => log('yellow', `⚠️  ${m}`);
const err = (m) => log('red', `❌ ${m}`);

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    info(`Running: ${cmd} ${args.join(' ')}`);
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true, ...options });
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`)));
    child.on('error', reject);
  });
}

const pkgPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(pkgPath)) { err('package.json not found (run from frontend/)'); process.exit(1); }

const bumpType = process.argv[2] || 'patch';
if (!['patch','minor','major'].includes(bumpType)) { err(`Invalid bump type: ${bumpType}`); process.exit(1); }

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
if (!pkg.version) { err('version not found in package.json'); process.exit(1); }

function inc(v, type) { const [M,m,p] = v.split('.').map(Number); return type==='major'?`${M+1}.0.0`: type==='minor'?`${M}.${m+1}.0`:`${M}.${m}.${p+1}`; }

const currentVersion = pkg.version;
const newVersion = inc(currentVersion, bumpType);
info(`Version: ${currentVersion} → ${newVersion}`);
fs.writeFileSync(pkgPath, JSON.stringify({ ...pkg, version: newVersion }, null, 2) + '\n');
ok('package.json version bumped');

async function main() {
  try {
    // EAS Update (OTA channel production)
    info('Pushing OTA update with EAS...');
    await run('npx', ['eas', 'update', '--environment', 'production', '--channel', 'production']);
    ok('EAS update triggered');

    // Railway deploy
    try { await run('railway', ['--version']); } catch { await run('npm', ['install', '-g', '@railway/cli']); }
    try { await run('railway', ['status']); } catch { await run('railway', ['link']); }
    info('Triggering Railway deployment...');
    await run('railway', ['up', '--detach']);
    ok('Railway deployment triggered');

    // Commit and push
    info('Committing and pushing version change...');
    await run('git', ['add', 'package.json']);
    await run('git', ['commit', '-m', `"chore: release web v${newVersion} (EAS+Railway)"`]);
    await run('git', ['push']);
    ok('Git push completed');

    ok('🎉 Unified release finished successfully');
  } catch (e) {
    err(`Release failed: ${e.message}`);
    process.exit(1);
  }
}

main();


