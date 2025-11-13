import { ConfigPlugin, withDangerousMod, withXcodeProject } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Plugin to add DatabaseAccessBridge support to the iOS app
 * Copies DatabaseAccessBridge files to enable direct SQLite database access from React Native
 * This bridge is always available, independent of Apple Watch pairing status
 */

const databaseAccessBridgeFiles = [
  'DatabaseAccessBridge.swift',
  'DatabaseAccessBridge.m',
];

const withDatabaseAccessBridge: ConfigPlugin = (config) => {
  // First use withXcodeProject to add files to the main app target
  config = withXcodeProject(config, async (newConfig) => {
    const pbxProject = newConfig.modResults;
    const projectRoot = newConfig.modRequest.projectRoot;

    if (!projectRoot) {
      console.warn('💾 [withDatabaseAccessBridge] ⚠️ projectRoot not available');
      return newConfig;
    }

    const iosDir = path.join(projectRoot, 'ios');

    // Find the main app directory
    const entries = fs.readdirSync(iosDir, { withFileTypes: true });
    let appDirName: string | null = null;

    for (const entry of entries) {
      if (entry.isDirectory() &&
        !entry.name.endsWith('.xcodeproj') &&
        !entry.name.endsWith('.xcworkspace') &&
        !entry.name.startsWith('.') &&
        entry.name !== 'Pods' &&
        entry.name !== 'build' &&
        !entry.name.includes('Extension') &&
        !entry.name.includes('Service')) {
        appDirName = entry.name;
        break;
      }
    }

    if (!appDirName) {
      console.warn('💾 [withDatabaseAccessBridge] ⚠️ Main app directory not found');
      return newConfig;
    }

    const appDir = path.join(iosDir, appDirName);

    // Find the main app target
    const mainTargetKey = pbxProject.findTargetKey(appDirName);

    if (!mainTargetKey) {
      console.warn(`💾 [withDatabaseAccessBridge] ⚠️ Main target not found: ${appDirName}`);
      return newConfig;
    }

    // Add files to the project
    const pbxGroupKey = pbxProject.findPBXGroupKey({ name: appDirName });

    for (const file of databaseAccessBridgeFiles) {
      const filePath = path.join(appDir, file);

      if (fs.existsSync(filePath)) {
        // Add file to project
        pbxProject.addSourceFile(
          filePath,
          { target: mainTargetKey },
          pbxGroupKey
        );
        console.log(`💾 [withDatabaseAccessBridge] ✓ Added ${file} to Xcode project`);
      }
    }

    return newConfig;
  });

  // Then use withDangerousMod to copy the files
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const { platformProjectRoot } = config.modRequest;

      console.log('💾 [withDatabaseAccessBridge] Platform project root:', platformProjectRoot);

      // Find the main app directory
      const entries = fs.readdirSync(platformProjectRoot, { withFileTypes: true });
      let appDir: string | null = null;

      for (const entry of entries) {
        if (entry.isDirectory() &&
          !entry.name.endsWith('.xcodeproj') &&
          !entry.name.endsWith('.xcworkspace') &&
          !entry.name.startsWith('.') &&
          entry.name !== 'Pods' &&
          entry.name !== 'build') {

          const possibleAppDelegatePath = path.join(platformProjectRoot, entry.name, 'AppDelegate.swift');
          if (fs.existsSync(possibleAppDelegatePath)) {
            appDir = path.join(platformProjectRoot, entry.name);
            console.log('💾 [withDatabaseAccessBridge] Found app directory:', appDir);
            break;
          }
        }
      }

      if (!appDir) {
        console.warn('💾 [withDatabaseAccessBridge] ⚠️ App directory not found, skipping');
        return config;
      }

      // Copy DatabaseAccessBridge files
      const pluginFilesDir = path.join(__dirname, 'files');

      for (const file of databaseAccessBridgeFiles) {
        const sourcePath = path.join(pluginFilesDir, file);
        const destPath = path.join(appDir, file);

        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, destPath);
          console.log(`💾 [withDatabaseAccessBridge] ✓ Copied ${file}`);
        } else {
          console.warn(`💾 [withDatabaseAccessBridge] ⚠️ File not found: ${file}`);
        }
      }

      console.log('💾 [withDatabaseAccessBridge] ✅ DatabaseAccessBridge files copied successfully');

      return config;
    },
  ]);
};

export default withDatabaseAccessBridge;
