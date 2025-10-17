import {
  ConfigPlugin,
  withXcodeProject,
  IOSConfig,
} from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Expo Config Plugin: withZentikShared
 * 
 * Configures a shared iOS framework (ZentikShared) containing common code
 * for NSE, NCE, and AppDelegate to eliminate code duplication.
 * 
 * Features:
 * - Creates ZentikShared.framework target in Xcode project
 * - Links framework to NSE, NCE, and main app targets
 * - Copies shared Swift files to framework directory
 * - Configures build settings and dependencies
 */
const withZentikShared: ConfigPlugin = (config) => {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const projectName = config.modRequest.projectName || 'ZentikDev';
    const bundleIdentifier = config.ios?.bundleIdentifier || 'com.apocaliss92.zentik.dev';

    console.log('[withZentikShared] 🚀 Configuring ZentikShared framework...');

    // Step 1: Create framework target
    const frameworkTargetName = 'ZentikShared';
    const frameworkBundleId = `${bundleIdentifier}.ZentikShared`;
    
    // Check if framework target already exists
    let frameworkTarget = xcodeProject.getTarget(frameworkTargetName);
    
    if (!frameworkTarget) {
      console.log('[withZentikShared] 📦 Creating framework target...');
      
      // Add framework target
      frameworkTarget = xcodeProject.addTarget(
        frameworkTargetName,
        'framework',
        frameworkTargetName,
        bundleIdentifier
      );

      // Set framework build settings
      const frameworkBuildSettings = {
        PRODUCT_NAME: frameworkTargetName,
        PRODUCT_BUNDLE_IDENTIFIER: frameworkBundleId,
        SWIFT_VERSION: '5.0',
        TARGETED_DEVICE_FAMILY: '1,2,4', // iPhone, iPad, Apple Watch
        IPHONEOS_DEPLOYMENT_TARGET: '13.4',
        DEFINES_MODULE: 'YES',
        SKIP_INSTALL: 'YES',
        INSTALL_PATH: '$(LOCAL_LIBRARY_DIR)/Frameworks',
        LD_RUNPATH_SEARCH_PATHS: '$(inherited) @executable_path/Frameworks @loader_path/Frameworks',
        ENABLE_BITCODE: 'NO',
      };

      xcodeProject.addBuildProperty('PRODUCT_NAME', frameworkTargetName, frameworkTarget.uuid);
      xcodeProject.addBuildProperty('PRODUCT_BUNDLE_IDENTIFIER', frameworkBundleId, frameworkTarget.uuid);
      xcodeProject.addBuildProperty('SWIFT_VERSION', '5.0', frameworkTarget.uuid);
      xcodeProject.addBuildProperty('TARGETED_DEVICE_FAMILY', '1,2,4', frameworkTarget.uuid);
      xcodeProject.addBuildProperty('IPHONEOS_DEPLOYMENT_TARGET', '13.4', frameworkTarget.uuid);
      xcodeProject.addBuildProperty('DEFINES_MODULE', 'YES', frameworkTarget.uuid);

      console.log('[withZentikShared] ✅ Framework target created');
    } else {
      console.log('[withZentikShared] ✓ Framework target already exists');
    }

    // Step 2: Copy framework source files
    const iosProjectPath = config.modRequest.platformProjectRoot;
    const frameworkSourcePath = path.join(iosProjectPath, frameworkTargetName);
    
    if (!fs.existsSync(frameworkSourcePath)) {
      fs.mkdirSync(frameworkSourcePath, { recursive: true });
      console.log('[withZentikShared] 📁 Created framework directory');
    }

    // Copy shared Swift files from plugin
    const pluginFilesPath = path.join(__dirname, 'files');
    const sharedFiles = [
      'KeychainAccess.swift',
      'DatabaseAccess.swift',
      'LoggingSystem.swift',
      'SharedTypes.swift',
    ];

    for (const file of sharedFiles) {
      const sourcePath = path.join(pluginFilesPath, file);
      const destPath = path.join(frameworkSourcePath, file);
      
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        
        // Add file to Xcode project if not already added
        const fileRef = xcodeProject.addSourceFile(
          `${frameworkTargetName}/${file}`,
          {},
          frameworkTarget.uuid
        );
        
        console.log(`[withZentikShared] ✓ Copied ${file}`);
      }
    }

    // Step 3: Link framework to NSE, NCE, and main app
    const targetNames = [
      projectName, // Main app
      'ZentikNotificationServiceExtension',
      'ZentikNotificationContentExtension',
    ];

    for (const targetName of targetNames) {
      const target = xcodeProject.getTarget(targetName);
      if (target) {
        // Add framework to target's frameworks build phase
        const frameworkPath = `${frameworkTargetName}.framework`;
        
        // Add framework file reference if not exists
        const frameworkFileRef = xcodeProject.addFramework(frameworkPath, {
          target: target.uuid,
          link: true,
          embed: true,
        });

        // Add framework to "Embed Frameworks" build phase
        const embedFrameworksBuildPhase = xcodeProject.addBuildPhase(
          [],
          'PBXCopyFilesBuildPhase',
          'Embed Frameworks',
          target.uuid,
          'frameworks'
        );

        if (embedFrameworksBuildPhase && frameworkFileRef) {
          xcodeProject.addToPbxCopyfilesBuildPhase(frameworkFileRef);
        }

        console.log(`[withZentikShared] ✓ Linked framework to ${targetName}`);
      }
    }

    // Step 4: Add App Group capability (required for shared database/keychain)
    const appGroupId = `group.${bundleIdentifier}`;
    
    for (const targetName of targetNames) {
      const target = xcodeProject.getTarget(targetName);
      if (target) {
        xcodeProject.addBuildProperty(
          'com.apple.security.application-groups',
          appGroupId,
          target.uuid
        );
      }
    }

    console.log('[withZentikShared] ✅ ZentikShared framework configuration completed');

    return config;
  });
};

export default withZentikShared;
