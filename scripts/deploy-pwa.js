#!/usr/bin/env node

/**
 * PWA deployment automation for frontend (version bump + build + git push + Railway deploy)
 * Usage: node scripts/deploy-pwa.js [patch|minor|major]
 * Default: patch
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function colorize(color, text) { return `${colors[color]}${text}${colors.reset}`; }
function info(msg) { console.log(colorize('blue', `ℹ️  ${msg}`)); }
function ok(msg) { console.log(colorize('green', `✅ ${msg}`)); }
function warn(msg) { console.log(colorize('yellow', `⚠️  ${msg}`)); }
function err(msg) { console.log(colorize('red', `❌ ${msg}`)); }

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    info(`Running: ${command} ${args.join(' ')}`);
    const child = spawn(command, args, { stdio: 'inherit', shell: true, ...options });
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Command failed: ${command}`)));
    child.on('error', reject);
  });
}

const pkgPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(pkgPath)) {
  err('package.json not found. Run from frontend/ directory');
  process.exit(1);
}

const bumpType = process.argv[2] || 'patch';
if (!['patch','minor','major'].includes(bumpType)) {
  err(`Invalid bump type: ${bumpType}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
if (!pkg.version) { err('version not found in package.json'); process.exit(1); }

function inc(v, type) {
  const [M,m,p] = v.split('.').map(Number);
  if (type === 'major') return `${M+1}.0.0`;
  if (type === 'minor') return `${M}.${m+1}.0`;
  return `${M}.${m}.${p+1}`;
}

const currentVersion = pkg.version;
const newVersion = inc(currentVersion, bumpType);

info(`Version: ${currentVersion} → ${newVersion}`);
fs.writeFileSync(pkgPath, JSON.stringify({ ...pkg, version: newVersion }, null, 2) + '\n');
ok('package.json version bumped');

async function main() {
  try {
    // Pull production environment from EAS
    info('Pulling EAS production environment...');
    // Requires EAS CLI; use npx to avoid global prerequisite
    await run('npx', ['eas', 'env:pull', '--environment', 'production']);
    ok('EAS environment pulled');

    // Build PWA (export + service worker)
    info('Building PWA for web (output: PWA/)...');
    await run('npm', ['run', 'build:web']);
    ok('PWA built');

    // Ensure Railway CLI
    try {
      await run('railway', ['--version']);
    } catch {
      warn('Railway CLI not found, installing...');
      await run('npm', ['install', '-g', '@railway/cli']);
    }

    // Link project if needed
    try {
      await run('railway', ['status']);
    } catch {
      warn('Railway project not linked. Launching interactive link...');
      await run('railway', ['link']);
    }

    // Trigger deploy
    info('Triggering Railway deployment...');
    await run('railway', ['up', '--detach']);
    ok('Railway deployment triggered');

    // Commit and push
    info('Committing and pushing changes...');
    await run('git', ['add', 'package.json']);
    await run('git', ['commit', '-m', `"chore: bump frontend PWA to v${newVersion}"`]);
    await run('git', ['push']);
    ok('Changes pushed');

    // Cleanup env file
    const envLocalPath = path.join(process.cwd(), '.env.local');
    try {
      if (fs.existsSync(envLocalPath)) {
        fs.unlinkSync(envLocalPath);
        info('Removed .env.local');
      }
    } catch (e) {
      warn(`Could not remove .env.local: ${e.message}`);
    }

    ok('🎉 PWA deployment completed successfully');
  } catch (e) {
    err(`Deployment failed: ${e.message}`);
    process.exit(1);
  }
}

main();


