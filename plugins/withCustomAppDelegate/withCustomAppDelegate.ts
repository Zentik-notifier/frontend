import { ConfigPlugin, withDangerousMod, withXcodeProject } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Plugin to replace the default AppDelegate with our custom implementation
 * that handles notification actions with full NCE-like functionality
 */

/**
 * Get all Swift files from the ZentikShared directory
 */
function getSharedSwiftFiles(sharedFilesSource: string): string[] {
  if (!fs.existsSync(sharedFilesSource)) {
    return [];
  }

  const entries = fs.readdirSync(sharedFilesSource, { withFileTypes: true });
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.swift'))
    .map(entry => entry.name);
}

function copySharedFilesToAppDelegate(
  pluginDir: string,
  appDelegateDir: string
) {
  const sharedFilesSource = path.join(pluginDir, '..', 'ZentikShared');

  if (!fs.existsSync(sharedFilesSource)) {
    console.log(`[AppDelegate] ⚠️  Shared files directory not found: ${sharedFilesSource}`);
    return;
  }

  // Get all Swift files from ZentikShared directory
  const sharedFiles = getSharedSwiftFiles(sharedFilesSource);

  if (sharedFiles.length === 0) {
    console.log(`[AppDelegate] ⚠️  No Swift files found in: ${sharedFilesSource}`);
    return;
  }

  console.log(`[AppDelegate] 📦 Found ${sharedFiles.length} shared Swift files`);

  for (const file of sharedFiles) {
    const sourcePath = path.join(sharedFilesSource, file);
    const destPath = path.join(appDelegateDir, file);

    fs.copyFileSync(sourcePath, destPath);
    console.log(`[AppDelegate] ✓ Copied shared file: ${file}`);
  }
}

const withCustomAppDelegate: ConfigPlugin = (config) => {
  // First use withXcodeProject to add shared files to the main app target
  config = withXcodeProject(config, async (newConfig) => {
    const pbxProject = newConfig.modResults;
    const projectRoot = newConfig.modRequest.projectRoot;

    if (!projectRoot) {
      console.warn('📱 [withCustomAppDelegate] ⚠️ projectRoot not available');
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
      console.warn('📱 [withCustomAppDelegate] ⚠️ Main app directory not found');
      return newConfig;
    }

    const appDir = path.join(iosDir, appDirName);

    // Find the main app target
    const mainTargetKey = pbxProject.findTargetKey(appDirName);

    if (!mainTargetKey) {
      console.warn(`📱 [withCustomAppDelegate] ⚠️ Main target not found: ${appDirName}`);
      return newConfig;
    }

    // Get all Swift files from ZentikShared directory
    const sharedFilesSource = path.join(projectRoot, 'plugins', 'ZentikShared');
    const sharedFiles = getSharedSwiftFiles(sharedFilesSource);

    // Add all files to the project
    const pbxGroupKey = pbxProject.findPBXGroupKey({ name: appDirName });

    for (const file of sharedFiles) {
      // Use path relative to the app directory (e.g., "ZentikDev/filename.swift")
      const relativeFilePath = `${appDirName}/${file}`;

      // Add file to project
      pbxProject.addSourceFile(
        relativeFilePath,
        { target: mainTargetKey },
        pbxGroupKey
      );
      console.log(`[AppDelegate] ✓ Added ${file} to Xcode project (${relativeFilePath})`);
    }

    return newConfig;
  });

  // Then use withDangerousMod to copy the files
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const { platformProjectRoot } = config.modRequest;

      console.log('📱 [withCustomAppDelegate] Platform project root:', platformProjectRoot);

      // Path to our custom AppDelegate
      const customAppDelegatePath = path.join(
        __dirname,
        'files',
        'AppDelegate.swift'
      );

      // Check if custom AppDelegate exists
      if (!fs.existsSync(customAppDelegatePath)) {
        throw new Error(`Custom AppDelegate not found at: ${customAppDelegatePath}`);
      }

      // Find all subdirectories in the ios folder (excluding build artifacts)
      const entries = fs.readdirSync(platformProjectRoot, { withFileTypes: true });
      let appDelegatePath: string | null = null;

      for (const entry of entries) {
        if (entry.isDirectory() &&
          !entry.name.endsWith('.xcodeproj') &&
          !entry.name.endsWith('.xcworkspace') &&
          !entry.name.startsWith('.') &&
          entry.name !== 'Pods' &&
          entry.name !== 'build') {

          const possibleAppDelegatePath = path.join(platformProjectRoot, entry.name, 'AppDelegate.swift');
          if (fs.existsSync(possibleAppDelegatePath)) {
            appDelegatePath = possibleAppDelegatePath;
            console.log('📱 [withCustomAppDelegate] Found AppDelegate at:', appDelegatePath);
            break;
          }
        }
      }

      if (!appDelegatePath) {
        console.warn('📱 [withCustomAppDelegate] ⚠️ AppDelegate.swift not found yet, skipping replacement');
        return config;
      }

      console.log('📱 [withCustomAppDelegate] Replacing AppDelegate...');
      console.log('📱 [withCustomAppDelegate] Source:', customAppDelegatePath);
      console.log('📱 [withCustomAppDelegate] Destination:', appDelegatePath);

      // Read the custom AppDelegate content
      const customAppDelegateContent = fs.readFileSync(customAppDelegatePath, 'utf-8');

      // Write it to the project
      fs.writeFileSync(appDelegatePath, customAppDelegateContent);

      console.log('📱 [withCustomAppDelegate] ✅ AppDelegate replaced successfully');

      // Copy shared files to the same directory as AppDelegate
      const appDelegateDir = path.dirname(appDelegatePath);
      copySharedFilesToAppDelegate(__dirname, appDelegateDir);

      return config;
    },
  ]);
};

export default withCustomAppDelegate;
