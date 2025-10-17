import { ConfigPlugin, withDangerousMod, IOSConfig } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Plugin to replace the default AppDelegate with our custom implementation
 * that handles notification actions with full NCE-like functionality
 */
const withCustomAppDelegate: ConfigPlugin = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const { platformProjectRoot } = config.modRequest;
      
      // Find the app name from the project
      const pbxprojPath = IOSConfig.Paths.getPBXProjectPath(platformProjectRoot);
      const appName = IOSConfig.XcodeUtils.getProductName(pbxprojPath);
      
      // Path to the existing AppDelegate.swift
      const appDelegateDir = path.join(platformProjectRoot, appName);
      const appDelegatePath = path.join(appDelegateDir, 'AppDelegate.swift');
      
      // Path to our custom AppDelegate
      const customAppDelegatePath = path.join(
        __dirname,
        'files',
        'AppDelegate.swift'
      );
      
      console.log('📱 [withCustomAppDelegate] Replacing AppDelegate...');
      console.log('📱 [withCustomAppDelegate] Source:', customAppDelegatePath);
      console.log('📱 [withCustomAppDelegate] Destination:', appDelegatePath);
      
      // Check if custom AppDelegate exists
      if (!fs.existsSync(customAppDelegatePath)) {
        throw new Error(`Custom AppDelegate not found at: ${customAppDelegatePath}`);
      }
      
      // Read the custom AppDelegate content
      const customAppDelegateContent = fs.readFileSync(customAppDelegatePath, 'utf-8');
      
      // Write it to the project
      fs.writeFileSync(appDelegatePath, customAppDelegateContent);
      
      console.log('📱 [withCustomAppDelegate] ✅ AppDelegate replaced successfully');
      
      return config;
    },
  ]);
};

export default withCustomAppDelegate;
