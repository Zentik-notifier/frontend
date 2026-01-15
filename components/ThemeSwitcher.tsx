import { useI18n } from "@/hooks/useI18n";
import { useAppTheme } from "@/hooks/useTheme";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Icon, Surface, Text, TouchableRipple, useTheme } from "react-native-paper";

interface ThemeSwitcherProps {
  variant?: "button" | "inline";
}

export function ThemeSwitcher({ variant = "button" }: ThemeSwitcherProps) {
  const { themeMode, setThemeMode } = useAppTheme();
  const theme = useTheme();
  const { t } = useI18n();

  const getNextThemeMode = (): "system" | "light" | "dark" => {
    if (themeMode === "system") return "light";
    if (themeMode === "light") return "dark";
    return "system";
  };

  const getThemeCycleIcon = (): string => {
    const next = getNextThemeMode();
    if (next === "system") return "theme-light-dark";
    if (next === "light") return "white-balance-sunny";
    return "weather-night";
  };

  const getThemeCycleLabel = (): string => {
    const next = getNextThemeMode();
    if (next === "system") return t("userDropdown.themes.system");
    if (next === "light") return t("userDropdown.themes.light");
    return t("userDropdown.themes.dark");
  };

  const handleToggle = () => {
    setThemeMode(getNextThemeMode());
  };

  if (variant === "inline") {
    return (
      <View style={styles.inlineContainer}>
        <Icon
          source={getThemeCycleIcon()}
          size={20}
          color={theme.colors.onSurface}
        />
        <Text style={[styles.inlineText, { color: theme.colors.onSurface }]}>
          {getThemeCycleLabel()}
        </Text>
      </View>
    );
  }

  return (
    <Surface style={styles.buttonWrapper} elevation={2}>
      <TouchableRipple
        style={[
          styles.button,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: theme.colors.outline,
          },
        ]}
        onPress={handleToggle}
        accessibilityLabel={t("userDropdown.themes.theme")}
        accessibilityRole="button"
      >
        <Icon
          source={getThemeCycleIcon()}
          size={20}
          color={theme.colors.onSurfaceVariant}
        />
      </TouchableRipple>
    </Surface>
  );
}

const styles = StyleSheet.create({
  buttonWrapper: {
    borderRadius: 8,
  },
  button: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  inlineText: {
    fontSize: 16,
  },
});
