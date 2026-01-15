import React, { memo, useState, useCallback, useMemo } from "react";
import { ScrollView, StyleSheet, View, Linking, Keyboard } from "react-native";
import {
  Button,
  Card,
  Icon,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useOnboarding } from "./OnboardingContext";
import { useI18n } from "@/hooks/useI18n";
import { BUCKET_PRESETS } from "@/config/bucketPresets";

const Step5 = memo(() => {
  const theme = useTheme();
  const { t } = useI18n();
  const { sendTestNotification, step4SelectedTemplateId, step4BucketSelectionMode } = useOnboarding();

  const selectedPreset = useMemo(() => {
    if (step4BucketSelectionMode === "create" && step4SelectedTemplateId) {
      return BUCKET_PRESETS.find((p) => p.id === step4SelectedTemplateId);
    }
    return null;
  }, [step4SelectedTemplateId, step4BucketSelectionMode]);

  const handleOpenDocs = useCallback(async () => {
    if (selectedPreset?.docsUrl) {
      const canOpen = await Linking.canOpenURL(selectedPreset.docsUrl);
      if (canOpen) {
        await Linking.openURL(selectedPreset.docsUrl);
      }
    }
  }, [selectedPreset]);

  const [title, setTitle] = useState(t("onboardingV2.step5.defaultTitle"));
  const [body, setBody] = useState(t("onboardingV2.step5.defaultBody"));
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSendTestNotification = useCallback(async () => {
    setSending(true);
    setResult(null);

    try {
      const result = await sendTestNotification(title, body);
      setResult(result);
    } catch (error) {
      console.error("[Step5] Failed to send test notification:", error);
      setResult({
        success: false,
        message: t("onboardingV2.step5.sendError"),
      });
    } finally {
      setSending(false);
    }
  }, [sendTestNotification, title, body, t]);

  return (
    <ScrollView style={styles.stepContainer}>
      <View style={styles.stepContent}>
        <Icon source="bell-ring" size={64} color={theme.colors.primary} />
        <Text variant="headlineMedium" style={styles.stepTitle}>
          {t("onboardingV2.step5.title")}
        </Text>
        <Text variant="bodyLarge" style={styles.stepDescription}>
          {t("onboardingV2.step5.description")}
        </Text>

        <View style={styles.section}>
          <TextInput
            mode="outlined"
            label={t("onboardingV2.step5.titleLabel")}
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            left={<TextInput.Icon icon="format-title" />}
            returnKeyType="next"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          <TextInput
            mode="outlined"
            label={t("onboardingV2.step5.bodyLabel")}
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={3}
            style={styles.input}
            left={<TextInput.Icon icon="text" />}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />

          <Button
            mode="contained"
            icon="send"
            style={styles.sendButton}
            onPress={handleSendTestNotification}
            loading={sending}
            disabled={sending || !title.trim() || !body.trim()}
          >
            {sending
              ? t("onboardingV2.step5.sending")
              : t("onboardingV2.step5.sendButton")}
          </Button>

          {result && (
            <Card
              style={[
                styles.resultCard,
                {
                  backgroundColor: result.success
                    ? "rgba(0, 200, 0, 0.1)"
                    : "rgba(255, 0, 0, 0.1)",
                },
              ]}
              elevation={0}
            >
              <Card.Content>
                <View style={styles.resultRow}>
                  <Icon
                    source={result.success ? "check-circle" : "alert-circle"}
                    size={24}
                    color={
                      result.success ? theme.colors.primary : theme.colors.error
                    }
                  />
                  <Text variant="bodyMedium" style={styles.resultText}>
                    {result.message}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          )}
        </View>

        {selectedPreset?.docsUrl && (
          <Card style={styles.docsCard} elevation={0}>
            <Card.Content>
              <View style={styles.docsRow}>
                <Icon source="book-open" size={24} color={theme.colors.primary} />
                <View style={styles.docsContent}>
                  <Text variant="titleSmall" style={styles.docsTitle}>
                    {t("onboardingV2.step5.docsTitle", { name: selectedPreset.name })}
                  </Text>
                  <Text variant="bodySmall" style={styles.docsDescription}>
                    {t("onboardingV2.step5.docsDescription")}
                  </Text>
                  <Button
                    mode="text"
                    icon="open-in-new"
                    onPress={handleOpenDocs}
                    style={styles.docsButton}
                    textColor={theme.colors.primary}
                  >
                    {t("onboardingV2.step5.openDocs")}
                  </Button>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        <View style={styles.infoBox}>
          <Icon source="information" size={20} color={theme.colors.primary} />
          <Text variant="bodySmall" style={styles.infoText}>
            {t("onboardingV2.step5.info")}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
});

Step5.displayName = "Step5";

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
  input: {
    width: "100%",
    marginBottom: 16,
  },
  sendButton: {
    marginVertical: 8,
  },
  resultCard: {
    marginTop: 16,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  resultText: {
    flex: 1,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  infoText: {
    flex: 1,
    opacity: 0.8,
  },
  docsCard: {
    width: "100%",
    marginBottom: 24,
    backgroundColor: "rgba(33, 150, 243, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(33, 150, 243, 0.2)",
  },
  docsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  docsContent: {
    flex: 1,
  },
  docsTitle: {
    marginBottom: 4,
  },
  docsDescription: {
    marginBottom: 8,
    opacity: 0.7,
  },
  docsButton: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
});

export default Step5;
