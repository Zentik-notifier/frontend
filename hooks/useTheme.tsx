import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import { userSettings } from "../services/user-settings";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";

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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");

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
      }
    });

    const unsubscribe = userSettings.subscribe((settings) => {
      if (mounted) {
        setThemeModeState(settings.themeMode);
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

  const theme = colorScheme === "dark" ? MD3DarkTheme : MD3LightTheme;

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

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Backward compatibility hook
export function useColorScheme(): ColorScheme {
  const { colorScheme } = useTheme();
  return colorScheme;
}
