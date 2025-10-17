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

async function addAppExtensionTarget(
  newConfig: ExportedConfigWithProps,
  projectRoot: string,
  targetName: string,
  bundleId: string,
  sourceDir: string,
  mainBundleId: string,
  frameworkTargetName?: string  // Optional framework to link
): Promise<string> {  // Return target UUID
  const pbxProject = newConfig.modResults;

  const existingTargetKey = pbxProject.findTargetKey(targetName);
  if (existingTargetKey) {
    console.log(`Target ${targetName} già presente, salto aggiunta.`);
    return existingTargetKey;
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

  // Link shared framework if provided - using manual approach for custom frameworks
  if (frameworkTargetName) {
    const frameworkTargetKey = pbxProject.findTargetKey(frameworkTargetName);
    
    // Add framework as a dependency first
    if (frameworkTargetKey) {
      pbxProject.addTargetDependency(target.uuid, [frameworkTargetKey]);
    }
    
    // Manually link the framework to this target
    linkCustomFrameworkToTarget(pbxProject, frameworkTargetName, target.uuid, targetName);
    
    console.log(`[${targetName}] ✓ Linked shared framework ${frameworkTargetName}`);
  }

  console.log(`Target ${targetName} creato con bundle identifier ${bundleId}`);
  
  return target.uuid;  // Return the target UUID
}

async function createSharedFrameworkTarget(
  pbxProject: XcodeProject,
  projectRoot: string,
  baseBundleId: string
) {
  const frameworkTargetName = 'ZentikShared';
  const frameworkBundleId = `${baseBundleId}.ZentikShared`;
  
  // Check if framework target already exists
  if (pbxProject.findTargetKey(frameworkTargetName)) {
    console.log(`Framework target ${frameworkTargetName} già presente, salto creazione.`);
    return frameworkTargetName;
  }

  console.log(`[ZentikShared] 📦 Creating shared framework target...`);
  
  // Copy shared Swift files to framework directory
  const iosDir = path.join(projectRoot, 'ios');
  const frameworkSourcePath = path.join(iosDir, frameworkTargetName);
  const pluginDir = path.dirname(__filename);
  const sharedFilesSource = path.join(pluginDir, 'files', 'ZentikShared');
  
  if (!fs.existsSync(frameworkSourcePath)) {
    fs.mkdirSync(frameworkSourcePath, { recursive: true });
  }
  
  // Copy shared Swift files
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
    const destPath = path.join(frameworkSourcePath, file);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`[ZentikShared] ✓ Copied ${file}`);
    }
  }
  
  // Add framework target
  const target = pbxProject.addTarget(frameworkTargetName, 'framework', frameworkTargetName);
  
  // Create the necessary build phases
  pbxProject.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', target.uuid);
  pbxProject.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);
  pbxProject.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);
  
  // Add Swift source files to framework target
  const pbxGroupKey = pbxProject.pbxCreateGroup(frameworkTargetName, frameworkTargetName);
  
  for (const file of sharedFiles) {
    const absPath = path.join(frameworkSourcePath, file);
    pbxProject.addSourceFile(absPath, { target: target.uuid }, pbxGroupKey);
  }
  
  // Configure framework build settings
  const configurations = pbxProject.pbxXCBuildConfigurationSection();
  for (const key in configurations) {
    if (typeof configurations[key].buildSettings !== 'undefined') {
      const buildSettingsObj = configurations[key].buildSettings;
      if (
        typeof buildSettingsObj.PRODUCT_NAME !== 'undefined' &&
        buildSettingsObj.PRODUCT_NAME === `"${frameworkTargetName}"`
      ) {
        // Framework needs a bundle identifier for Info.plist (even if not signed separately)
        buildSettingsObj.PRODUCT_BUNDLE_IDENTIFIER = `"${frameworkBundleId}"`;
        
        buildSettingsObj.SWIFT_VERSION = '5.0';
        buildSettingsObj.TARGETED_DEVICE_FAMILY = '"1,2,4"'; // iPhone, iPad, Apple Watch
        buildSettingsObj.IPHONEOS_DEPLOYMENT_TARGET = '13.4';
        buildSettingsObj.DEFINES_MODULE = 'YES';
        buildSettingsObj.SKIP_INSTALL = 'NO';
        buildSettingsObj.INSTALL_PATH = '"$(LOCAL_LIBRARY_DIR)/Frameworks"';
        buildSettingsObj.DYLIB_INSTALL_NAME_BASE = '"@rpath"';
        buildSettingsObj.LD_RUNPATH_SEARCH_PATHS = '"$(inherited) @executable_path/Frameworks @loader_path/Frameworks"';
        buildSettingsObj.ENABLE_BITCODE = 'NO';
        buildSettingsObj.CLANG_ENABLE_MODULES = 'YES';
        buildSettingsObj.GENERATE_INFOPLIST_FILE = 'YES';
        delete buildSettingsObj.INFOPLIST_FILE;
        
        // Code signing: Use automatic signing like extensions (now that we have App ID registered)
        buildSettingsObj.CODE_SIGN_STYLE = 'Automatic';
        buildSettingsObj.DEVELOPMENT_TEAM = developmentTeam;
        
        // Don't require a provisioning profile specifier (EAS will provide it)
        delete buildSettingsObj.PROVISIONING_PROFILE_SPECIFIER;
        
        // Entitlements for framework
        buildSettingsObj.CODE_SIGN_ENTITLEMENTS = `"${frameworkTargetName}/${frameworkTargetName}.entitlements"`;
        
        // Different optimization levels for Debug/Release
        if (key.includes('Debug')) {
          buildSettingsObj.SWIFT_OPTIMIZATION_LEVEL = '"-Onone"';
        } else if (key.includes('Release')) {
          buildSettingsObj.SWIFT_OPTIMIZATION_LEVEL = '"-O"';
        }
      }
    }
  }
  
  pbxProject.addTargetAttribute('DevelopmentTeam', developmentTeam, frameworkTargetName);
  
  // Create entitlements file for framework
  const entitlementsPath = path.join(iosDir, frameworkTargetName, `${frameworkTargetName}.entitlements`);
  const entitlementsContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.security.application-groups</key>
	<array>
		<string>group.${baseBundleId}</string>
	</array>
	<key>keychain-access-groups</key>
	<array>
		<string>$(AppIdentifierPrefix)${baseBundleId}.keychain</string>
	</array>
</dict>
</plist>`;
  
  fs.writeFileSync(entitlementsPath, entitlementsContent);
  console.log(`[ZentikShared] ✓ Created entitlements file`);
  
  console.log(`[ZentikShared] ✅ Framework target created with bundle identifier ${frameworkBundleId} (automatic signing with App ID)`);
  
  return frameworkTargetName;
}

function addFrameworkToNavigatorGroup(
  pbxProject: XcodeProject,
  frameworkFileRef: string,
  frameworkName: string
) {
  // Find or create the Frameworks group
  let frameworksGroupKey = null;
  
  for (const key in pbxProject.hash.project.objects.PBXGroup) {
    const group = pbxProject.hash.project.objects.PBXGroup[key];
    if (group && group.name === 'Frameworks') {
      frameworksGroupKey = key;
      break;
    }
  }
  
  if (!frameworksGroupKey) {
    // Create Frameworks group if it doesn't exist
    const uuid = pbxProject.generateUuid();
    pbxProject.hash.project.objects.PBXGroup[uuid] = {
      isa: 'PBXGroup',
      children: [],
      name: 'Frameworks',
      sourceTree: '<group>'
    };
    frameworksGroupKey = uuid;
    
    // Add to main group
    const mainGroupKey = pbxProject.hash.project.objects.PBXProject[Object.keys(pbxProject.hash.project.objects.PBXProject)[0]].mainGroup;
    const mainGroup = pbxProject.hash.project.objects.PBXGroup[mainGroupKey];
    if (mainGroup && mainGroup.children) {
      mainGroup.children.push({
        value: uuid,
        comment: 'Frameworks'
      });
    }
  }
  
  const frameworksGroup = pbxProject.hash.project.objects.PBXGroup[frameworksGroupKey];
  
  // Check if framework is already in the group
  const alreadyInGroup = frameworksGroup.children?.some((child: any) => child.value === frameworkFileRef);
  
  if (!alreadyInGroup) {
    if (!frameworksGroup.children) {
      frameworksGroup.children = [];
    }
    frameworksGroup.children.push({
      value: frameworkFileRef,
      comment: frameworkName
    });
    console.log(`[Frameworks] ✓ Added ${frameworkName} to Project Navigator`);
  }
}

function addToEmbedFrameworksPhase(
  pbxProject: XcodeProject,
  targetUuid: string,
  frameworkFileRef: string,
  frameworkName: string,
  targetName: string
) {
  const target = pbxProject.hash.project.objects.PBXNativeTarget[targetUuid];
  if (!target) return;
  
  // Find or create the "Embed Frameworks" copy files build phase
  let embedPhase = null;
  let embedPhaseKey = null;
  
  for (const buildPhaseId of target.buildPhases) {
    const phase = pbxProject.hash.project.objects.PBXCopyFilesBuildPhase?.[buildPhaseId.value];
    if (phase && phase.name === '"Embed Frameworks"' && phase.dstSubfolderSpec === '10') {
      embedPhase = phase;
      embedPhaseKey = buildPhaseId.value;
      break;
    }
  }
  
  if (!embedPhase) {
    // Create new Embed Frameworks phase
    const uuid = pbxProject.generateUuid();
    embedPhaseKey = uuid;
    embedPhase = {
      isa: 'PBXCopyFilesBuildPhase',
      buildActionMask: '2147483647',
      dstPath: '""',
      dstSubfolderSpec: '10', // Frameworks folder
      name: '"Embed Frameworks"',
      runOnlyForDeploymentPostprocessing: '0'
    };
    pbxProject.hash.project.objects.PBXCopyFilesBuildPhase[uuid] = embedPhase;
    
    // Add to target's build phases
    target.buildPhases.push({
      value: uuid,
      comment: 'Embed Frameworks'
    });
  }
  
  // Create a build file for embedding with CodeSignOnCopy attribute
  const embedBuildFileUuid = pbxProject.generateUuid();
  pbxProject.hash.project.objects.PBXBuildFile[embedBuildFileUuid] = {
    isa: 'PBXBuildFile',
    fileRef: frameworkFileRef,
    settings: {
      ATTRIBUTES: ['CodeSignOnCopy', 'RemoveHeadersOnCopy']
    }
  };
  
  // Check if already in embed phase
  const alreadyEmbedded = embedPhase.files?.some((file: any) => {
    const buildFile = pbxProject.hash.project.objects.PBXBuildFile[file.value];
    return buildFile && buildFile.fileRef === frameworkFileRef;
  });
  
  if (!alreadyEmbedded) {
    if (!embedPhase.files) {
      embedPhase.files = [];
    }
    embedPhase.files.push({
      value: embedBuildFileUuid,
      comment: frameworkName
    });
    console.log(`[${targetName}] ✓ Added ${frameworkName} to Embed Frameworks (with CodeSignOnCopy)`);
  }
}

function linkCustomFrameworkToTarget(
  pbxProject: XcodeProject,
  frameworkName: string,
  targetUuid: string,
  targetName: string
) {
  const frameworkPath = `${frameworkName}.framework`;
  const frameworkRef = `${frameworkName}.framework`;
  
  // Find the frameworks build phase for this target
  const target = pbxProject.hash.project.objects.PBXNativeTarget[targetUuid];
  if (!target) {
    console.log(`[${targetName}] ⚠️  Target not found: ${targetUuid}`);
    return;
  }
  
  let frameworksBuildPhase = null;
  for (const buildPhaseId of target.buildPhases) {
    const buildPhase = pbxProject.hash.project.objects.PBXFrameworksBuildPhase[buildPhaseId.value];
    if (buildPhase) {
      frameworksBuildPhase = buildPhase;
      break;
    }
  }
  
  if (!frameworksBuildPhase) {
    console.log(`[${targetName}] ⚠️  Frameworks build phase not found`);
    return;
  }
  
  // Add the framework file reference if it doesn't exist
  let frameworkFileRef = null;
  for (const key in pbxProject.hash.project.objects.PBXFileReference) {
    const fileRef = pbxProject.hash.project.objects.PBXFileReference[key];
    if (fileRef && fileRef.path === frameworkPath && fileRef.sourceTree === 'BUILT_PRODUCTS_DIR') {
      frameworkFileRef = key;
      break;
    }
  }
  
  if (!frameworkFileRef) {
    // Create new file reference
    const uuid = pbxProject.generateUuid();
    pbxProject.hash.project.objects.PBXFileReference[uuid] = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'wrapper.framework',
      name: frameworkRef,
      path: frameworkPath,
      sourceTree: 'BUILT_PRODUCTS_DIR'
    };
    frameworkFileRef = uuid;
  }
  
  // Always try to add to Frameworks group (will check if already added)
  addFrameworkToNavigatorGroup(pbxProject, frameworkFileRef, frameworkRef);
  
  // Create build file for the framework
  const buildFileUuid = pbxProject.generateUuid();
  pbxProject.hash.project.objects.PBXBuildFile[buildFileUuid] = {
    isa: 'PBXBuildFile',
    fileRef: frameworkFileRef
  };
  
  // Add to frameworks build phase if not already there
  if (!frameworksBuildPhase.files) {
    frameworksBuildPhase.files = [];
  }
  
  const alreadyLinked = frameworksBuildPhase.files.some((file: any) => {
    const buildFile = pbxProject.hash.project.objects.PBXBuildFile[file.value];
    return buildFile && buildFile.fileRef === frameworkFileRef;
  });
  
  if (!alreadyLinked) {
    frameworksBuildPhase.files.push({
      value: buildFileUuid,
      comment: frameworkRef
    });
  }
  
  console.log(`[${targetName}] ✓ Added ${frameworkName} to Link Binary With Libraries`);
  
  // Add framework to "Embed Frameworks" build phase
  addToEmbedFrameworksPhase(pbxProject, targetUuid, frameworkFileRef, frameworkRef, targetName);
}

async function linkFrameworkToTargets(
  pbxProject: XcodeProject,
  frameworkTargetName: string,
  targets: Array<{ name: string; uuid: string }>
) {
  console.log(`[ZentikShared] 🔗 Linking framework to targets...`);
  
  const frameworkTargetKey = pbxProject.findTargetKey(frameworkTargetName);
  
  for (const target of targets) {
    try {
      console.log(`[ZentikShared] ✓ Linking to target: ${target.name}`);
      
      // Add framework as a dependency
      if (frameworkTargetKey) {
        pbxProject.addTargetDependency(target.uuid, [frameworkTargetKey]);
      }
      
      // Use our custom linking function
      linkCustomFrameworkToTarget(pbxProject, frameworkTargetName, target.uuid, target.name);
      
      console.log(`[ZentikShared] ✅ Framework linked to ${target.name}`);
    } catch (error) {
      console.log(`[ZentikShared] ⚠️  Error linking to ${target.name}:`, error);
    }
  }
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

    // Create shared framework FIRST, before creating the extension targets
    const frameworkTargetName = await createSharedFrameworkTarget(
      pbxProject,
      projectRoot,
      baseBundleId
    );

    const nseTargetUuid = await addAppExtensionTarget(
      newConfig,
      projectRoot,
      'ZentikNotificationService',
      `${baseBundleId}.notification-service`,
      path.resolve(pluginDir, './files/ZentikNotificationService'),
      baseBundleId,
      frameworkTargetName  // Pass framework name to link it
    );

    const nceTargetUuid = await addAppExtensionTarget(
      newConfig,
      projectRoot,
      'ZentikNotificationContentExtension',
      `${baseBundleId}.notification-content`,
      path.resolve(pluginDir, './files/ZentikNotificationContentExtension'),
      baseBundleId,
      frameworkTargetName  // Pass framework name to link it
    );

    // Get main app target name and UUID
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
    
    const appTargetUuid = pbxProject.findTargetKey(appTargetName);
    console.log(`[ZentikShared] 🔍 App target name: ${appTargetName}, UUID: ${appTargetUuid}`);
    
    if (!appTargetUuid) {
      console.log(`[ZentikShared] ⚠️  Could not find main app target ${appTargetName}`);
    } else {
      // Link framework to main app target only (extensions already linked during creation)
      await linkFrameworkToTargets(
        pbxProject,
        frameworkTargetName,
        [{ name: appTargetName, uuid: appTargetUuid }]
      );
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