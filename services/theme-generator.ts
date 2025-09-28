import { argbFromHex, themeFromSourceColor } from '@material/material-color-utilities';

export interface DynamicThemeColors {
  primary: string;
  secondary: string;
  tertiary: string;
}

export interface GeneratedTheme {
  light: {
    primary: string;
    onPrimary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    secondary: string;
    onSecondary: string;
    secondaryContainer: string;
    onSecondaryContainer: string;
    tertiary: string;
    onTertiary: string;
    tertiaryContainer: string;
    onTertiaryContainer: string;
    error: string;
    onError: string;
    errorContainer: string;
    onErrorContainer: string;
    background: string;
    onBackground: string;
    surface: string;
    onSurface: string;
    surfaceVariant: string;
    onSurfaceVariant: string;
    outline: string;
    shadow: string;
    inverseSurface: string;
    inverseOnSurface: string;
    inversePrimary: string;
    elevation: {
      level0: string;
      level1: string;
      level2: string;
      level3: string;
      level4: string;
      level5: string;
    };
  };
  dark: {
    primary: string;
    onPrimary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    secondary: string;
    onSecondary: string;
    secondaryContainer: string;
    onSecondaryContainer: string;
    tertiary: string;
    onTertiary: string;
    tertiaryContainer: string;
    onTertiaryContainer: string;
    error: string;
    onError: string;
    errorContainer: string;
    onErrorContainer: string;
    background: string;
    onBackground: string;
    surface: string;
    onSurface: string;
    surfaceVariant: string;
    onSurfaceVariant: string;
    outline: string;
    shadow: string;
    inverseSurface: string;
    inverseOnSurface: string;
    inversePrimary: string;
    elevation: {
      level0: string;
      level1: string;
      level2: string;
      level3: string;
      level4: string;
      level5: string;
    };
  };
}

/**
 * Converte un colore ARGB in formato HEX
 */
function hexFromArgb(argb: number): string {
  const hex = argb.toString(16).padStart(8, '0');
  return `#${hex.slice(2)}`; // Rimuove il canale alpha e aggiunge #
}

/**
 * Genera un tema completo basato su 3 colori di input
 */
export function generateDynamicTheme(colors: DynamicThemeColors): GeneratedTheme {
  try {
    // Converti i colori HEX in ARGB
    const primaryArgb = argbFromHex(colors.primary);
    const secondaryArgb = argbFromHex(colors.secondary);
    const tertiaryArgb = argbFromHex(colors.tertiary);

    // Genera il tema usando Material Color Utilities
    const theme = themeFromSourceColor(primaryArgb, [
      { name: 'secondary', value: secondaryArgb, blend: true },
      { name: 'tertiary', value: tertiaryArgb, blend: true },
    ]);

    // Estrai i colori per il tema light
    const lightScheme = theme.schemes.light;
    const darkScheme = theme.schemes.dark;

    return {
      light: {
        primary: hexFromArgb(lightScheme.primary),
        onPrimary: hexFromArgb(lightScheme.onPrimary),
        primaryContainer: hexFromArgb(lightScheme.primaryContainer),
        onPrimaryContainer: hexFromArgb(lightScheme.onPrimaryContainer),
        secondary: hexFromArgb(lightScheme.secondary),
        onSecondary: hexFromArgb(lightScheme.onSecondary),
        secondaryContainer: hexFromArgb(lightScheme.secondaryContainer),
        onSecondaryContainer: hexFromArgb(lightScheme.onSecondaryContainer),
        tertiary: hexFromArgb(lightScheme.tertiary),
        onTertiary: hexFromArgb(lightScheme.onTertiary),
        tertiaryContainer: hexFromArgb(lightScheme.tertiaryContainer),
        onTertiaryContainer: hexFromArgb(lightScheme.onTertiaryContainer),
        error: hexFromArgb(lightScheme.error),
        onError: hexFromArgb(lightScheme.onError),
        errorContainer: hexFromArgb(lightScheme.errorContainer),
        onErrorContainer: hexFromArgb(lightScheme.onErrorContainer),
        background: hexFromArgb(lightScheme.background),
        onBackground: hexFromArgb(lightScheme.onBackground),
        surface: hexFromArgb(lightScheme.surface),
        onSurface: hexFromArgb(lightScheme.onSurface),
        surfaceVariant: hexFromArgb(lightScheme.surfaceVariant),
        onSurfaceVariant: hexFromArgb(lightScheme.onSurfaceVariant),
        outline: hexFromArgb(lightScheme.outline),
        shadow: hexFromArgb(lightScheme.shadow),
        inverseSurface: hexFromArgb(lightScheme.inverseSurface),
        inverseOnSurface: hexFromArgb(lightScheme.inverseOnSurface),
        inversePrimary: hexFromArgb(lightScheme.inversePrimary),
        elevation: {
          level0: hexFromArgb(lightScheme.surface),
          level1: hexFromArgb(lightScheme.surface),
          level2: hexFromArgb(lightScheme.surface),
          level3: hexFromArgb(lightScheme.surface),
          level4: hexFromArgb(lightScheme.surface),
          level5: hexFromArgb(lightScheme.surface),
        },
      },
      dark: {
        primary: hexFromArgb(darkScheme.primary),
        onPrimary: hexFromArgb(darkScheme.onPrimary),
        primaryContainer: hexFromArgb(darkScheme.primaryContainer),
        onPrimaryContainer: hexFromArgb(darkScheme.onPrimaryContainer),
        secondary: hexFromArgb(darkScheme.secondary),
        onSecondary: hexFromArgb(darkScheme.onSecondary),
        secondaryContainer: hexFromArgb(darkScheme.secondaryContainer),
        onSecondaryContainer: hexFromArgb(darkScheme.onSecondaryContainer),
        tertiary: hexFromArgb(darkScheme.tertiary),
        onTertiary: hexFromArgb(darkScheme.onTertiary),
        tertiaryContainer: hexFromArgb(darkScheme.tertiaryContainer),
        onTertiaryContainer: hexFromArgb(darkScheme.onTertiaryContainer),
        error: hexFromArgb(darkScheme.error),
        onError: hexFromArgb(darkScheme.onError),
        errorContainer: hexFromArgb(darkScheme.errorContainer),
        onErrorContainer: hexFromArgb(darkScheme.onErrorContainer),
        background: hexFromArgb(darkScheme.background),
        onBackground: hexFromArgb(darkScheme.onBackground),
        surface: hexFromArgb(darkScheme.surface),
        onSurface: hexFromArgb(darkScheme.onSurface),
        surfaceVariant: hexFromArgb(darkScheme.surfaceVariant),
        onSurfaceVariant: hexFromArgb(darkScheme.onSurfaceVariant),
        outline: hexFromArgb(darkScheme.outline),
        shadow: hexFromArgb(darkScheme.shadow),
        inverseSurface: hexFromArgb(darkScheme.inverseSurface),
        inverseOnSurface: hexFromArgb(darkScheme.inverseOnSurface),
        inversePrimary: hexFromArgb(darkScheme.inversePrimary),
        elevation: {
          level0: hexFromArgb(darkScheme.surface),
          level1: hexFromArgb(darkScheme.surface),
          level2: hexFromArgb(darkScheme.surface),
          level3: hexFromArgb(darkScheme.surface),
          level4: hexFromArgb(darkScheme.surface),
          level5: hexFromArgb(darkScheme.surface),
        },
      },
    };
  } catch (error) {
    console.error('Error generating dynamic theme:', error);
    // Fallback ai colori di default se la generazione fallisce
    throw new Error('Failed to generate dynamic theme from provided colors');
  }
}

/**
 * Valida se un colore HEX è valido
 */
export function isValidHexColor(color: string): boolean {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
}

/**
 * Colori di default per la generazione dinamica
 */
export const DEFAULT_DYNAMIC_COLORS: DynamicThemeColors = {
  primary: '#6750A4',
  secondary: '#625B71',
  tertiary: '#7D5260',
};
