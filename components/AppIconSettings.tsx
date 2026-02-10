import { useAppIcon } from "@/hooks/useAppIcon";
import { useI18n } from "@/hooks/useI18n";
import type { AppIconId } from "@/services/app-icon-service";
import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";
import Selector, { SelectorOption } from "./ui/Selector";

const ICON_PREVIEW_SOURCES: Record<AppIconId | "default", number> = {
  default: require("@/assets/icons/generators/glas_default.png"),
  dark: require("@/assets/icons/generators/glas_dark.png"),
  tintedLight: require("@/assets/icons/generators/glas_tinted_light.png"),
  tintedDark: require("@/assets/icons/generators/glas_tinted_dark.png"),
  clearLight: require("@/assets/icons/generators/glas_clear_light.png"),
  clearDark: require("@/assets/icons/generators/glas_clear_dark.png"),
  ntfy: require("@/assets/icons/generators/ntfy_glas.png"),
  gotify: require("@/assets/icons/generators/gotify_glas.png"),
  zentikNtfy: require("@/assets/icons/generators/zentik_ntfy_glas.png"),
  zentikGotify: require("@/assets/icons/generators/zentik_gotify_glas.png"),
};

export function AppIconSettings() {
  const { t } = useI18n();
  const theme = useTheme();
  const {
    currentIconId,
    selectIcon,
    loading,
    availableIconIds,
    isSupported,
  } = useAppIcon();

  const options: SelectorOption[] = useMemo(() => {
    return availableIconIds.map((iconId) => {
      const labelKey =
        iconId === "default"
          ? "appSettings.appIcon.default"
          : `appSettings.appIcon.${iconId}`;
      return {
        id: iconId,
        name: t(labelKey as any),
        iconUrl: ICON_PREVIEW_SOURCES[iconId],
      };
    });
  }, [availableIconIds, t]);

  const handleValueChange = (value: AppIconId | "default") => {
    selectIcon(value);
  };

  if (!isSupported) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            {t("appSettings.appIcon.title")}
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
          >
            {t("appSettings.appIcon.notSupported")}
          </Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="headlineSmall" style={styles.sectionTitle}>
          {t("appSettings.appIcon.title")}
        </Text>
        <Text
          variant="bodyMedium"
          style={[
            styles.description,
            { color: theme.colors.onSurfaceVariant, marginBottom: 16 },
          ]}
        >
          {t("appSettings.appIcon.description")}
        </Text>
        <Selector
          placeholder={t("appSettings.appIcon.default")}
          options={options}
          selectedValue={currentIconId}
          onValueChange={handleValueChange}
          disabled={loading}
        />
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  description: {
    lineHeight: 20,
  },
});
