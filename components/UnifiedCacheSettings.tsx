import { useAppContext } from "@/contexts/AppContext";
import { useI18n } from "@/hooks/useI18n";
import { useSettings } from "@/hooks/useSettings";
import type { MarkAsReadMode } from "@/services/settings-service";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Card,
  Icon,
  Surface,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import NumberListInput from "./ui/NumberListInput";
import Selector from "./ui/Selector";

export default function UnifiedCacheSettings() {
  const theme = useTheme();
  const { t } = useI18n();
  const {
    settings,
    setUnencryptOnBigPayload,
    setMarkAsReadMode,
    setGenerateBucketIconWithInitials,
    setAutoAddDeleteAction,
    setAutoAddMarkAsReadAction,
    setAutoAddOpenNotificationAction,
    setDefaultPostpones,
    setDefaultSnoozes,
  } = useSettings();
  
  const [localMaxCacheSizeMB, setLocalMaxCacheSizeMB] = useState<string>(
    settings.retentionPolicies?.maxCacheSizeMB?.toString() || ""
  );
  const [localMaxCacheAgeDays, setLocalMaxCacheAgeDays] = useState<string>(
    settings.retentionPolicies?.maxCageAgeDays?.toString() || ""
  );
  const [localMaxNotifications, setLocalMaxNotifications] = useState<string>(
    settings.retentionPolicies.maxCachedNotifications !== undefined
      ? String(settings.retentionPolicies.maxCachedNotifications)
      : ""
  );
  const [localMaxNotificationsDays, setLocalMaxNotificationsDays] =
    useState<string>(
      settings.retentionPolicies.maxCachedNotificationsDay !== undefined
        ? String(settings.retentionPolicies.maxCachedNotificationsDay)
        : ""
    );
  const [isEditingMaxNotifications, setIsEditingMaxNotifications] =
    useState(false);
  const [isEditingMaxNotificationsDays, setIsEditingMaxNotificationsDays] =
    useState(false);

  // Default postpones and snoozes
  const [localDefaultPostpones, setLocalDefaultPostpones] = useState<number[]>(
    settings.notificationsPreferences?.defaultPostpones || []
  );
  const [localDefaultSnoozes, setLocalDefaultSnoozes] = useState<number[]>(
    settings.notificationsPreferences?.defaultSnoozes || []
  );

  // Sync when settings change externally
  useEffect(() => {
    setLocalMaxCacheSizeMB(
      settings.retentionPolicies?.maxCacheSizeMB?.toString() || ""
    );
    setLocalMaxCacheAgeDays(
      settings.retentionPolicies?.maxCageAgeDays?.toString() || ""
    );
    if (!isEditingMaxNotifications) {
      setLocalMaxNotifications(
        settings.retentionPolicies.maxCachedNotifications !== undefined
          ? String(settings.retentionPolicies.maxCachedNotifications)
          : ""
      );
    }
    if (!isEditingMaxNotificationsDays) {
      setLocalMaxNotificationsDays(
        settings.retentionPolicies.maxCachedNotificationsDay !== undefined
          ? String(settings.retentionPolicies.maxCachedNotificationsDay)
          : ""
      );
    }
    // Sync default snoozes and postpones
    setLocalDefaultPostpones(
      settings.notificationsPreferences?.defaultPostpones || []
    );
    setLocalDefaultSnoozes(
      settings.notificationsPreferences?.defaultSnoozes || []
    );
  }, [
    settings.retentionPolicies?.maxCacheSizeMB,
    settings.retentionPolicies?.maxCageAgeDays,
    settings.retentionPolicies.maxCachedNotifications,
    settings.retentionPolicies.maxCachedNotificationsDay,
    settings.notificationsPreferences?.defaultPostpones,
    settings.notificationsPreferences?.defaultSnoozes,
    isEditingMaxNotifications,
    isEditingMaxNotificationsDays,
  ]);

  const {
    userSettings: {
      updateMediaCacheDownloadSettings,
      updateMediaCacheRetentionPolicies,
      setMaxCachedNotifications,
      setMaxCachedNotificationsDay,
      settings: { downloadSettings, notificationsPreferences },
    },
  } = useAppContext();

  const handleDefaultPostponesChange = async (values: number[]) => {
    try {
      setLocalDefaultPostpones(values);
      await setDefaultPostpones(values);
    } catch (error) {
      console.error("Error saving default postpones:", error);
    }
  };

  const handleDefaultSnoozesChange = async (values: number[]) => {
    try {
      setLocalDefaultSnoozes(values);
      await setDefaultSnoozes(values);
    } catch (error) {
      console.error("Error saving default snoozes:", error);
    }
  };

  return (
    <View style={styles.sectionContainer}>
      {/* Auto Download Settings */}
      <Surface style={styles.surfaceSection} elevation={1}>
        <View style={styles.sectionHeader}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            {t("appSettings.autoDownload.title")}
          </Text>
          <Text
            variant="bodyMedium"
            style={[
              styles.sectionDescription,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {t("appSettings.autoDownload.description")}
          </Text>
        </View>

        <Card style={styles.settingCard} elevation={0}>
          <Card.Content>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIcon}>
                  <Icon
                    source="download"
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text variant="titleMedium" style={styles.settingTitle}>
                    {t("appSettings.autoDownload.enableAutoDownload")}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t(
                      "appSettings.autoDownload.enableAutoDownloadDescription"
                    )}
                  </Text>
                </View>
              </View>
              <Switch
                value={downloadSettings.autoDownloadEnabled}
                onValueChange={(v) =>
                  updateMediaCacheDownloadSettings({ autoDownloadEnabled: v })
                }
              />
            </View>
          </Card.Content>
        </Card>

        {downloadSettings?.autoDownloadEnabled && (
          <Card style={styles.settingCard} elevation={0}>
            <Card.Content>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <View style={styles.settingIcon}>
                    <Icon
                      source="wifi"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text variant="titleMedium" style={styles.settingTitle}>
                      {t("appSettings.autoDownload.downloadOnWiFiOnly")}
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.settingDescription,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {t(
                        "appSettings.autoDownload.downloadOnWiFiOnlyDescription"
                      )}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={downloadSettings.wifiOnlyDownload}
                  onValueChange={(v) =>
                    updateMediaCacheDownloadSettings({ wifiOnlyDownload: v })
                  }
                />
              </View>
            </Card.Content>
          </Card>
        )}
      </Surface>

      {/* Retention Policies */}
      <Surface style={styles.surfaceSection} elevation={1}>
        <View style={styles.sectionHeader}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            {t("appSettings.retentionPolicies.title")}
          </Text>
          <Text
            variant="bodyMedium"
            style={[
              styles.sectionDescription,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {t("appSettings.retentionPolicies.description")}
          </Text>
        </View>

        <Card style={styles.settingCard} elevation={0}>
          <Card.Content>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingTextContainer}>
                  <Text variant="titleMedium" style={styles.settingTitle}>
                    {t("appSettings.retentionPolicies.maxCacheSize")}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t("appSettings.retentionPolicies.maxCacheSizeDescription")}
                  </Text>
                </View>
              </View>
              <TextInput
                mode="outlined"
                value={localMaxCacheSizeMB}
                onChangeText={(text) => {
                  setLocalMaxCacheSizeMB(text);
                  if (text.trim() === "") {
                    updateMediaCacheRetentionPolicies({
                      maxCacheSizeMB: undefined,
                    });
                    return;
                  }
                  const value = parseInt(text, 10);
                  if (!Number.isNaN(value) && value >= 0 && value <= 10000) {
                    updateMediaCacheRetentionPolicies({
                      maxCacheSizeMB: value,
                    });
                  }
                }}
                keyboardType="numeric"
                maxLength={5}
                style={styles.compactInput}
                dense
              />
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.settingCard} elevation={0}>
          <Card.Content>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingTextContainer}>
                  <Text variant="titleMedium" style={styles.settingTitle}>
                    {t("appSettings.retentionPolicies.maxCacheAge")}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t("appSettings.retentionPolicies.maxCacheAgeDescription")}
                  </Text>
                </View>
              </View>
              <TextInput
                mode="outlined"
                value={localMaxCacheAgeDays}
                onChangeText={(text) => {
                  setLocalMaxCacheAgeDays(text);
                  if (text.trim() === "") {
                    updateMediaCacheRetentionPolicies({
                      maxCageAgeDays: undefined,
                    });
                    return;
                  }
                  const value = parseInt(text, 10);
                  if (!Number.isNaN(value) && value >= 0 && value <= 365) {
                    updateMediaCacheRetentionPolicies({
                      maxCageAgeDays: value,
                    });
                  }
                }}
                keyboardType="numeric"
                maxLength={3}
                style={styles.compactInput}
                dense
              />
            </View>
          </Card.Content>
        </Card>

        {/* Max Stored Notifications */}
        <Card style={styles.settingCard} elevation={0}>
          <Card.Content>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingTextContainer}>
                  <Text variant="titleMedium" style={styles.settingTitle}>
                    {t("appSettings.notifications.maxStoredTitle")}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t("appSettings.notifications.maxStoredDescription")}
                  </Text>
                </View>
              </View>
              <TextInput
                mode="outlined"
                value={localMaxNotifications}
                onFocus={() => setIsEditingMaxNotifications(true)}
                onBlur={async () => {
                  const text = localMaxNotifications;
                  if (text.trim() === "") {
                    await setMaxCachedNotifications(undefined);
                  } else {
                    const parsed = parseInt(text, 10);
                    if (
                      !Number.isNaN(parsed) &&
                      parsed >= 0 &&
                      parsed <= 100000
                    ) {
                      await setMaxCachedNotifications(parsed);
                    }
                  }
                  setIsEditingMaxNotifications(false);
                }}
                onChangeText={(text) => {
                  setLocalMaxNotifications(text);
                }}
                keyboardType="numeric"
                maxLength={6}
                style={styles.compactInput}
                dense
              />
            </View>
          </Card.Content>
        </Card>

        {/* Max Stored Notifications Days */}
        <Card style={styles.settingCard} elevation={0}>
          <Card.Content>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingTextContainer}>
                  <Text variant="titleMedium" style={styles.settingTitle}>
                    {t("appSettings.gqlCache.maxStoredDaysTitle")}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t("appSettings.gqlCache.maxStoredDaysDescription")}
                  </Text>
                </View>
              </View>
              <TextInput
                mode="outlined"
                value={localMaxNotificationsDays}
                onFocus={() => setIsEditingMaxNotificationsDays(true)}
                onBlur={async () => {
                  const text = localMaxNotificationsDays;
                  if (text.trim() === "") {
                    await setMaxCachedNotificationsDay(undefined);
                  } else {
                    const parsed = parseInt(text, 10);
                    if (
                      !Number.isNaN(parsed) &&
                      parsed >= 0 &&
                      parsed <= 3650
                    ) {
                      await setMaxCachedNotificationsDay(parsed);
                    }
                  }
                  setIsEditingMaxNotificationsDays(false);
                }}
                onChangeText={(text) => {
                  setLocalMaxNotificationsDays(text);
                }}
                keyboardType="numeric"
                maxLength={4}
                style={styles.compactInput}
                dense
              />
            </View>
          </Card.Content>
        </Card>
      </Surface>

      {/* GraphQL Cache Settings */}
      <Surface style={styles.surfaceSection} elevation={1}>
        <View style={styles.sectionHeader}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            {t("appSettings.notifications.title")}
          </Text>
          <Text
            variant="bodyMedium"
            style={[
              styles.sectionDescription,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {t("appSettings.notifications.description")}
          </Text>
        </View>

        {/* Mark as read mode setting */}
        <Card style={styles.settingCard} elevation={0}>
          <Card.Content>
            <View style={styles.settingTextContainer}>
              <Text variant="titleMedium" style={styles.settingTitle}>
                {t("appSettings.notifications.markAsReadModeTitle")}
              </Text>
              <Text
                variant="bodyMedium"
                style={[
                  styles.settingDescription,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {t("appSettings.notifications.markAsReadModeDescription")}
              </Text>
            </View>
            <Selector
              label={t("appSettings.notifications.markAsReadModeLabel")}
              placeholder={t(
                "appSettings.notifications.markAsReadModePlaceholder"
              )}
              options={[
                {
                  id: "on-tap",
                  name: t("appSettings.notifications.markAsReadMode.onTap"),
                },
                {
                  id: "on-view",
                  name: t("appSettings.notifications.markAsReadMode.onView"),
                },
                {
                  id: "on-app-close",
                  name: t(
                    "appSettings.notifications.markAsReadMode.onAppClose"
                  ),
                },
              ]}
              selectedValue={
                settings.notificationsPreferences?.markAsReadMode || "on-view"
              }
              onValueChange={(value) =>
                setMarkAsReadMode(value as MarkAsReadMode)
              }
              isSearchable={false}
              disabled={false}
              mode="inline"
            />
          </Card.Content>
        </Card>

        {/* Notifications preferences */}
        <Card style={styles.settingCard} elevation={0}>
          <Card.Content>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingTextContainer}>
                  <Text variant="titleMedium" style={styles.settingTitle}>
                    {t("appSettings.notifications.unencryptOnBigPayload")}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t(
                      "appSettings.notifications.unencryptOnBigPayloadDescription"
                    )}
                  </Text>
                </View>
              </View>
              <Switch
                value={
                  !!settings.notificationsPreferences?.unencryptOnBigPayload
                }
                onValueChange={setUnencryptOnBigPayload}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Generate bucket icons with initials */}
        <Card style={styles.settingCard} elevation={0}>
          <Card.Content>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingTextContainer}>
                  <Text variant="titleMedium" style={styles.settingTitle}>
                    {t(
                      "appSettings.notifications.generateBucketIconWithInitials"
                    )}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t(
                      "appSettings.notifications.generateBucketIconWithInitialsDescription"
                    )}
                  </Text>
                </View>
              </View>
              <Switch
                value={
                  !!notificationsPreferences?.generateBucketIconWithInitials
                }
                onValueChange={setGenerateBucketIconWithInitials}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Auto-add Delete Action */}
        <Card style={styles.settingCard} elevation={0}>
          <Card.Content>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingTextContainer}>
                  <Text variant="titleMedium" style={styles.settingTitle}>
                    {t("appSettings.notifications.autoAddDeleteAction")}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t(
                      "appSettings.notifications.autoAddDeleteActionDescription"
                    )}
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationsPreferences?.autoAddDeleteAction ?? true}
                onValueChange={setAutoAddDeleteAction}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Auto-add Mark as Read Action */}
        <Card style={styles.settingCard} elevation={0}>
          <Card.Content>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingTextContainer}>
                  <Text variant="titleMedium" style={styles.settingTitle}>
                    {t("appSettings.notifications.autoAddMarkAsReadAction")}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t(
                      "appSettings.notifications.autoAddMarkAsReadActionDescription"
                    )}
                  </Text>
                </View>
              </View>
              <Switch
                value={
                  notificationsPreferences?.autoAddMarkAsReadAction ?? true
                }
                onValueChange={setAutoAddMarkAsReadAction}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Auto-add Open Notification Action */}
        <Card style={styles.settingCard} elevation={0}>
          <Card.Content>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingTextContainer}>
                  <Text variant="titleMedium" style={styles.settingTitle}>
                    {t(
                      "appSettings.notifications.autoAddOpenNotificationAction"
                    )}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t(
                      "appSettings.notifications.autoAddOpenNotificationActionDescription"
                    )}
                  </Text>
                </View>
              </View>
              <Switch
                value={
                  notificationsPreferences?.autoAddOpenNotificationAction ??
                  true
                }
                onValueChange={setAutoAddOpenNotificationAction}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Default Postpones */}
        <Card style={styles.settingCard} elevation={0}>
          <Card.Content>
            <NumberListInput
              label={t("appSettings.notifications.defaultPostpones")}
              values={localDefaultPostpones}
              onValuesChange={handleDefaultPostponesChange}
              placeholder={t(
                "appSettings.notifications.defaultPostponesDescription"
              )}
              unit="m"
              min={1}
              max={9999}
              compact={true}
            />
          </Card.Content>
        </Card>

        {/* Default Snoozes */}
        <Card style={styles.settingCard} elevation={0}>
          <Card.Content>
            <NumberListInput
              label={t("appSettings.notifications.defaultSnoozes")}
              values={localDefaultSnoozes}
              onValuesChange={handleDefaultSnoozesChange}
              placeholder={t(
                "appSettings.notifications.defaultSnoozesDescription"
              )}
              unit="m"
              min={1}
              max={9999}
              compact={true}
            />
          </Card.Content>
        </Card>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    paddingTop: 16,
  },
  surfaceSection: {
    marginBottom: 20,
    borderRadius: 12,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  sectionDescription: {
    lineHeight: 20,
  },
  settingCard: {
    marginHorizontal: 0,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingColumn: {
    flexDirection: "column",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginRight: 16,
  },
  settingIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    marginBottom: 4,
  },
  settingDescription: {
    lineHeight: 20,
    marginBottom: 8,
  },
  settingInput: {
    minWidth: 80,
  },
  compactInput: {
    minWidth: 60,
    height: 40,
  },
});
