import { ConfigPlugin, ExportedConfigWithProps, withXcodeProject, XcodeProject } from '@expo/config-plugins';
import fs from 'fs';
import path from 'path';

const developmentTeam = 'C3F24V5NS5';

function copyDirSync(src: string, dest: string, mainBundleId?: string) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath, mainBundleId);
    } else if (entry.isFile()) {
      // Copy and process file content if mainBundleId is provided
      if (mainBundleId && (entry.name.endsWith('.swift') || entry.name.endsWith('.entitlements'))) {
        let content = fs.readFileSync(srcPath, 'utf8');
        content = content.replace(/\{\{MAIN_BUNDLE_ID\}\}/g, mainBundleId);
        fs.writeFileSync(destPath, content, 'utf8');
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

function copySharedFilesToTarget(
  pluginDir: string,
  targetDir: string,
  targetName: string
) {
  const sharedFilesSource = path.join(pluginDir, '..', 'ZentikShared');

  if (!fs.existsSync(sharedFilesSource)) {
    console.log(`[${targetName}] ⚠️  Shared files directory not found: ${sharedFilesSource}`);
    return;
  }

  const sharedFiles = [
    'KeychainAccess.swift',
    'DatabaseAccess.swift',
    'LoggingSystem.swift',
    'SharedTypes.swift',
    'NotificationActionHandler.swift',
    'MediaAccess.swift',
  ];

  for (const file of sharedFiles) {
    const sourcePath = path.join(sharedFilesSource, file);
    const destPath = path.join(targetDir, file);

    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`[${targetName}] ✓ Copied shared file: ${file}`);
    } else {
      console.log(`[${targetName}] ⚠️  Shared file not found: ${file}`);
    }
  }
}

async function addAppExtensionTarget(
  newConfig: ExportedConfigWithProps,
  projectRoot: string,
  targetName: string,
  bundleId: string,
  sourceDir: string,
  mainBundleId: string,
  pluginDir: string
): Promise<string> {  // Return target UUID
  const pbxProject = newConfig.modResults;

  const existingTargetKey = pbxProject.findTargetKey(targetName);
  if (existingTargetKey) {
    console.log(`Target ${targetName} già presente, salto aggiunta.`);
    return existingTargetKey;
  }

  const iosDir = path.join(projectRoot, 'ios');
  const destDir = path.join(iosDir, targetName);

  // Copy target-specific files
  copyDirSync(sourceDir, destDir, mainBundleId);

  // Copy shared files into the target directory
  copySharedFilesToTarget(pluginDir, destDir, targetName);

  const target = pbxProject.addTarget(targetName, 'app_extension', targetName);
  pbxProject.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', target.uuid);
  pbxProject.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);
  pbxProject.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);

  const entries = fs.readdirSync(destDir);
  for (const file of entries) {
    const absPath = path.join(destDir, file);
    const pbxGroupKey = pbxProject.pbxCreateGroup(targetName, targetName);
    if (file.endsWith('.plist')) {
      pbxProject.addFile(absPath, pbxGroupKey);
    } else {
      pbxProject.addSourceFile(
        absPath,
        { target: target.uuid },
        pbxGroupKey
      );
    }
  }

  const configurations = pbxProject.pbxXCBuildConfigurationSection();
  for (const key in configurations) {
    if (typeof configurations[key].buildSettings !== 'undefined') {
      const buildSettingsObj = configurations[key].buildSettings;
      if (
        typeof buildSettingsObj.PRODUCT_NAME !== 'undefined' &&
        buildSettingsObj.PRODUCT_NAME === `"${targetName}"`
      ) {
        buildSettingsObj.CLANG_ENABLE_MODULES = 'YES';
        buildSettingsObj.INFOPLIST_FILE = `"${targetName}/Info.plist"`;
        buildSettingsObj.CODE_SIGN_STYLE = 'Automatic';
        buildSettingsObj.CODE_SIGN_ALLOW_ENTITLEMENTS_MODIFICATION = 'YES';
        // Ensure the target uses its entitlements file if present
        const entitlementsPath = `${targetName}/${targetName}.entitlements`;
        if (fs.existsSync(path.join(destDir, `${targetName}.entitlements`))) {
          buildSettingsObj.CODE_SIGN_ENTITLEMENTS = `"${entitlementsPath}"`;
        }
        buildSettingsObj.CURRENT_PROJECT_VERSION = `"${newConfig.ios?.buildNumber}"`;
        buildSettingsObj.GENERATE_INFOPLIST_FILE = 'YES';
        buildSettingsObj.MARKETING_VERSION = `"${newConfig.version}"`;
        buildSettingsObj.PRODUCT_BUNDLE_IDENTIFIER = `"${newConfig.ios?.bundleIdentifier}.${targetName}"`;
        buildSettingsObj.SWIFT_EMIT_LOC_STRINGS = 'YES';
        buildSettingsObj.SWIFT_VERSION = '5.0';
        buildSettingsObj.TARGETED_DEVICE_FAMILY = '"1,2"';
        buildSettingsObj.DEVELOPMENT_TEAM = developmentTeam;
      }
    }
  }

  pbxProject.addTargetAttribute('DevelopmentTeam', developmentTeam, targetName);
  pbxProject.addTargetAttribute('DevelopmentTeam', developmentTeam);

  // Link required system frameworks (especially for Content Extension)
  const frameworksToLink: string[] = [];
  if (targetName === 'ZentikNotificationContentExtension') {
    frameworksToLink.push(
      'UserNotificationsUI.framework',
      'UserNotifications.framework',
      'AVKit.framework',
      'AVFoundation.framework',
      'Security.framework'
    );
  } else if (targetName === 'ZentikNotificationService') {
    frameworksToLink.push(
      'UserNotifications.framework',
      'Security.framework',
      'Intents.framework'
    );
  }

  for (const fw of frameworksToLink) {
    // Link from SDKROOT System/Library/Frameworks
    pbxProject.addFramework(
      `System/Library/Frameworks/${fw}`,
      {
        target: target.uuid,
      }
    );
  }

  console.log(`Target ${targetName} creato con bundle identifier ${bundleId}`);

  return target.uuid;  // Return the target UUID
}

async function addCommunicationNotificationsCapability(
  pbxProject: XcodeProject,
  projectRoot: string,
  targetName: string
) {
  try {
    // Find the main app target
    const targets = pbxProject.hash.project.objects.PBXNativeTarget;
    let mainTarget = null;

    for (const targetId in targets) {
      const target = targets[targetId];
      if (target.name === targetName) {
        mainTarget = target;
        break;
      }
    }

    if (!mainTarget) {
      console.log(`Target ${targetName} not found, skipping Communication Notifications capability`);
      return;
    }

    // Add Communication Notifications capability
    const entitlementsPath = path.join(projectRoot, 'ios', targetName, `${targetName}.entitlements`);

    let entitlements = '';
    let fileExists = fs.existsSync(entitlementsPath);

    if (fileExists) {
      // Read existing entitlements
      entitlements = fs.readFileSync(entitlementsPath, 'utf8');
    } else {
      // Create basic entitlements file
      entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
</dict>
</plist>`;
      console.log(`Created entitlements file for ${targetName}`);
    }

    // Add Communication Notifications capability if not already present
    if (!entitlements.includes('com.apple.developer.usernotifications.communication')) {
      // Find the closing </dict> tag and add the capability before it
      const capabilityEntry = `    <key>com.apple.developer.usernotifications.communication</key>
    <true/>
`;

      if (entitlements.includes('</dict>')) {
        entitlements = entitlements.replace('</dict>', `${capabilityEntry}</dict>`);
        fs.writeFileSync(entitlementsPath, entitlements, 'utf8');
        console.log(`Added Communication Notifications capability to ${targetName}`);
      }
    } else {
      console.log(`Communication Notifications capability already present in ${targetName}`);
    }
  } catch (error) {
    console.log(`Error adding Communication Notifications capability: ${error}`);
  }
}

const withZentikNotificationExtensions: ConfigPlugin = (config) => {
  return withXcodeProject(config, async (newConfig) => {
    if (!newConfig.modRequest.projectRoot) {
      throw new Error('projectRoot mancante in modRequest.');
    }
    const pbxProject = newConfig.modResults;
    const projectRoot = newConfig.modRequest.projectRoot;

    const projObjects = pbxProject.hash.project.objects;
    projObjects.PBXTargetDependency = projObjects.PBXTargetDependency || {};
    projObjects.PBXContainerItemProxy = projObjects.PBXTargetDependency || {};

    const pluginDir = path.dirname(__filename);

    const baseBundleId = config.ios?.bundleIdentifier ?? 'com.apocaliss92.zentik';

    // Create extension targets with shared files copied directly into them
    const nseTargetUuid = await addAppExtensionTarget(
      newConfig,
      projectRoot,
      'ZentikNotificationService',
      `${baseBundleId}.notification-service`,
      path.resolve(pluginDir, './files/ZentikNotificationService'),
      baseBundleId,
      pluginDir
    );

    const nceTargetUuid = await addAppExtensionTarget(
      newConfig,
      projectRoot,
      'ZentikNotificationContentExtension',
      `${baseBundleId}.notification-content`,
      path.resolve(pluginDir, './files/ZentikNotificationContentExtension'),
      baseBundleId,
      pluginDir
    );

    // Get main app target name
    const iosDir = path.join(projectRoot, 'ios');
    const entries = fs.readdirSync(iosDir);
    let appTargetName = 'Runner'; // Default fallback

    for (const entry of entries) {
      if (fs.statSync(path.join(iosDir, entry)).isDirectory() &&
        !entry.includes('Extension') &&
        !entry.includes('Service') &&
        !entry.endsWith('.xcodeproj') &&
        !entry.startsWith('.')) {
        appTargetName = entry;
        break;
      }
    }

    // Add Communication Notifications capability to main app target
    await addCommunicationNotificationsCapability(
      pbxProject,
      projectRoot,
      appTargetName
    );

    return newConfig;
  });
};

export default withZentikNotificationExtensions;