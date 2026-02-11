import React, { createContext, useContext } from "react";
import { useColorScheme } from "react-native";

const SHARE_LIGHT_COLORS = {
  primary: "rgba(10, 126, 164, 1)",
  primaryContainer: "rgba(186, 231, 255, 1)",
  surface: "rgba(255, 251, 254, 1)",
  surfaceVariant: "rgba(231, 224, 236, 1)",
  background: "rgba(255, 251, 254, 1)",
  error: "rgba(179, 38, 30, 1)",
  onPrimary: "rgba(255, 255, 255, 1)",
  onPrimaryContainer: "rgba(0, 53, 70, 1)",
  onSurface: "rgba(28, 27, 31, 1)",
  onSurfaceVariant: "rgba(73, 69, 79, 1)",
  onError: "rgba(255, 255, 255, 1)",
  outline: "rgba(121, 116, 126, 1)",
};

const SHARE_DARK_COLORS = {
  primary: "rgba(133, 204, 235, 1)",
  primaryContainer: "rgba(0, 74, 99, 1)",
  surface: "rgba(28, 27, 31, 1)",
  surfaceVariant: "rgba(73, 69, 79, 1)",
  background: "rgba(28, 27, 31, 1)",
  error: "rgba(242, 184, 181, 1)",
  onPrimary: "rgba(0, 53, 70, 1)",
  onPrimaryContainer: "rgba(186, 231, 255, 1)",
  onSurface: "rgba(230, 225, 229, 1)",
  onSurfaceVariant: "rgba(202, 196, 208, 1)",
  onError: "rgba(96, 20, 16, 1)",
  outline: "rgba(147, 143, 153, 1)",
};

type ShareThemeColors = typeof SHARE_LIGHT_COLORS;

const ShareThemeContext = createContext<{ colors: ShareThemeColors } | null>(null);

export function ShareThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === "dark" ? SHARE_DARK_COLORS : SHARE_LIGHT_COLORS;
  return (
    <ShareThemeContext.Provider value={{ colors }}>
      {children}
    </ShareThemeContext.Provider>
  );
}

export function useShareTheme(): { colors: ShareThemeColors } {
  const ctx = useContext(ShareThemeContext);
  if (!ctx) throw new Error("useShareTheme must be used within ShareThemeProvider");
  return ctx;
}
