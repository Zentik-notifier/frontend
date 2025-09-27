import { useGetBackendVersionQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Updates from "expo-updates";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
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
import packageJson from "../package.json";
import { useAppContext } from "@/contexts/AppContext";

interface VersionInfoProps {
  style?: any;
}

export function VersionInfo({ style }: VersionInfoProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { data, loading, refetch, error } = useGetBackendVersionQuery();
  const backendVersion = data?.getBackendVersion || "...";
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

  const refreshData = async () => {
    await refetch();
    checkForUpdates();
  };

  useEffect(() => {
    isOtaUpdatesEnabled && checkForUpdates();
  }, []);

  const reloadApp = async () => {
    try {
      await Updates.reloadAsync();
    } catch (error) {
      console.error("Failed to reload app:", error);
      setErrorMessage(t("appSettings.versions.reloadErrorMessage"));
      setShowErrorDialog(true);
    }
  };

  const getPlatformVersion = () => {
    if (Device.isDevice) {
      if (Device.osName === "iOS") {
        return Device.osVersion || t("appSettings.versions.unknown");
      } else if (Device.osName === "Android") {
        return Device.osVersion || t("appSettings.versions.unknown");
      }
    }
    return t("appSettings.versions.unknown");
  };

  const getPlatformName = () => {
    if (Device.isDevice) {
      if (Device.osName === "iOS") {
        return "iOS";
      } else if (Device.osName === "Android") {
        return "Android";
      }
    }
    return t("appSettings.versions.unknown");
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
            <Icon source={icon as any} size={20} color={theme.colors.primary} />
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

      {renderVersionItem(
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

      {renderVersionItem(
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
        packageJson.version || t("appSettings.versions.unknown"),
        "react",
        t("appSettings.versions.appDescription")
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
});
