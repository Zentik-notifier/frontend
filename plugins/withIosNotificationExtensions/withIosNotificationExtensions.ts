import { ConfigPlugin, ExportedConfigWithProps, withXcodeProject } from '@expo/config-plugins';
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

async function addAppExtensionTarget(
  newConfig: ExportedConfigWithProps,
  projectRoot: string,
  targetName: string,
  bundleId: string,
  sourceDir: string,
  mainBundleId: string
) {
  const pbxProject = newConfig.modResults;

  if (pbxProject.findTargetKey(targetName)) {
    console.log(`Target ${targetName} già presente, salto aggiunta.`);
    return;
  }

  const iosDir = path.join(projectRoot, 'ios');
  const destDir = path.join(iosDir, targetName);

  copyDirSync(sourceDir, destDir, mainBundleId);

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
      'Security.framework'
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
}

async function addMainAppFiles(
  newConfig: ExportedConfigWithProps,
  projectRoot: string,
  sourceDir: string,
  mainBundleId: string
) {
  const iosDir = path.join(projectRoot, 'ios');
  
  // Find the main app target directory (should be something like ZentikDev)
  const iosDirEntries = fs.readdirSync(iosDir);
  let appTargetName = 'ZentikDev'; // fallback
  
  for (const entry of iosDirEntries) {
    const entryPath = path.join(iosDir, entry);
    if (fs.statSync(entryPath).isDirectory() && 
        !entry.includes('Extension') && 
        !entry.includes('Service') &&
        !entry.endsWith('.xcodeproj') &&
        !entry.startsWith('.')) {
      appTargetName = entry;
      break;
    }
  }
  
  const destDir = path.join(iosDir, appTargetName);
  
  // Ensure destination directory exists
  if (!fs.existsSync(destDir)) {
    console.log(`Creating main app directory: ${destDir}`);
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Copy files to main app target
  if (fs.existsSync(sourceDir)) {
    const entries = fs.readdirSync(sourceDir);
    for (const file of entries) {
      const srcPath = path.join(sourceDir, file);
      const destPath = path.join(destDir, file);
      
      if (fs.statSync(srcPath).isFile()) {
        // Process file content to replace placeholders
        if (file.endsWith('.swift') || file.endsWith('.m')) {
          let content = fs.readFileSync(srcPath, 'utf8');
          content = content.replace(/\{\{MAIN_BUNDLE_ID\}\}/g, mainBundleId);
          fs.writeFileSync(destPath, content, 'utf8');
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    }
    console.log(`Main app files copied to ${appTargetName}`);
  } else {
    console.log(`Source directory ${sourceDir} does not exist, skipping main app files`);
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

    // Copy main app files (native modules)
    await addMainAppFiles(
      newConfig,
      projectRoot,
      path.resolve(pluginDir, './files/ZentikDev'),
      baseBundleId
    );

    await addAppExtensionTarget(
      newConfig,
      projectRoot,
      'ZentikNotificationService',
      `${baseBundleId}.notification-service`,
      path.resolve(pluginDir, './files/ZentikNotificationService'),
      baseBundleId
    );

    await addAppExtensionTarget(
      newConfig,
      projectRoot,
      'ZentikNotificationContentExtension',
      `${baseBundleId}.notification-content`,
      path.resolve(pluginDir, './files/ZentikNotificationContentExtension'),
      baseBundleId
    );

    return newConfig;
  });
};

export default withZentikNotificationExtensions;