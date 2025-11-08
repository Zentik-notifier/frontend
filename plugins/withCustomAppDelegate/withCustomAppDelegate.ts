import { ConfigPlugin, withDangerousMod, withXcodeProject } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Plugin to replace the default AppDelegate with our custom implementation
 * that handles notification actions with full NCE-like functionality
 */

function copySharedFilesToAppDelegate(
  pluginDir: string,
  appDelegateDir: string
) {
  const sharedFilesSource = path.join(pluginDir, '..', 'withIosNotificationExtensions', 'files', 'ZentikShared');
  
  if (!fs.existsSync(sharedFilesSource)) {
    console.log(`[AppDelegate] ⚠️  Shared files directory not found: ${sharedFilesSource}`);
    return;
  }

  const sharedFiles = [
    'KeychainAccess.swift',
    'DatabaseAccess.swift',
    'LoggingSystem.swift',
    'SharedTypes.swift',
    'NotificationActionHandler.swift',
    'MediaAccess.swift',
    'CloudKitModels.swift',
    'CloudKitSyncManager_iOS.swift',
  ];
  
  for (const file of sharedFiles) {
    const sourcePath = path.join(sharedFilesSource, file);
    const destPath = path.join(appDelegateDir, file);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`[AppDelegate] ✓ Copied shared file: ${file}`);
    } else {
      console.log(`[AppDelegate] ⚠️  Shared file not found: ${file}`);
    }
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
    
    // List of shared files to add to the main app target
    const sharedFiles = [
      'KeychainAccess.swift',
      'DatabaseAccess.swift',
      'LoggingSystem.swift',
      'SharedTypes.swift',
      'NotificationActionHandler.swift',
      'MediaAccess.swift',
      'CloudKitModels.swift',
      'CloudKitSyncManager_iOS.swift',
      'CloudKitSyncBridge.swift',
      'CloudKitSyncBridge.m',
    ];
    
    // Find the main app target
    const mainTargetKey = pbxProject.findTargetKey(appDirName);
    
    if (!mainTargetKey) {
      console.warn(`📱 [withCustomAppDelegate] ⚠️ Main target not found: ${appDirName}`);
      return newConfig;
    }
    
    // Add shared files to the project
    const pbxGroupKey = pbxProject.findPBXGroupKey({ name: appDirName });
    
    for (const file of sharedFiles) {
      const filePath = path.join(appDir, file);
      
      if (fs.existsSync(filePath)) {
        // Add file to project
        pbxProject.addSourceFile(
          filePath,
          { target: mainTargetKey },
          pbxGroupKey
        );
        console.log(`[AppDelegate] ✓ Added ${file} to Xcode project`);
      }
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
      
      // Copy CloudKit bridge files from plugin files directory
      const pluginFilesDir = path.join(__dirname, 'files');
      const bridgeFiles = [
        'CloudKitSyncBridge.swift',
        'CloudKitSyncBridge.m',
      ];
      
      for (const file of bridgeFiles) {
        const sourcePath = path.join(pluginFilesDir, file);
        const destPath = path.join(appDelegateDir, file);
        
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, destPath);
          console.log(`[AppDelegate] ✓ Copied bridge file: ${file}`);
        } else {
          console.warn(`[AppDelegate] ⚠️ Bridge file not found: ${file}`);
        }
      }
      
      return config;
    },
  ]);
};

export default withCustomAppDelegate;
