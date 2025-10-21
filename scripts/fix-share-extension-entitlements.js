#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const iosDir = path.join(__dirname, '..', 'ios');
const isDev = process.env.APP_VARIANT === 'development';
const bundleIdentifier = isDev ? 'com.apocaliss92.zentik.dev' : 'com.apocaliss92.zentik';

console.log('🔧 Fixing ShareExtension entitlements...');

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
  </dict>
</plist>`;

  fs.writeFileSync(entitlementsPath, entitlementsContent, 'utf-8');
  
  console.log(`✅ Updated: ${entitlementsFileName}`);
  console.log(`   🔑 Keychain: $(AppIdentifierPrefix)${currentBundleId}.keychain`);
  
  updated++;
}

console.log(`\n✅ Successfully updated ${updated} entitlements file(s)!`);
