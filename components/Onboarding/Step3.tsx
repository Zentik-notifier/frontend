import React, { memo, useCallback, useMemo, useState, useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Chip, Icon, Switch, Text, TextInput, useTheme } from "react-native-paper";
import { useI18n } from "@/hooks";
import { userSettings } from "@/services/user-settings";

// Retention Presets
type RetentionPreset = "low" | "balanced" | "longer" | "custom";

interface RetentionConfig {
  maxCacheSizeMB?: number;
  maxCacheAgeDays?: number;
  maxNotifications?: number;
  maxNotificationsDays?: number;
}

const RETENTION_PRESETS: Record<Exclude<RetentionPreset, "custom">, RetentionConfig> = {
  low: {
    maxCacheSizeMB: 100,
    maxCacheAgeDays: 7,
    maxNotifications: 100,
    maxNotificationsDays: 7,
  },
  balanced: {
    maxCacheSizeMB: 500,
    maxCacheAgeDays: 30,
    maxNotifications: 500,
    maxNotificationsDays: 30,
  },
  longer: {
    maxCacheSizeMB: 2000,
    maxCacheAgeDays: 90,
    maxNotifications: 2000,
    maxNotificationsDays: 90,
  },
};

const Step3 = memo(() => {
  const theme = useTheme();
  const { t } = useI18n();

  // State for selected preset
  const [selectedPreset, setSelectedPreset] = useState<RetentionPreset>("balanced");

  // State for custom values
  const [maxCacheSizeMB, setMaxCacheSizeMB] = useState<string>("");
  const [maxCacheAgeDays, setMaxCacheAgeDays] = useState<string>("");
  const [maxNotifications, setMaxNotifications] = useState<string>("");
  const [maxNotificationsDays, setMaxNotificationsDays] = useState<string>("");

  // Auto-download settings
  const [autoDownloadEnabled, setAutoDownloadEnabled] = useState(false);
  const [wifiOnlyDownload, setWifiOnlyDownload] = useState(true);

  // Initialize from userSettings on mount
  useEffect(() => {
    const settings = userSettings.getSettings();
    
    // Auto-download settings
    setAutoDownloadEnabled(settings.mediaCache.downloadSettings?.autoDownloadEnabled ?? false);
    setWifiOnlyDownload(settings.mediaCache.downloadSettings?.wifiOnlyDownload ?? true);

    // Retention settings
    const currentSizeMB = settings.mediaCache.retentionPolicies?.maxCacheSizeMB;
    const currentAgeDays = settings.mediaCache.retentionPolicies?.maxCageAgeDays;
    const currentMaxNotif = settings.maxCachedNotifications;
    const currentMaxNotifDays = settings.maxCachedNotificationsDay;

    // Check if matches a preset
    let matchedPreset: RetentionPreset | null = null;
    for (const [preset, config] of Object.entries(RETENTION_PRESETS)) {
      if (
        currentSizeMB === config.maxCacheSizeMB &&
        currentAgeDays === config.maxCacheAgeDays &&
        currentMaxNotif === config.maxNotifications &&
        currentMaxNotifDays === config.maxNotificationsDays
      ) {
        matchedPreset = preset as RetentionPreset;
        break;
      }
    }

    if (matchedPreset) {
      setSelectedPreset(matchedPreset);
    } else {
      // Custom values
      setSelectedPreset("custom");
      setMaxCacheSizeMB(currentSizeMB?.toString() || "");
      setMaxCacheAgeDays(currentAgeDays?.toString() || "");
      setMaxNotifications(currentMaxNotif?.toString() || "");
      setMaxNotificationsDays(currentMaxNotifDays?.toString() || "");
    }
  }, []);

  // Apply preset
  const handlePresetSelect = useCallback(async (preset: RetentionPreset) => {
    setSelectedPreset(preset);

    if (preset === "custom") {
      // Keep current custom values
      return;
    }

    const config = RETENTION_PRESETS[preset];

    // Update userSettings
    await userSettings.updateMediaCacheRetentionPolicies({
      maxCacheSizeMB: config.maxCacheSizeMB,
      maxCageAgeDays: config.maxCacheAgeDays,
    });
    await userSettings.setMaxCachedNotifications(config.maxNotifications);
    await userSettings.setMaxCachedNotificationsDay(config.maxNotificationsDays);

    // Update local state for display
    setMaxCacheSizeMB(config.maxCacheSizeMB?.toString() || "");
    setMaxCacheAgeDays(config.maxCacheAgeDays?.toString() || "");
    setMaxNotifications(config.maxNotifications?.toString() || "");
    setMaxNotificationsDays(config.maxNotificationsDays?.toString() || "");
  }, []);

  // Update custom values
  const handleCustomValueChange = useCallback(async (
    field: keyof RetentionConfig,
    value: string
  ) => {
    // Switch to custom if not already
    if (selectedPreset !== "custom") {
      setSelectedPreset("custom");
    }

    const numValue = value.trim() === "" ? undefined : parseInt(value, 10);

    switch (field) {
      case "maxCacheSizeMB":
        setMaxCacheSizeMB(value);
        if (numValue === undefined || (!isNaN(numValue) && numValue >= 0 && numValue <= 10000)) {
          await userSettings.updateMediaCacheRetentionPolicies({ maxCacheSizeMB: numValue });
        }
        break;
      case "maxCacheAgeDays":
        setMaxCacheAgeDays(value);
        if (numValue === undefined || (!isNaN(numValue) && numValue >= 0 && numValue <= 365)) {
          await userSettings.updateMediaCacheRetentionPolicies({ maxCageAgeDays: numValue });
        }
        break;
      case "maxNotifications":
        setMaxNotifications(value);
        if (numValue === undefined || (!isNaN(numValue) && numValue >= 0 && numValue <= 100000)) {
          await userSettings.setMaxCachedNotifications(numValue);
        }
        break;
      case "maxNotificationsDays":
        setMaxNotificationsDays(value);
        if (numValue === undefined || (!isNaN(numValue) && numValue >= 0 && numValue <= 3650)) {
          await userSettings.setMaxCachedNotificationsDay(numValue);
        }
        break;
    }
  }, [selectedPreset]);

  // Auto-download handlers
  const handleAutoDownloadChange = useCallback(async (enabled: boolean) => {
    setAutoDownloadEnabled(enabled);
    await userSettings.updateMediaCacheDownloadSettings({ autoDownloadEnabled: enabled });
  }, []);

  const handleWifiOnlyChange = useCallback(async (wifiOnly: boolean) => {
    setWifiOnlyDownload(wifiOnly);
    await userSettings.updateMediaCacheDownloadSettings({ wifiOnlyDownload: wifiOnly });
  }, []);

  // Get current preset config for display
  const currentConfig = useMemo(() => {
    if (selectedPreset === "custom") {
      return {
        maxCacheSizeMB: maxCacheSizeMB || "-",
        maxCacheAgeDays: maxCacheAgeDays || "-",
        maxNotifications: maxNotifications || "-",
        maxNotificationsDays: maxNotificationsDays || "-",
      };
    }
    const config = RETENTION_PRESETS[selectedPreset];
    return {
      maxCacheSizeMB: config.maxCacheSizeMB?.toString() || "-",
      maxCacheAgeDays: config.maxCacheAgeDays?.toString() || "-",
      maxNotifications: config.maxNotifications?.toString() || "-",
      maxNotificationsDays: config.maxNotificationsDays?.toString() || "-",
    };
  }, [selectedPreset, maxCacheSizeMB, maxCacheAgeDays, maxNotifications, maxNotificationsDays]);

  return (
    <ScrollView style={styles.stepContainer}>
      <View style={styles.stepContent}>
        <Icon source="database" size={64} color={theme.colors.primary} />
        <Text variant="headlineMedium" style={styles.stepTitle}>
          {t("onboardingV2.step3.title")}
        </Text>
        <Text variant="bodyLarge" style={styles.stepDescription}>
          {t("onboardingV2.step3.description")}
        </Text>

        {/* Retention Presets */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t("onboardingV2.step3.retentionPreset")}
          </Text>
          <Text variant="bodyMedium" style={styles.sectionDescription}>
            {t("onboardingV2.step3.retentionPresetDescription")}
          </Text>

          <View style={styles.chipContainer}>
            <Chip
              selected={selectedPreset === "low"}
              icon={selectedPreset === "low" ? "check" : "clock-fast"}
              style={styles.chip}
              onPress={() => handlePresetSelect("low")}
            >
              {t("onboardingV2.step3.presets.low.name")}
            </Chip>
            <Chip
              selected={selectedPreset === "balanced"}
              icon={selectedPreset === "balanced" ? "check" : "scale-balance"}
              style={styles.chip}
              onPress={() => handlePresetSelect("balanced")}
            >
              {t("onboardingV2.step3.presets.balanced.name")}
            </Chip>
            <Chip
              selected={selectedPreset === "longer"}
              icon={selectedPreset === "longer" ? "check" : "clock"}
              style={styles.chip}
              onPress={() => handlePresetSelect("longer")}
            >
              {t("onboardingV2.step3.presets.longer.name")}
            </Chip>
            <Chip
              selected={selectedPreset === "custom"}
              icon={selectedPreset === "custom" ? "check" : "cog"}
              style={styles.chip}
              onPress={() => handlePresetSelect("custom")}
            >
              {t("onboardingV2.step3.presets.custom.name")}
            </Chip>
          </View>

          {/* Preset Info Card */}
          <Card style={styles.presetCard} elevation={1}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.presetCardTitle}>
                {selectedPreset === "custom" 
                  ? t("onboardingV2.step3.presets.custom.name")
                  : t(`onboardingV2.step3.presets.${selectedPreset}.name`)}
              </Text>
              <Text variant="bodySmall" style={styles.presetCardDescription}>
                {selectedPreset === "custom"
                  ? t("onboardingV2.step3.presets.custom.description")
                  : t(`onboardingV2.step3.presets.${selectedPreset}.description`)}
              </Text>

              {selectedPreset === "custom" ? (
                // Custom mode: show inputs inline
                <View style={styles.presetDetails}>
                  <View style={styles.presetDetailRow}>
                    <Text variant="bodySmall" style={styles.presetDetailLabel}>
                      {t("onboardingV2.step3.maxMediaSize")}:
                    </Text>
                    <View style={styles.inlineInputContainer}>
                      <Text variant="bodySmall" style={styles.unitLabel}>MB</Text>
                      <TextInput
                        mode="outlined"
                        value={maxCacheSizeMB}
                        onChangeText={(v) => handleCustomValueChange("maxCacheSizeMB", v)}
                        keyboardType="numeric"
                        placeholder="500"
                        style={styles.inlineInput}
                        dense
                      />
                    </View>
                  </View>
                  <View style={styles.presetDetailRow}>
                    <Text variant="bodySmall" style={styles.presetDetailLabel}>
                      {t("onboardingV2.step3.maxMediaAge")}:
                    </Text>
                    <View style={styles.inlineInputContainer}>
                      <Text variant="bodySmall" style={styles.unitLabel}>{t("onboardingV2.step3.days")}</Text>
                      <TextInput
                        mode="outlined"
                        value={maxCacheAgeDays}
                        onChangeText={(v) => handleCustomValueChange("maxCacheAgeDays", v)}
                        keyboardType="numeric"
                        placeholder="30"
                        style={styles.inlineInput}
                        dense
                      />
                    </View>
                  </View>
                  <View style={styles.presetDetailRow}>
                    <Text variant="bodySmall" style={styles.presetDetailLabel}>
                      {t("onboardingV2.step3.maxNotifications")}:
                    </Text>
                    <TextInput
                      mode="outlined"
                      value={maxNotifications}
                      onChangeText={(v) => handleCustomValueChange("maxNotifications", v)}
                      keyboardType="numeric"
                      placeholder="500"
                      style={styles.inlineInput}
                      dense
                    />
                  </View>
                  <View style={styles.presetDetailRow}>
                    <Text variant="bodySmall" style={styles.presetDetailLabel}>
                      {t("onboardingV2.step3.maxNotificationsAge")}:
                    </Text>
                    <View style={styles.inlineInputContainer}>
                      <Text variant="bodySmall" style={styles.unitLabel}>{t("onboardingV2.step3.days")}</Text>
                      <TextInput
                        mode="outlined"
                        value={maxNotificationsDays}
                        onChangeText={(v) => handleCustomValueChange("maxNotificationsDays", v)}
                        keyboardType="numeric"
                        placeholder="30"
                        style={styles.inlineInput}
                        dense
                      />
                    </View>
                  </View>
                </View>
              ) : (
                // Preset mode: show read-only values
                <View style={styles.presetDetails}>
                  <View style={styles.presetDetailRow}>
                    <Text variant="bodySmall" style={styles.presetDetailLabel}>
                      {t("onboardingV2.step3.maxMediaSize")}:
                    </Text>
                    <Text variant="bodySmall" style={styles.presetDetailValue}>
                      {currentConfig.maxCacheSizeMB} MB
                    </Text>
                  </View>
                  <View style={styles.presetDetailRow}>
                    <Text variant="bodySmall" style={styles.presetDetailLabel}>
                      {t("onboardingV2.step3.maxMediaAge")}:
                    </Text>
                    <Text variant="bodySmall" style={styles.presetDetailValue}>
                      {currentConfig.maxCacheAgeDays} {t("onboardingV2.step3.days")}
                    </Text>
                  </View>
                  <View style={styles.presetDetailRow}>
                    <Text variant="bodySmall" style={styles.presetDetailLabel}>
                      {t("onboardingV2.step3.maxNotifications")}:
                    </Text>
                    <Text variant="bodySmall" style={styles.presetDetailValue}>
                      {currentConfig.maxNotifications}
                    </Text>
                  </View>
                  <View style={styles.presetDetailRow}>
                    <Text variant="bodySmall" style={styles.presetDetailLabel}>
                      {t("onboardingV2.step3.maxNotificationsAge")}:
                    </Text>
                    <Text variant="bodySmall" style={styles.presetDetailValue}>
                      {currentConfig.maxNotificationsDays} {t("onboardingV2.step3.days")}
                    </Text>
                  </View>
                </View>
              )}
            </Card.Content>
          </Card>
        </View>

        {/* Auto-Download Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t("onboardingV2.step3.autoDownload")}
          </Text>
          <Text variant="bodyMedium" style={styles.sectionDescription}>
            {t("onboardingV2.step3.autoDownloadDescription")}
          </Text>

          <Card style={styles.switchCard} elevation={0}>
            <Card.Content>
              <View style={styles.switchRow}>
                <View style={styles.switchTextContainer}>
                  <Text variant="bodyMedium" style={styles.switchLabel}>
                    {t("onboardingV2.step3.enableAutoDownload")}
                  </Text>
                  <Text variant="bodySmall" style={[styles.switchDescription, { color: theme.colors.onSurfaceVariant }]}>
                    {t("onboardingV2.step3.enableAutoDownloadDescription")}
                  </Text>
                </View>
                <Switch
                  value={autoDownloadEnabled}
                  onValueChange={handleAutoDownloadChange}
                />
              </View>
            </Card.Content>
          </Card>

          {autoDownloadEnabled && (
            <Card style={styles.switchCard} elevation={0}>
              <Card.Content>
                <View style={styles.switchRow}>
                  <View style={styles.switchTextContainer}>
                    <Text variant="bodyMedium" style={styles.switchLabel}>
                      {t("onboardingV2.step3.wifiOnly")}
                    </Text>
                    <Text variant="bodySmall" style={[styles.switchDescription, { color: theme.colors.onSurfaceVariant }]}>
                      {t("onboardingV2.step3.wifiOnlyDescription")}
                    </Text>
                  </View>
                  <Switch
                    value={wifiOnlyDownload}
                    onValueChange={handleWifiOnlyChange}
                  />
                </View>
              </Card.Content>
            </Card>
          )}
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Icon source="information-outline" size={20} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodySmall" style={[styles.disclaimerText, { color: theme.colors.onSurfaceVariant }]}>
            {t("onboardingV2.step3.disclaimer")}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
});

Step3.displayName = "Step3";

const styles = StyleSheet.create({
  stepContainer: {
    flex: 1,
  },
  stepContent: {
    padding: 24,
    alignItems: "center",
  },
  stepTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  stepDescription: {
    marginBottom: 24,
    textAlign: "center",
    opacity: 0.8,
  },
  section: {
    width: "100%",
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  sectionDescription: {
    marginBottom: 16,
    opacity: 0.7,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    marginVertical: 4,
  },
  presetCard: {
    marginBottom: 16,
  },
  presetCardTitle: {
    marginBottom: 4,
    fontWeight: "600",
  },
  presetCardDescription: {
    marginBottom: 12,
    opacity: 0.7,
  },
  presetDetails: {
    gap: 8,
  },
  presetDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  presetDetailLabel: {
    opacity: 0.7,
    flex: 1,
  },
  presetDetailValue: {
    fontWeight: "600",
  },
  inlineInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  inlineInput: {
    width: 80,
    height: 36,
  },
  unitLabel: {
    opacity: 0.7,
  },
  switchCard: {
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  disclaimerText: {
    flex: 1,
    lineHeight: 20,
  },
});

export default Step3;
