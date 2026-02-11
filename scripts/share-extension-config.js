#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const EXCLUDED_NATIVE_MODULES = [
  '@react-native-community/netinfo',
  '@react-native-community/slider',
  '@react-native-vector-icons/material-design-icons',
  'react-native-gesture-handler',
  'react-native-reanimated',
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-worklets',
];

const projectRoot = path.resolve(__dirname, '..');

const configCommand = process.env.EXPO_USE_COMMUNITY_AUTOLINKING === '1'
  ? 'node -e "process.argv=[\'\', \'\', \'config\'];require(\'@react-native-community/cli\').run()"'
  : 'npx expo-modules-autolinking react-native-config --json --platform ios';

const out = execSync(configCommand, {
  encoding: 'utf8',
  stdio: ['pipe', 'pipe', 'ignore'],
  cwd: projectRoot,
});
const config = JSON.parse(out);

const deps = config.dependencies || {};
const filtered = {};
for (const [name, pkg] of Object.entries(deps)) {
  if (!EXCLUDED_NATIVE_MODULES.includes(name)) {
    filtered[name] = pkg;
  }
}
config.dependencies = filtered;

console.log(JSON.stringify(config));
