import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { DynamicThemeColors } from './user-settings';
import { ColorScheme } from '@/hooks/useTheme';

export enum ThemePreset {
  Material3 = 'material3',
  Blue = 'blue',
  Red = 'red',
  Yellow = 'yellow',
  Green = 'green',
  Terra = 'terra',
  HighTech = 'hightech',
  Pastel = 'pastel',
  Minimal = 'minimal',
  Custom = 'custom',
}

export interface ThemePresetConfig {
  id: ThemePreset;
  light: DynamicThemeColors;
  dark: DynamicThemeColors;
}

export const THEME_PRESETS: Record<ThemePreset, ThemePresetConfig> = {
  [ThemePreset.Material3]: {
    id: ThemePreset.Material3,
    light: MD3LightTheme.colors,
    dark: MD3DarkTheme.colors,
  },
  [ThemePreset.Blue]: {
    id: ThemePreset.Blue,
    light: {
      primary: '#1976D2',
      secondary: '#424242',
      tertiary: '#FF4081',
    },
    dark: {
      primary: '#90CAF9',
      secondary: '#BDBDBD',
      tertiary: '#F8BBD9',
    },
  },
  [ThemePreset.Red]: {
    id: ThemePreset.Red,
    light: {
      primary: '#D32F2F',
      secondary: '#424242',
      tertiary: '#00BCD4',
    },
    dark: {
      primary: '#EF5350',
      secondary: '#BDBDBD',
      tertiary: '#80DEEA',
    },
  },
  [ThemePreset.Yellow]: {
    id: ThemePreset.Yellow,
    light: {
      primary: '#F57C00',
      secondary: '#424242',
      tertiary: '#9C27B0',
    },
    dark: {
      primary: '#FFB74D',
      secondary: '#BDBDBD',
      tertiary: '#CE93D8',
    },
  },
  [ThemePreset.Green]: {
    id: ThemePreset.Green,
    light: {
      primary: '#388E3C',
      secondary: '#424242',
      tertiary: '#FF5722',
    },
    dark: {
      primary: '#81C784',
      secondary: '#BDBDBD',
      tertiary: '#FFAB91',
    },
  },

  [ThemePreset.Terra]: {
    id: ThemePreset.Terra,
    light: {
      primary: '#A0522D',
      secondary: '#D2B48C',
      tertiary: '#6B8E23',
    },
    dark: {
      primary: '#E9967A',
      secondary: '#FFE4B5',
      tertiary: '#98FB98',
    },
  },

  [ThemePreset.HighTech]: {
    id: ThemePreset.HighTech,
    light: {
      primary: '#2962FF',
      secondary: '#455A64',
      tertiary: '#FFAB00',
    },
    dark: {
      primary: '#82B1FF',
      secondary: '#90A4AE',
      tertiary: '#FFD740',
    },
  },
  [ThemePreset.Pastel]: {
    id: ThemePreset.Pastel,
    light: {
      primary: '#F48FB1',
      secondary: '#CE93D8',
      tertiary: '#80CBC4',
    },
    dark: {
      primary: '#F8BBD0',
      secondary: '#E1BEE7',
      tertiary: '#B2DFDB',
    },
  },

  [ThemePreset.Minimal]: {
    id: ThemePreset.Minimal,
    light: {
      primary: '#212121',
      secondary: '#FAFAFA',
      tertiary: '#D32F2F',
    },
    dark: {
      primary: '#E0E0E0',
      secondary: '#121212',
      tertiary: '#EF5350',
    },
  },

  [ThemePreset.Custom]: {
    id: ThemePreset.Custom,
    light: {
      primary: '#6750A4',
      secondary: '#625B71',
      tertiary: '#7D5260',
    },
    dark: {
      primary: '#D0BCFF',
      secondary: '#CCC2DC',
      tertiary: '#EFB8C8',
    },
  },
};

export function getThemePreset(presetId: ThemePreset): ThemePresetConfig {
  return THEME_PRESETS[presetId];
}

export function getPresetColors(presetId: ThemePreset, colorScheme: ColorScheme): DynamicThemeColors {
  const preset = THEME_PRESETS[presetId];
  return colorScheme === 'dark' ? preset.dark : preset.light;
}

export function getAllThemePresets(): ThemePresetConfig[] {
  return Object.values(THEME_PRESETS);
}

export function isCustomPreset(presetId: ThemePreset): boolean {
  return presetId === ThemePreset.Custom;
}
