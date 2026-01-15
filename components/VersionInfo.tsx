import { useAppContext } from "@/contexts/AppContext";
import { useGetVersionsInfo, VersionsInfo } from "@/hooks/useGetVersionsInfo";
import { useI18n } from "@/hooks/useI18n";
import Constants from "expo-constants";
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Dialog,
  Icon,
  IconButton,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";

interface VersionInfoProps {
  style?: any;
  compact?: boolean;
  versions?: VersionsInfo;
}

export function VersionInfo({
  style,
  compact = false,
  versions: versionsParent,
}: VersionInfoProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const {
    connectionStatus: {
      checkForUpdates,
      hasUpdateAvailable,
      isOtaUpdatesEnabled,
    },
  } = useAppContext();

  // Dialog states
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { error, loading, refetch, versions } = useGetVersionsInfo();

  const { appVersion, backendVersion, dockerVersion, nativeVersion } =
    versionsParent ?? versions;

  const refreshData = async () => {
    await refetch();
    checkForUpdates();
  };

  useEffect(() => {
    isOtaUpdatesEnabled && checkForUpdates();
  }, []);

  const reloadApp = async () => {
    try {
      const Updates = await import("expo-updates");

      await Updates.reloadAsync();
    } catch (error) {
      console.error("Failed to reload app:", error);
      setErrorMessage(t("appSettings.versions.reloadErrorMessage"));
      setShowErrorDialog(true);
    }
  };

  const renderVersionItem = (
    title: string,
    version: string,
    icon: string,
    description?: string
  ) => (
    <Card style={styles.versionCard} elevation={0}>
      <Card.Content>
        <View style={styles.versionInfo}>
          <View style={styles.versionIcon}>
            <Icon source={icon} size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.versionTextContainer}>
            <Text variant="titleMedium" style={styles.versionTitle}>
              {title}
            </Text>
            {description && (
              <Text
                variant="bodySmall"
                style={[
                  styles.versionDescription,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {description}
              </Text>
            )}
            <Text
              variant="bodyMedium"
              style={[styles.versionValue, { color: theme.colors.primary }]}
            >
              {version}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  // Compact mode - horizontal pills with icons on top
  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactPillsRow}>
          {/* App Version Pill */}
          <View
            style={[
              styles.compactPill,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <Icon source="react" size={18} color={theme.colors.primary} />
            <Text
              variant="bodySmall"
              style={[
                styles.compactPillText,
                { color: theme.colors.onSurface },
              ]}
            >
              {appVersion}
            </Text>
          </View>

          {/* Native Version Pill (only on mobile) */}
          {nativeVersion && (
            <View
              style={[
                styles.compactPill,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <Icon source="cellphone" size={18} color={theme.colors.primary} />
              <Text
                variant="bodySmall"
                style={[
                  styles.compactPillText,
                  { color: theme.colors.onSurface },
                ]}
              >
                {nativeVersion}
              </Text>
            </View>
          )}

          {/* Docker Version Pill (only for self-hosted) */}
          {dockerVersion && (
            <View
              style={[
                styles.compactPill,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <Icon source="docker" size={18} color={theme.colors.primary} />
              <Text
                variant="bodySmall"
                style={[
                  styles.compactPillText,
                  { color: theme.colors.onSurface },
                ]}
              >
                {dockerVersion}
              </Text>
            </View>
          )}

          {/* Backend Version Pill */}
          {backendVersion && (
            <View
              style={[
                styles.compactPill,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <Icon source="server" size={18} color={theme.colors.primary} />
              <Text
                variant="bodySmall"
                style={[
                  styles.compactPillText,
                  { color: theme.colors.onSurface },
                ]}
              >
                {backendVersion}
              </Text>
            </View>
          )}
        </View>

        {/* OTA Update notification (if available) */}
        {isOtaUpdatesEnabled && hasUpdateAvailable && (
          <View style={styles.compactUpdateRow}>
            <Icon source="information" size={14} color={theme.colors.primary} />
            <Text
              variant="bodySmall"
              style={[styles.compactUpdate, { color: theme.colors.primary }]}
            >
              {t("appSettings.versions.updateAvailable")}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text variant="headlineSmall" style={styles.sectionTitle}>
              {t("appSettings.versions.title")}
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.sectionDescription,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {t("appSettings.versions.description")}
            </Text>
          </View>
          <IconButton
            mode="contained"
            onPress={refreshData}
            disabled={loading}
            icon="refresh"
            size={20}
          />
        </View>
      </View>

      {backendVersion &&
        renderVersionItem(
          t("appSettings.versions.backend"),
          backendVersion,
          "server",
          t("appSettings.versions.backendDescription")
        )}

      {error && (
        <Card
          style={[
            styles.errorCard,
            { backgroundColor: theme.colors.errorContainer },
          ]}
          elevation={0}
        >
          <Card.Content>
            <Text
              variant="bodySmall"
              style={[
                styles.errorText,
                { color: theme.colors.onErrorContainer },
              ]}
            >
              {error?.message}
            </Text>
          </Card.Content>
        </Card>
      )}

      {Platform.OS !== "web" &&
        renderVersionItem(
          t("appSettings.versions.expo"),
          Constants.expoConfig?.version || t("appSettings.versions.unknown"),
          "cellphone",
          t("appSettings.versions.expoDescription")
        )}

      {/* {renderVersionItem(
        t("appSettings.versions.platform"),
        `${getPlatformName()} ${getPlatformVersion()}`,
        Device.osName === "iOS" ? "logo-apple" : "logo-android",
        t("appSettings.versions.platformDescription")
      )} */}

      {renderVersionItem(
        t("appSettings.versions.app"),
        appVersion || t("appSettings.versions.unknown"),
        "react",
        t("appSettings.versions.appDescription")
      )}

      {/* Docker Version (only for self-hosted) */}
      {process.env.EXPO_PUBLIC_SELFHOSTED === "true" &&
        renderVersionItem(
          t("appSettings.versions.docker"),
          dockerVersion || t("appSettings.versions.unknown"),
          "docker",
          t("appSettings.versions.dockerDescription")
        )}

      {/* OTA Update Section */}
      {isOtaUpdatesEnabled && (
        <Card style={styles.otaCard} elevation={0}>
          <Card.Content>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIcon}>
                  <Icon
                    source="refresh-circle"
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text variant="titleMedium" style={styles.settingTitle}>
                    {t("appSettings.versions.otaUpdate")}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {hasUpdateAvailable
                      ? t("appSettings.versions.updateAvailable")
                      : t("appSettings.versions.noUpdateAvailable")}
                  </Text>
                </View>
              </View>
              <View style={styles.otaActions}>
                {hasUpdateAvailable && (
                  <IconButton
                    mode="contained"
                    onPress={reloadApp}
                    icon="download"
                    size={20}
                  />
                )}
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Error Dialog */}
      <Portal>
        <Dialog
          visible={showErrorDialog}
          onDismiss={() => setShowErrorDialog(false)}
        >
          <Dialog.Title>{t("appSettings.versions.reloadError")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{errorMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowErrorDialog(false)}>
              {t("common.ok")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  refreshButton: {
    minWidth: 80,
  },
  refreshButtonContent: {
    height: 32,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  sectionDescription: {
    lineHeight: 20,
  },
  versionCard: {
    marginBottom: 8,
  },
  versionInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  versionIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  versionTextContainer: {
    flex: 1,
  },
  versionTitle: {
    marginBottom: 2,
  },
  versionDescription: {
    lineHeight: 16,
    marginBottom: 4,
  },
  versionValue: {
    fontWeight: "600",
  },
  errorCard: {
    marginBottom: 8,
  },
  errorText: {
    textAlign: "center",
  },
  otaCard: {
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 16,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    marginBottom: 2,
  },
  settingDescription: {
    lineHeight: 20,
  },
  otaActions: {
    flexDirection: "row",
    gap: 8,
  },
  otaButton: {
    minWidth: 40,
  },
  otaButtonContent: {
    height: 32,
  },
  compactContainer: {
    padding: 12,
    gap: 8,
  },
  compactPillsRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    gap: 6,
  },
  compactPill: {
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 50,
  },
  compactPillText: {
    fontWeight: "600",
    fontSize: 10,
  },
  compactUpdateRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  compactUpdate: {
    fontWeight: "500",
  },
});
