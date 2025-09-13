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

function ensureGroup(pbxProject: any, name: string) {
  const groups = pbxProject.hash.project.objects.PBXGroup;
  for (const key in groups) {
    const g = groups[key];
    if (g && g.name === name) return key;
  }
  return pbxProject.pbxCreateGroup(name, name);
}

function addFilesToTarget(pbxProject: any, targetUuid: string, targetName: string, dir: string) {
  const groupKey = ensureGroup(pbxProject, targetName);
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const abs = path.join(dir, file);
    if (fs.statSync(abs).isDirectory()) continue;
    if (file.endsWith('.swift')) {
      pbxProject.addSourceFile(abs, { target: targetUuid }, groupKey);
    } else if (file.endsWith('.storyboard') || file.endsWith('.plist')) {
      pbxProject.addFile(abs, groupKey, { target: targetUuid });
    } else if (file.endsWith('.entitlements')) {
      pbxProject.addFile(abs, groupKey);
    }
  }
}

function configureBuildSettings(pbxProject: any, targetName: string, settings: Record<string,string>) {
  const configs = pbxProject.pbxXCBuildConfigurationSection();
  for (const key in configs) {
    const cfg = configs[key];
    if (cfg.buildSettings && cfg.buildSettings.PRODUCT_NAME === `"${targetName}"`) {
      Object.assign(cfg.buildSettings, settings);
    }
  }
}

function addWatchTargets(
  newConfig: ExportedConfigWithProps,
  projectRoot: string,
  baseBundleId: string,
  pluginDir: string
) {
  const pbxProject = newConfig.modResults;
  const iosDir = path.join(projectRoot, 'ios');

  const watchAppName = 'ZentikWatchApp';
  const watchExtName = 'ZentikWatchExtension';
  let watchAppTargetUuid = pbxProject.findTargetKey(watchAppName);
  let watchExtTargetUuid = pbxProject.findTargetKey(watchExtName);

  const watchAppSrc = path.resolve(pluginDir, './files/ZentikWatchApp');
  const watchExtSrc = path.resolve(pluginDir, './files/ZentikWatchExtension');

  // Always ensure sources exist (idempotent copy)
  copyDirSync(watchAppSrc, path.join(iosDir, watchAppName), baseBundleId);
  copyDirSync(watchExtSrc, path.join(iosDir, watchExtName), baseBundleId);

  // Create targets if missing
  if (!watchAppTargetUuid) {
    const watchAppTarget = pbxProject.addTarget(watchAppName, 'watch_app', watchAppName);
    watchAppTargetUuid = watchAppTarget.uuid;
    pbxProject.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', watchAppTargetUuid);
    pbxProject.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', watchAppTargetUuid);
    pbxProject.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', watchAppTargetUuid);
  }
  if (!watchExtTargetUuid) {
    const watchExtTarget = pbxProject.addTarget(watchExtName, 'watch_extension', watchExtName);
    watchExtTargetUuid = watchExtTarget.uuid;
    pbxProject.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', watchExtTargetUuid);
    pbxProject.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', watchExtTargetUuid);
    pbxProject.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', watchExtTargetUuid);
  }

  addFilesToTarget(pbxProject, watchAppTargetUuid, watchAppName, path.join(iosDir, watchAppName));
  addFilesToTarget(pbxProject, watchExtTargetUuid, watchExtName, path.join(iosDir, watchExtName));

  // Fix product types to watchOS 2 variants even if they already existed
  const nativeTargets = pbxProject.hash.project.objects.PBXNativeTarget;
  if (nativeTargets[watchAppTargetUuid]) {
    nativeTargets[watchAppTargetUuid].productType = '"com.apple.product-type.application.watchapp2"';
  }
  if (nativeTargets[watchExtTargetUuid]) {
    nativeTargets[watchExtTargetUuid].productType = '"com.apple.product-type.watchkit2-extension"';
  }

  configureBuildSettings(pbxProject, watchAppName, {
    CLANG_ENABLE_MODULES: 'YES',
    INFOPLIST_FILE: `"${watchAppName}/Info.plist"`,
    CODE_SIGN_STYLE: 'Automatic',
    DEVELOPMENT_TEAM: developmentTeam,
    PRODUCT_BUNDLE_IDENTIFIER: `"${baseBundleId}.watchapp"`,
    TARGETED_DEVICE_FAMILY: '"4"',
    WATCHOS_DEPLOYMENT_TARGET: '7.0',
    SDKROOT: 'watchos',
    SKIP_INSTALL: 'YES',
    SWIFT_VERSION: '5.0'
  });

  configureBuildSettings(pbxProject, watchExtName, {
    CLANG_ENABLE_MODULES: 'YES',
    INFOPLIST_FILE: `"${watchExtName}/Info.plist"`,
    CODE_SIGN_STYLE: 'Automatic',
    DEVELOPMENT_TEAM: developmentTeam,
    PRODUCT_BUNDLE_IDENTIFIER: `"${baseBundleId}.watchkitapp.extension"`,
    TARGETED_DEVICE_FAMILY: '"4"',
    WATCHOS_DEPLOYMENT_TARGET: '7.0',
    SDKROOT: 'watchos',
    SKIP_INSTALL: 'YES',
    SWIFT_VERSION: '5.0'
  });

  // Link frameworks to extension
  const frameworks = [
    'UserNotifications.framework',
    'UserNotificationsUI.framework',
    'WatchKit.framework',
    'Foundation.framework',
    'UIKit.framework',
    'SwiftUI.framework'
  ];
  if (watchExtTargetUuid) {
    frameworks.forEach(fw => {
      pbxProject.addFramework(`System/Library/Frameworks/${fw}`, { target: watchExtTargetUuid });
    });
  }

  console.log('Allineati/Creati target WatchApp + WatchExtension (watchOS 2)');
}

const withAppleWatchNotificationExtension: ConfigPlugin = (config) => {
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

  // Rimuovi eventuale vecchia cartella singolo target legacy (non tocchiamo project se già generato)
  // Aggiungi nuova struttura duale
  addWatchTargets(newConfig, projectRoot, baseBundleId, pluginDir);

    return newConfig;
  });
};

export default withAppleWatchNotificationExtension;
