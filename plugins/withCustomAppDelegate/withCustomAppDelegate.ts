import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
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
      
      return config;
    },
  ]);
};

export default withCustomAppDelegate;
