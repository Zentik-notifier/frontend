import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";
import { generateDynamicTheme } from "../services/theme-generator";
import { getPresetColors, ThemePreset } from "../services/theme-presets";
import { UserSettings, settingsService } from "@/services/settings-service";
import { useSettings } from "./useSettings";

export type ThemeMode = "light" | "dark" | "system";
export type ColorScheme = "light" | "dark";

interface ThemeContextType {
  themeMode: ThemeMode;
  colorScheme: ColorScheme;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper function to generate theme based on settings
function generateThemeFromSettings(
  themeSettings: UserSettings['theme'],
  colorScheme: ColorScheme
) {
  const baseTheme = colorScheme === "dark" ? MD3DarkTheme : MD3LightTheme;
  const textScale = themeSettings.textScale || 1.0;

  // Scale all font sizes in the theme
  const scaleFontToken = (token: any, defaultFontSize: number, defaultLineHeight: number) => ({
    ...token,
    fontSize: (token.fontSize || defaultFontSize) * textScale,
    lineHeight: token.lineHeight ? token.lineHeight * textScale : defaultLineHeight * textScale,
  });

  const scaledTheme = {
    ...baseTheme,
    fonts: {
      ...baseTheme.fonts,
      displayLarge: scaleFontToken(baseTheme.fonts.displayLarge, 57, 64),
      displayMedium: scaleFontToken(baseTheme.fonts.displayMedium, 45, 52),
      displaySmall: scaleFontToken(baseTheme.fonts.displaySmall, 36, 44),
      headlineLarge: scaleFontToken(baseTheme.fonts.headlineLarge, 32, 40),
      headlineMedium: scaleFontToken(baseTheme.fonts.headlineMedium, 28, 36),
      headlineSmall: scaleFontToken(baseTheme.fonts.headlineSmall, 24, 32),
      titleLarge: scaleFontToken(baseTheme.fonts.titleLarge, 22, 28),
      titleMedium: scaleFontToken(baseTheme.fonts.titleMedium, 16, 24),
      titleSmall: scaleFontToken(baseTheme.fonts.titleSmall, 14, 20),
      bodyLarge: scaleFontToken(baseTheme.fonts.bodyLarge, 16, 24),
      bodyMedium: scaleFontToken(baseTheme.fonts.bodyMedium, 14, 20),
      bodySmall: scaleFontToken(baseTheme.fonts.bodySmall, 12, 16),
      labelLarge: scaleFontToken(baseTheme.fonts.labelLarge, 14, 20),
      labelMedium: scaleFontToken(baseTheme.fonts.labelMedium, 12, 16),
      labelSmall: scaleFontToken(baseTheme.fonts.labelSmall, 11, 16),
    },
  };

  // If using dynamic theme, generate it
  if (themeSettings.useDynamicTheme && themeSettings.dynamicThemeColors) {
    try {
      const dynamicTheme = generateDynamicTheme(themeSettings.dynamicThemeColors);
      const dynamicColors =
        colorScheme === "dark" ? dynamicTheme.dark : dynamicTheme.light;

      // Create a complete theme by merging base theme with dynamic colors
      return {
        ...scaledTheme,
        colors: {
          ...scaledTheme.colors,
          ...dynamicColors,
        },
      };
    } catch (error) {
      console.error("Error generating dynamic theme:", error);
      return scaledTheme;
    }
  }

  // If using preset, apply preset colors
  if (themeSettings.themePreset && themeSettings.themePreset !== ThemePreset.Custom) {
    const presetColors = getPresetColors(themeSettings.themePreset, colorScheme);
    // Create a custom theme based on preset colors
    return {
      ...scaledTheme,
      colors: {
        ...scaledTheme.colors,
        primary: presetColors.primary,
        secondary: presetColors.secondary,
        tertiary: presetColors.tertiary,
      },
    };
  }

  // Default theme with scaled fonts
  return scaledTheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const { settings } = useSettings();
  
  const themeMode = settings.theme.themeMode;
  const themeSettings = settings.theme;

  // Determine actual color scheme based on theme mode
  const colorScheme: ColorScheme =
    themeMode === "system" ? systemColorScheme ?? "light" : themeMode;

  const isDark = colorScheme === "dark";
  const isLight = colorScheme === "light";

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await settingsService.setThemeMode(mode);
      console.debug("Theme changed to:", mode);
    } catch (error) {
      console.error("Error saving theme preference:", error);
    }
  };

  // Generate theme based on current settings
  const theme = generateThemeFromSettings(themeSettings, colorScheme);

  // Log theme changes for debugging
  // useEffect(() => {
  //   if (themeSettings) {
  //     console.debug("Theme applied:", {
  //       themeMode,
  //       colorScheme,
  //       themePreset: themeSettings.themePreset,
  //       useDynamicTheme: themeSettings.useDynamicTheme,
  //       primaryColor: theme.colors.primary,
  //     });
  //   }
  // }, [themeSettings, themeMode, colorScheme, theme]);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        colorScheme,
        setThemeMode,
        isDark,
        isLight,
      }}
    >
      <PaperProvider theme={theme}>
        <React.Fragment>
          {children}
        </React.Fragment>
      </PaperProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
