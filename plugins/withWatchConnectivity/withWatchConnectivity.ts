import { ConfigPlugin, withDangerousMod, withXcodeProject } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Plugin to add WatchConnectivity support to the iOS app
 * Copies WatchConnectivityManager and Bridge files to enable communication with Apple Watch
 */

const withWatchConnectivity: ConfigPlugin = (config) => {
  // First use withXcodeProject to add files to the main app target
  config = withXcodeProject(config, async (newConfig) => {
    const pbxProject = newConfig.modResults;
    const projectRoot = newConfig.modRequest.projectRoot;
    
    if (!projectRoot) {
      console.warn('⌚ [withWatchConnectivity] ⚠️ projectRoot not available');
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
      console.warn('⌚ [withWatchConnectivity] ⚠️ Main app directory not found');
      return newConfig;
    }
    
    const appDir = path.join(iosDir, appDirName);
    
    // List of WatchConnectivity files to add
    const watchConnectivityFiles = [
      'WatchConnectivityManager.swift',
      'WatchConnectivityBridge.swift',
      'WatchConnectivityBridge.m',
      'DatabaseAccess.swift', // Needed for WatchConnectivity
    ];
    
    // Find the main app target
    const mainTargetKey = pbxProject.findTargetKey(appDirName);
    
    if (!mainTargetKey) {
      console.warn(`⌚ [withWatchConnectivity] ⚠️ Main target not found: ${appDirName}`);
      return newConfig;
    }
    
    // Add files to the project
    const pbxGroupKey = pbxProject.findPBXGroupKey({ name: appDirName });
    
    for (const file of watchConnectivityFiles) {
      const filePath = path.join(appDir, file);
      
      if (fs.existsSync(filePath)) {
        // Add file to project
        pbxProject.addSourceFile(
          filePath,
          { target: mainTargetKey },
          pbxGroupKey
        );
        console.log(`⌚ [withWatchConnectivity] ✓ Added ${file} to Xcode project`);
      }
    }
    
    return newConfig;
  });
  
  // Then use withDangerousMod to copy the files
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const { platformProjectRoot } = config.modRequest;
      
      console.log('⌚ [withWatchConnectivity] Platform project root:', platformProjectRoot);
      
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
            console.log('⌚ [withWatchConnectivity] Found app directory:', appDir);
            break;
          }
        }
      }
      
      if (!appDir) {
        console.warn('⌚ [withWatchConnectivity] ⚠️ App directory not found, skipping');
        return config;
      }
      
      // Copy WatchConnectivity files
      const pluginFilesDir = path.join(__dirname, 'files');
      const watchConnectivityFiles = [
        'WatchConnectivityManager.swift',
        'WatchConnectivityBridge.swift',
        'WatchConnectivityBridge.m',
      ];
      
      for (const file of watchConnectivityFiles) {
        const sourcePath = path.join(pluginFilesDir, file);
        const destPath = path.join(appDir, file);
        
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, destPath);
          console.log(`⌚ [withWatchConnectivity] ✓ Copied ${file}`);
        } else {
          console.warn(`⌚ [withWatchConnectivity] ⚠️ File not found: ${file}`);
        }
      }
      
      // Copy DatabaseAccess.swift from shared folder (needed for WatchConnectivity)
      const sharedFilesDir = path.join(config.modRequest.projectRoot, 'plugins', 'withIosNotificationExtensions', 'files', 'ZentikShared');
      const databaseAccessSource = path.join(sharedFilesDir, 'DatabaseAccess.swift');
      const databaseAccessDest = path.join(appDir, 'DatabaseAccess.swift');
      
      if (fs.existsSync(databaseAccessSource)) {
        fs.copyFileSync(databaseAccessSource, databaseAccessDest);
        console.log('⌚ [withWatchConnectivity] ✓ Copied DatabaseAccess.swift from shared folder');
      } else {
        console.warn('⌚ [withWatchConnectivity] ⚠️ DatabaseAccess.swift not found in shared folder');
      }
      
      console.log('⌚ [withWatchConnectivity] ✅ WatchConnectivity files copied successfully');
      
      return config;
    },
  ]);
};

export default withWatchConnectivity;

