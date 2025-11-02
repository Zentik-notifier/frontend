import { settingsService } from "@/services/settings-service";
import React, { memo, useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { Button, Card, Icon, Text, useTheme } from "react-native-paper";
import { useOnboarding } from "./OnboardingContext";
import { useI18n } from "@/hooks/useI18n";
import * as Clipboard from "expo-clipboard";

const Step6 = memo(() => {
  const theme = useTheme();
  const { t } = useI18n();
  const { magicCode } = useOnboarding();
  const [apiUrl, setApiUrl] = useState<string>("");

  // Carica l'URL API effettivo
  useEffect(() => {
    const loadApiUrl = async () => {
      const url = await settingsService.getApiUrl();
      setApiUrl(url);
    };
    loadApiUrl();
  }, []);

  const curlCommand = `curl -X POST ${apiUrl}/api/v1/messages \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Test Notification",
    "body": "Hello from Zentik!",
    "magicCode": "${magicCode || "YOUR_MAGIC_CODE"}"
  }'`;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert(
        t("common.success"),
        t("onboardingV2.step6.copied", { item: label })
      );
    } catch (error) {
      Alert.alert(t("common.error"), t("onboardingV2.step6.copyError"));
    }
  };

  const openDocumentation = async () => {
    try {
      await Linking.openURL(
        "https://notifier-docs.zentik.app/docs/notifications"
      );
    } catch (error) {
      Alert.alert(t("common.error"), t("onboardingV2.step6.openDocError"));
    }
  };

  return (
    <ScrollView style={styles.stepContainer}>
      <View style={styles.stepContent}>
        <Icon source="check-circle" size={64} color={theme.colors.primary} />
        <Text variant="headlineMedium" style={styles.stepTitle}>
          {t("onboardingV2.step6.title")}
        </Text>
        <Text variant="bodyLarge" style={styles.stepDescription}>
          {t("onboardingV2.step6.description")}
        </Text>

        {/* API Configuration Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t("onboardingV2.step6.apiConfiguration")}
          </Text>

          {/* API URL */}
          <Card style={styles.infoCard} elevation={0}>
            <Card.Content>
              <View style={styles.infoRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="labelSmall" style={styles.infoLabel}>
                    {t("onboardingV2.step6.apiUrl")}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={styles.infoValue}
                    selectable
                  >
                    {apiUrl}/api/v1/messages
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    copyToClipboard(`${apiUrl}/api/v1/messages`, "API URL")
                  }
                >
                  <Icon
                    source="content-copy"
                    size={20}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </Card.Content>
          </Card>

          {/* Magic Code */}
          {magicCode && (
            <Card style={styles.infoCard} elevation={0}>
              <Card.Content>
                <View style={styles.infoRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="labelSmall" style={styles.infoLabel}>
                      {t("buckets.form.magicCode" as any)}
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={[styles.infoValue, styles.magicCodeValue]}
                      selectable
                    >
                      {magicCode}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(magicCode, "Magic Code")}
                  >
                    <Icon
                      source="content-copy"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              </Card.Content>
            </Card>
          )}
        </View>

        {/* cURL Example Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t("onboardingV2.step6.curlExample")}
          </Text>
          <Card style={styles.codeCard} elevation={0}>
            <Card.Content>
              <Text variant="bodySmall" style={styles.codeText} selectable>
                {curlCommand}
              </Text>
            </Card.Content>
          </Card>
          <Button
            mode="outlined"
            icon="content-copy"
            onPress={() => copyToClipboard(curlCommand, "cURL")}
            compact
            style={styles.copyButton}
          >
            {t("onboardingV2.step6.copyCurl")}
          </Button>
        </View>

        {/* Completion Message */}
        <View
          style={[styles.completionBox, { borderColor: theme.colors.primary }]}
        >
          <Icon source="party-popper" size={48} color={theme.colors.primary} />
          <Text variant="titleLarge" style={styles.completionTitle}>
            {t("onboardingV2.step6.congratulations")}
          </Text>
          <Text variant="bodyMedium" style={styles.completionText}>
            {t("onboardingV2.step6.completionMessage")}
          </Text>
        </View>

        {/* Documentation Link */}
        <View style={styles.docBox}>
          <Icon source="book-open-variant" size={48} color="#2196F3" />
          <Text variant="titleLarge" style={styles.completionTitle}>
            {t("onboardingV2.step6.documentationTitle")}
          </Text>
          <Text variant="bodyMedium" style={styles.completionText}>
            {t("onboardingV2.step6.documentationDescription")}
          </Text>
          <Button
            mode="contained"
            icon="open-in-new"
            onPress={openDocumentation}
            style={styles.docButton}
          >
            {t("onboardingV2.step6.openDocumentation")}
          </Button>
        </View>
      </View>
    </ScrollView>
  );
});

Step6.displayName = "Step6";

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
    fontWeight: "600",
  },
  infoCard: {
    marginBottom: 12,
    backgroundColor: "rgba(0, 0, 0, 0.03)",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoLabel: {
    marginBottom: 4,
    opacity: 0.6,
    fontWeight: "600",
  },
  infoValue: {
    fontWeight: "500",
  },
  tokenValue: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 11,
    opacity: 0.8,
  },
  magicCodeValue: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  codeCard: {
    marginBottom: 12,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  codeText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 11,
    lineHeight: 18,
    opacity: 0.8,
  },
  copyButton: {
    alignSelf: "flex-end",
  },
  completionBox: {
    alignItems: "center",
    padding: 24,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 2,
    backgroundColor: "rgba(0, 200, 0, 0.05)",
  },
  completionTitle: {
    marginTop: 12,
    marginBottom: 8,
    textAlign: "center",
    fontWeight: "bold",
  },
  completionText: {
    textAlign: "center",
    opacity: 0.8,
    lineHeight: 22,
  },
  docBox: {
    alignItems: "center",
    padding: 24,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#2196F3",
    backgroundColor: "rgba(33, 150, 243, 0.08)",
  },
  docButton: {
    marginTop: 16,
  },
});

export default Step6;
