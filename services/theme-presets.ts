import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { DynamicThemeColors } from './user-settings';

export enum ThemePreset {
  Material3 = 'material3',
  Material3Reverse = 'material3_reverse',
  Blue = 'blue',
  Red = 'red',
  Yellow = 'yellow',
  Green = 'green',
  Custom = 'custom',
}

export interface ThemePresetConfig {
  id: ThemePreset;
  colors: DynamicThemeColors;
}

// Colori di default Material Design 3
const MATERIAL3_LIGHT_COLORS: DynamicThemeColors = {
  primary: MD3LightTheme.colors.primary,
  secondary: MD3LightTheme.colors.secondary,
  tertiary: MD3LightTheme.colors.tertiary,
};

const MATERIAL3_DARK_COLORS: DynamicThemeColors = {
  primary: MD3DarkTheme.colors.primary,
  secondary: MD3DarkTheme.colors.secondary,
  tertiary: MD3DarkTheme.colors.tertiary,
};

// Preset configurations (without names and descriptions - these come from translations)
export const THEME_PRESETS: Record<ThemePreset, ThemePresetConfig> = {
  [ThemePreset.Material3]: {
    id: ThemePreset.Material3,
    colors: MATERIAL3_LIGHT_COLORS,
  },
  [ThemePreset.Material3Reverse]: {
    id: ThemePreset.Material3Reverse,
    colors: MATERIAL3_DARK_COLORS,
  },
  [ThemePreset.Blue]: {
    id: ThemePreset.Blue,
    colors: {
      primary: '#1976D2', // Material Blue 700
      secondary: '#424242', // Grey 800
      tertiary: '#FF4081', // Pink A200
    },
  },
  [ThemePreset.Red]: {
    id: ThemePreset.Red,
    colors: {
      primary: '#D32F2F', // Material Red 700
      secondary: '#424242', // Grey 800
      tertiary: '#00BCD4', // Cyan 500
    },
  },
  [ThemePreset.Yellow]: {
    id: ThemePreset.Yellow,
    colors: {
      primary: '#F57C00', // Material Orange 700
      secondary: '#424242', // Grey 800
      tertiary: '#9C27B0', // Purple 500
    },
  },
  [ThemePreset.Green]: {
    id: ThemePreset.Green,
    colors: {
      primary: '#388E3C', // Material Green 700
      secondary: '#424242', // Grey 800
      tertiary: '#FF5722', // Deep Orange 500
    },
  },
  [ThemePreset.Custom]: {
    id: ThemePreset.Custom,
    colors: {
      primary: '#6750A4',
      secondary: '#625B71',
      tertiary: '#7D5260',
    },
  },
};

// Helper function to get preset by ID
export function getThemePreset(presetId: ThemePreset): ThemePresetConfig {
  return THEME_PRESETS[presetId];
}

// Helper function to get all presets as array
export function getAllThemePresets(): ThemePresetConfig[] {
  return Object.values(THEME_PRESETS);
}

// Helper function to check if a preset is custom
export function isCustomPreset(presetId: ThemePreset): boolean {
  return presetId === ThemePreset.Custom;
}
