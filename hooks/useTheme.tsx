import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import { userSettings, UserSettings } from "../services/user-settings";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";
import { ThemePreset, getPresetColors } from "../services/theme-presets";
import { generateDynamicTheme } from "../services/theme-generator";

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
  settings: UserSettings,
  colorScheme: ColorScheme
) {
  const baseTheme = colorScheme === "dark" ? MD3DarkTheme : MD3LightTheme;

  // If using dynamic theme, generate it
  if (settings.useDynamicTheme && settings.dynamicThemeColors) {
    try {
      const dynamicTheme = generateDynamicTheme(settings.dynamicThemeColors);
      const dynamicColors =
        colorScheme === "dark" ? dynamicTheme.dark : dynamicTheme.light;

      // Create a complete theme by merging base theme with dynamic colors
      return {
        ...baseTheme,
        colors: {
          ...baseTheme.colors,
          ...dynamicColors,
        },
      };
    } catch (error) {
      console.error("Error generating dynamic theme:", error);
      return baseTheme;
    }
  }

  // If using preset, apply preset colors
  if (settings.themePreset && settings.themePreset !== ThemePreset.Custom) {
    const presetColors = getPresetColors(settings.themePreset, colorScheme);
    // Create a custom theme based on preset colors
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: presetColors.primary,
        secondary: presetColors.secondary,
        tertiary: presetColors.tertiary,
      },
    };
  }

  // Default theme
  return baseTheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [themeSettings, setThemeSettingsState] = useState<UserSettings | null>(
    null
  );

  // Determine actual color scheme based on theme mode
  const colorScheme: ColorScheme =
    themeMode === "system" ? systemColorScheme ?? "light" : themeMode;

  const isDark = colorScheme === "dark";
  const isLight = colorScheme === "light";

  // Load saved theme preference and subscribe to changes
  useEffect(() => {
    let mounted = true;

    // Initialize settings and get current theme
    userSettings.initialize().then((settings) => {
      if (mounted) {
        setThemeModeState(settings.themeMode);
        setThemeSettingsState(settings);
      }
    });

    const unsubscribe = userSettings.subscribe((settings) => {
      if (mounted) {
        setThemeModeState(settings.themeMode);
        setThemeSettingsState(settings);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await userSettings.setThemeMode(mode);
      console.debug("Theme changed to:", mode);
    } catch (error) {
      console.error("Error saving theme preference:", error);
    }
  };

  // Generate theme based on current settings
  const theme = themeSettings
    ? generateThemeFromSettings(themeSettings, colorScheme)
    : colorScheme === "dark"
    ? MD3DarkTheme
    : MD3LightTheme;

  // Log theme changes for debugging
  useEffect(() => {
    if (themeSettings) {
      console.debug("Theme applied:", {
        themeMode,
        colorScheme,
        themePreset: themeSettings.themePreset,
        useDynamicTheme: themeSettings.useDynamicTheme,
        primaryColor: theme.colors.primary,
      });
    }
  }, [themeSettings, themeMode, colorScheme, theme]);

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
      <PaperProvider theme={theme}>{children}</PaperProvider>
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
