#!/usr/bin/env node

/**
 * Node.js script for iOS release automation (version bump + build + submit in one step)
 * Usage: node scripts/release-ios.js [patch|minor|major]
 * Default: patch
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Colors for output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

function colorize(color, text) {
    return `${colors[color]}${text}${colors.reset}`;
}

function printInfo(message) {
    console.log(colorize('blue', `ℹ️  ${message}`));
}

function printSuccess(message) {
    console.log(colorize('green', `✅ ${message}`));
}

function printWarning(message) {
    console.log(colorize('yellow', `⚠️  ${message}`));
}

function printError(message) {
    console.log(colorize('red', `❌ ${message}`));
}

function printHeader() {
    console.log(colorize('blue', '🚀 ========================================'));
    console.log(colorize('blue', '   Zentik iOS Release Automation'));
    console.log(colorize('blue', '   Version Bump → Build + Submit'));
    console.log(colorize('blue', '========================================'));
}

// Function to run shell commands
function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        printInfo(`Running: ${command} ${args.join(' ')}`);
        
        const child = spawn(command, args, {
            stdio: 'inherit',
            shell: true,
            ...options
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with exit code ${code}`));
            }
        });
        
        child.on('error', (error) => {
            reject(error);
        });
    });
}

// Check we're in the correct directory
const configPath = path.join(process.cwd(), 'app.config.ts');
if (!fs.existsSync(configPath)) {
    printError('app.config.ts not found. Run the script from the frontend/ directory');
    process.exit(1);
}

// Bump type (default: patch)
const bumpType = process.argv[2] || 'patch';

// Validate bump type
if (!['patch', 'minor', 'major'].includes(bumpType)) {
    printError(`Invalid bump type: ${bumpType}`);
    printInfo('Use: patch, minor, or major');
    process.exit(1);
}

printHeader();
printInfo(`Bump type: ${bumpType}`);

// Read app.config.ts file
let configContent;
try {
    configContent = fs.readFileSync(configPath, 'utf8');
} catch (error) {
    printError(`Error reading app.config.ts: ${error.message}`);
    process.exit(1);
}

// Extract current versions
const versionMatch = configContent.match(/version: "([^"]+)"/);
const buildNumberMatch = configContent.match(/buildNumber: "([^"]+)"/);
const versionCodeMatch = configContent.match(/versionCode: (\d+)/);

if (!versionMatch || !buildNumberMatch || !versionCodeMatch) {
    printError('Unable to find versions in app.config.ts');
    process.exit(1);
}

const currentVersion = versionMatch[1];
const currentBuildNumber = parseInt(buildNumberMatch[1]);
const currentVersionCode = parseInt(versionCodeMatch[1]);

printInfo('Current versions:');
printInfo(`  Version: ${currentVersion}`);
printInfo(`  Build Number: ${currentBuildNumber}`);
printInfo(`  Version Code: ${currentVersionCode}`);

// Function to increment semantic version
function incrementVersion(version, type) {
    const parts = version.split('.').map(Number);
    let [major, minor, patch] = parts;
    
    switch (type) {
        case 'major':
            major += 1;
            minor = 0;
            patch = 0;
            break;
        case 'minor':
            minor += 1;
            patch = 0;
            break;
        case 'patch':
            patch += 1;
            break;
    }
    
    return `${major}.${minor}.${patch}`;
}

// Calculate new versions
const newVersion = incrementVersion(currentVersion, bumpType);
const newBuildNumber = currentBuildNumber + 1;
const newVersionCode = currentVersionCode + 1;

printInfo('New versions:');
printInfo(`  Version: ${newVersion}`);
printInfo(`  Build Number: ${newBuildNumber}`);
printInfo(`  Version Code: ${newVersionCode}`);

// Create backup
const backupPath = `${configPath}.backup`;
try {
    fs.copyFileSync(configPath, backupPath);
    printInfo(`Backup created: ${path.basename(backupPath)}`);
} catch (error) {
    printError(`Error creating backup: ${error.message}`);
    process.exit(1);
}

// Update versions in content
let updatedContent = configContent;
updatedContent = updatedContent.replace(
    /version: "[^"]+"/,
    `version: "${newVersion}"`
);
updatedContent = updatedContent.replace(
    /buildNumber: "[^"]+"/,
    `buildNumber: "${newBuildNumber}"`
);
updatedContent = updatedContent.replace(
    /versionCode: \d+/, 
    `versionCode: ${newVersionCode}`
);

// Write updated file
try {
    fs.writeFileSync(configPath, updatedContent, 'utf8');
    printSuccess('Versions updated in app.config.ts');
} catch (error) {
    printError(`Error writing app.config.ts: ${error.message}`);
    // Restore backup
    try {
        fs.copyFileSync(backupPath, configPath);
        printWarning('File restored from backup');
    } catch (restoreError) {
        printError(`Error restoring: ${restoreError.message}`);
    }
    process.exit(1);
}

// Show differences
printInfo('Changes:');
printInfo(`  Version: ${currentVersion} → ${newVersion}`);
printInfo(`  Build Number: ${currentBuildNumber} → ${newBuildNumber}`);
printInfo(`  Version Code: ${currentVersionCode} → ${newVersionCode}`);

printSuccess('🎉 Version bump completed successfully!');

// Main release process
async function runReleaseProcess() {
    try {
        console.log('');
        printInfo('Starting automated iOS release process...');
        
        // Combined EAS Build and Submit in one command (detached mode)
        printInfo('Starting EAS build and submit for iOS production in detached mode...');
        printInfo('This will build the app and automatically submit to App Store when ready');
        
        await runCommand('eas', [
            'build', 
            '--platform', 'ios', 
            '--profile', 'production',
            '--auto-submit',
            '--auto-submit-with-profile', 'production',
            '--no-wait',
            '--non-interactive'
        ]);
        
        printSuccess('EAS build and App Store submission completed successfully!');

        // Git commit of app.config.ts changes
        try {
            printInfo('Committing app.config.ts changes to git...');
            await runCommand('git', ['add', 'app.config.ts']);
            await runCommand('git', ['commit', '-m', `"chore(ios): bump version to ${newVersion} (build ${newBuildNumber})"`]);
            await runCommand('git', ['push']);
            printSuccess('app.config.ts committed and pushed');
        } catch (gitError) {
            printWarning(`Git commit/push failed or skipped: ${gitError.message}`);
        }
        
        printSuccess('🎉 Full release process completed!');
        printInfo(`Version ${newVersion} has been built and submitted to the App Store`);

        // Remove backup if everything went well
        try {
            fs.unlinkSync(backupPath);
            printInfo('Backup removed');
        } catch (error) {
            printWarning(`Unable to remove backup: ${error.message}`);
        }

        printSuccess('🎉 iOS Release automation completed successfully!');
        console.log('');
        printInfo('Summary:');
        printInfo(`  ✅ Version bumped: ${currentVersion} → ${newVersion}`);
        printInfo(`  ✅ Build Number: ${currentBuildNumber} → ${newBuildNumber}`);
        printInfo(`  ✅ Version Code: ${currentVersionCode} → ${newVersionCode}`);
        printInfo(`  ✅ EAS build and App Store submission completed in one step`);
        printInfo(`  ✅ app.config.ts committed to repository (if possible)`);

    } catch (error) {
        printError(`Release process failed: ${error.message}`);
        printWarning('Restoring backup...');
        
        // Restore backup in case of error
        try {
            fs.copyFileSync(backupPath, configPath);
            printWarning('app.config.ts file restored from backup');
            fs.unlinkSync(backupPath);
            printInfo('Backup file removed');
        } catch (restoreError) {
            printError(`Error restoring backup: ${restoreError.message}`);
        }
        
        process.exit(1);
    }
}

// Run the release process
runReleaseProcess();
