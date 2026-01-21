#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const iosDir = path.join(__dirname, '..', 'ios');
const watchTargetDir = path.join(__dirname, '..', 'targets', 'watch');
const sharedFilesDir = path.join(__dirname, '..', 'plugins', 'ZentikShared');
const isDev = process.env.APP_VARIANT === 'development';
const bundleIdentifier = isDev ? 'com.apocaliss92.zentik.dev' : 'com.apocaliss92.zentik';

/**
 * Get all Swift files from the ZentikShared directory
 */
function getSharedSwiftFiles(sharedDir) {
  if (!fs.existsSync(sharedDir)) {
    return [];
  }

  const entries = fs.readdirSync(sharedDir, { withFileTypes: true });
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.swift'))
    .map(entry => entry.name);
}

console.log('🔧 Fixing ShareExtension entitlements and copying shared files...');

const shareExtensionDirs = [
  { path: path.join(iosDir, 'ZentikShareExtension'), name: 'ZentikShareExtension.entitlements', isDev: false },
  { path: path.join(iosDir, 'ZentikDevShareExtension'), name: 'ZentikDevShareExtension.entitlements', isDev: true },
];

let updated = 0;

for (const { path: shareExtDir, name: entitlementsFileName, isDev: isDevDir } of shareExtensionDirs) {
  if (!fs.existsSync(shareExtDir)) {
    continue;
  }

  const currentBundleId = isDevDir 
    ? bundleIdentifier.includes('.dev') ? bundleIdentifier : `${bundleIdentifier}.dev`
    : bundleIdentifier.replace('.dev', '');

  const entitlementsPath = path.join(shareExtDir, entitlementsFileName);

  const entitlementsContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.application-groups</key>
    <array>
      <string>group.${currentBundleId}</string>
    </array>
    <key>keychain-access-groups</key>
    <array>
      <string>$(AppIdentifierPrefix)${currentBundleId}.keychain</string>
      <string>$(AppIdentifierPrefix)*</string>
    </array>
    <key>com.apple.developer.icloud-services</key>
    <array>
      <string>CloudKit</string>
      <string>CloudDocuments</string>
    </array>
    <key>com.apple.developer.icloud-container-identifiers</key>
    <array>
      <string>iCloud.${currentBundleId}</string>${isDevDir ? `\n      <string>iCloud.${currentBundleId.replace('.dev', '')}</string>` : ''}
    </array>
    <key>com.apple.developer.ubiquity-kvstore-identifier</key>
    <string>$(TeamIdentifierPrefix)${currentBundleId}</string>
  </dict>
</plist>`;

  fs.writeFileSync(entitlementsPath, entitlementsContent, 'utf-8');
  
  console.log(`✅ Updated: ${entitlementsFileName}`);
  console.log(`   🔑 Keychain: $(AppIdentifierPrefix)${currentBundleId}.keychain`);
  
  updated++;
}

console.log(`\n✅ Successfully updated ${updated} entitlements file(s)!`);

// Copy shared files to all iOS targets
if (fs.existsSync(sharedFilesDir)) {
  console.log('\n📦 Copying shared files to all iOS targets...');
  
  // Get all Swift files from ZentikShared directory
  const sharedFiles = getSharedSwiftFiles(sharedFilesDir);
  
  if (sharedFiles.length === 0) {
    console.log('  ⚠️  No Swift files found in ZentikShared directory');
  } else {
    console.log(`  📁 Found ${sharedFiles.length} shared Swift files`);
  }
  
  const iosTargets = [
    { path: path.join(iosDir, 'ZentikDev'), name: 'iOS App (ZentikDev)', exclude: [] },
    { path: path.join(iosDir, 'ZentikNotificationService'), name: 'Notification Service Extension', exclude: ['CloudKitSyncBridge.swift'] },
    { path: path.join(iosDir, 'ZentikNotificationContentExtension'), name: 'Notification Content Extension', exclude: ['CloudKitSyncBridge.swift'] },
    { path: watchTargetDir, name: 'Watch Target', exclude: ['NotificationActionHandler.swift', 'CloudKitSyncBridge.swift'] },
    { path: path.join(__dirname, '..', 'targets', 'widget'), name: 'Widget Target', exclude: ['NotificationActionHandler.swift', 'CloudKitSyncBridge.swift', 'CloudKitManager.swift'] }
  ];
  
  let totalCopied = 0;
  
  for (const target of iosTargets) {
    if (!fs.existsSync(target.path)) {
      console.log(`  ⚠️  Skipping ${target.name} (directory not found)`);
      continue;
    }
    
    console.log(`\n  📁 ${target.name}:`);
    let copiedFiles = 0;
    let skippedFiles = 0;
    let removedFiles = 0;
    
    // First, remove excluded files if they exist
    if (target.exclude && target.exclude.length > 0) {
      for (const excludedFile of target.exclude) {
        const excludedFilePath = path.join(target.path, excludedFile);
        if (fs.existsSync(excludedFilePath)) {
          fs.unlinkSync(excludedFilePath);
          console.log(`    🗑️  Removed ${excludedFile} from ${target.name}`);
          removedFiles++;
        }
      }
    }
    
    for (const fileName of sharedFiles) {
      // Skip files in the exclude list for this target
      if (target.exclude && target.exclude.includes(fileName)) {
        console.log(`    ⏭️  ${fileName} (skipped - not needed for ${target.name})`);
        skippedFiles++;
        continue;
      }
      
      const sourcePath = path.join(sharedFilesDir, fileName);
      const targetPath = path.join(target.path, fileName);
      
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
        
        // Replace bundle ID placeholder
        let content = fs.readFileSync(targetPath, 'utf-8');
        content = content.replace(/BUNDLE_ID_PLACEHOLDER/g, bundleIdentifier);
        fs.writeFileSync(targetPath, content, 'utf-8');
        
        console.log(`    ✅ ${fileName}`);
        copiedFiles++;
        totalCopied++;
      }
    }
    
    if (skippedFiles > 0 || removedFiles > 0) {
      console.log(`    Total: ${copiedFiles}/${sharedFiles.length} files copied (${skippedFiles} skipped, ${removedFiles} removed)`);
    } else {
      console.log(`    Total: ${copiedFiles}/${sharedFiles.length} files`);
    }
  }
  
  console.log(`\n✅ Successfully copied ${totalCopied} files across all targets!`);

  // Copy CloudKitSyncBridge.m to iOS App only (Objective-C bridge file)
  const cloudkitBridgeM = 'CloudKitSyncBridge.m';
  const cloudkitBridgeMSource = path.join(sharedFilesDir, cloudkitBridgeM);
  const iosAppPath = path.join(iosDir, 'ZentikDev');
  
  if (fs.existsSync(cloudkitBridgeMSource) && fs.existsSync(iosAppPath)) {
    const cloudkitBridgeMDest = path.join(iosAppPath, cloudkitBridgeM);
    fs.copyFileSync(cloudkitBridgeMSource, cloudkitBridgeMDest);
    
    // Replace bundle ID placeholder
    let content = fs.readFileSync(cloudkitBridgeMDest, 'utf-8');
    content = content.replace(/BUNDLE_ID_PLACEHOLDER/g, bundleIdentifier);
    fs.writeFileSync(cloudkitBridgeMDest, content, 'utf-8');
    
    console.log(`\n✅ ${cloudkitBridgeM} copied to iOS App`);
  }
}
