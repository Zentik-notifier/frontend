import { Colors } from "@/constants/Colors";
import { useGetBackendVersionQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Updates from "expo-updates";
import React, { useEffect } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import packageJson from "../package.json";
import { ThemedText } from "./ThemedText";
import { useAppContext } from "@/services/app-context";

interface VersionInfoProps {
  style?: any;
}

export function VersionInfo({ style }: VersionInfoProps) {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { data, loading, refetch, error } = useGetBackendVersionQuery();
  const backendVersion = data?.getBackendVersion || "...";
  const {
    connectionStatus: {
      checkForUpdates,
      hasUpdateAvailable,
      isCheckingUpdate,
      isOtaUpdatesEnabled,
    },
  } = useAppContext();

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
      Alert.alert(
        t("appSettings.versions.reloadError"),
        t("appSettings.versions.reloadErrorMessage"),
        [{ text: t("common.ok") }]
      );
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
    <View
      style={[
        styles.versionItem,
        { backgroundColor: Colors[colorScheme].backgroundCard },
      ]}
    >
      <View style={styles.versionInfo}>
        <Ionicons
          name={icon as any}
          size={20}
          color={Colors[colorScheme].tint}
          style={styles.versionIcon}
        />
        <View style={styles.versionTextContainer}>
          <ThemedText
            style={[styles.versionTitle, { color: Colors[colorScheme].text }]}
          >
            {title}
          </ThemedText>
          {description && (
            <ThemedText
              style={[
                styles.versionDescription,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              {description}
            </ThemedText>
          )}
          <ThemedText
            style={[styles.versionValue, { color: Colors[colorScheme].tint }]}
          >
            {version}
          </ThemedText>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <ThemedText
              style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}
            >
              {t("appSettings.versions.title")}
            </ThemedText>
            <ThemedText
              style={[
                styles.sectionDescription,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              {t("appSettings.versions.description")}
            </ThemedText>
          </View>
          <TouchableOpacity
            style={[
              styles.refreshButton,
              { backgroundColor: Colors[colorScheme].tint },
            ]}
            onPress={refreshData}
            disabled={loading}
            accessibilityLabel={t("appSettings.versions.refresh")}
            accessibilityRole="button"
            accessibilityState={{ disabled: loading }}
          >
            <Ionicons
              name={loading ? "refresh" : "refresh-outline"}
              size={16}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </View>

      {renderVersionItem(
        t("appSettings.versions.backend"),
        backendVersion,
        "server",
        t("appSettings.versions.backendDescription")
      )}

      {error && (
        <View
          style={[
            styles.errorContainer,
            { backgroundColor: Colors[colorScheme].error + "20" },
          ]}
        >
          <ThemedText
            style={[styles.errorText, { color: Colors[colorScheme].error }]}
          >
            {error?.message}
          </ThemedText>
        </View>
      )}

      {renderVersionItem(
        t("appSettings.versions.expo"),
        Constants.expoConfig?.version || t("appSettings.versions.unknown"),
        "logo-react",
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
        "phone-portrait",
        t("appSettings.versions.appDescription")
      )}

      {/* OTA Update Section */}
      {isOtaUpdatesEnabled && (
        <View style={styles.otaSection}>
          <View
            style={[
              styles.settingRow,
              { backgroundColor: Colors[colorScheme].backgroundCard },
            ]}
          >
            <View style={styles.settingInfo}>
              <Ionicons
                name="refresh-circle"
                size={20}
                color={Colors[colorScheme].tint}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <ThemedText
                  style={[
                    styles.settingTitle,
                    { color: Colors[colorScheme].text },
                  ]}
                >
                  {t("appSettings.versions.otaUpdate")}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.settingDescription,
                    { color: Colors[colorScheme].textSecondary },
                  ]}
                >
                  {hasUpdateAvailable
                    ? t("appSettings.versions.updateAvailable")
                    : t("appSettings.versions.noUpdateAvailable")}
                </ThemedText>
              </View>
            </View>
            <View style={styles.otaActions}>
              <TouchableOpacity
                style={[
                  styles.otaButton,
                  { backgroundColor: Colors[colorScheme].tint },
                ]}
                onPress={checkForUpdates}
                disabled={isCheckingUpdate}
              >
                <Ionicons
                  name={isCheckingUpdate ? "refresh" : "refresh-outline"}
                  size={16}
                  color="#fff"
                />
              </TouchableOpacity>
              {hasUpdateAvailable && (
                <TouchableOpacity
                  style={[
                    styles.otaButton,
                    { backgroundColor: Colors[colorScheme].success },
                  ]}
                  onPress={reloadApp}
                >
                  <Ionicons name="download" size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    paddingHorizontal: 16,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  versionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.1)",
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
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  versionDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  versionValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  errorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  errorText: {
    fontSize: 12,
    textAlign: "center",
  },
  otaSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.1)",
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
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  otaActions: {
    flexDirection: "row",
    gap: 8,
  },
  otaButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
