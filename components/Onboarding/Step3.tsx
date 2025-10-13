import React, { memo, useCallback } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Icon, Switch, Text, useTheme } from "react-native-paper";
import { useOnboarding } from "./OnboardingContext";

const Step3 = memo(() => {
  const theme = useTheme();
  const {
    autoDownloadImages,
    autoDownloadVideos,
    autoDownloadAudio,
    setAutoDownloadImages,
    setAutoDownloadVideos,
    setAutoDownloadAudio,
  } = useOnboarding();

  const handleImagesToggle = useCallback((value: boolean) => {
    setAutoDownloadImages(value);
  }, [setAutoDownloadImages]);

  const handleVideosToggle = useCallback((value: boolean) => {
    setAutoDownloadVideos(value);
  }, [setAutoDownloadVideos]);

  const handleAudioToggle = useCallback((value: boolean) => {
    setAutoDownloadAudio(value);
  }, [setAutoDownloadAudio]);

  return (
    <ScrollView style={styles.stepContainer}>
      <View style={styles.stepContent}>
        <Icon source="database" size={64} color={theme.colors.primary} />
        <Text variant="headlineMedium" style={styles.stepTitle}>
          Data Retention
        </Text>
        <Text variant="bodyLarge" style={styles.stepDescription}>
          Choose how much data you want to keep on your device.
        </Text>

        <View style={styles.section}>
          <Card style={[styles.levelCard, styles.levelCardSelected]}>
            <Card.Content>
              <View style={styles.levelCardHeader}>
                <Icon
                  source="battery-medium"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text variant="titleMedium">Balanced</Text>
              </View>
              <Text variant="bodySmall" style={styles.levelDescription}>
                Recommended for most users
              </Text>
              <Text variant="bodySmall" style={styles.levelDetails}>
                • Notifications: 30 days
              </Text>
              <Text variant="bodySmall" style={styles.levelDetails}>
                • Media: 14 days
              </Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Auto Download
          </Text>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Icon source="image" size={20} color={theme.colors.onSurface} />
              <Text variant="bodyMedium">Images</Text>
            </View>
            <Switch value={autoDownloadImages} onValueChange={handleImagesToggle} />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Icon source="video" size={20} color={theme.colors.onSurface} />
              <Text variant="bodyMedium">Videos</Text>
            </View>
            <Switch value={autoDownloadVideos} onValueChange={handleVideosToggle} />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Icon source="music" size={20} color={theme.colors.onSurface} />
              <Text variant="bodyMedium">Audio</Text>
            </View>
            <Switch value={autoDownloadAudio} onValueChange={handleAudioToggle} />
          </View>
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
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  switchLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  levelCard: {
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  levelCardSelected: {
    borderColor: "#6200ea",
  },
  levelCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  levelDescription: {
    marginBottom: 8,
    opacity: 0.8,
  },
  levelDetails: {
    marginTop: 4,
    opacity: 0.7,
  },
});

export default Step3;
