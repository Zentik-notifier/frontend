import React, { memo, useState, useCallback } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Icon, Text, TextInput, useTheme } from "react-native-paper";
import { useOnboarding } from "./OnboardingContext";
import { useI18n } from "@/hooks";
import { ApiConfigService } from "@/services/api-config";

const Step5 = memo(() => {
  const theme = useTheme();
  const { t } = useI18n();
  const { generatedToken, bucketId } = useOnboarding();

  const [title, setTitle] = useState(t("onboardingV2.step5.defaultTitle"));
  const [body, setBody] = useState(t("onboardingV2.step5.defaultBody"));
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const sendTestNotification = useCallback(async () => {
    if (!generatedToken || !bucketId) {
      setResult({
        success: false,
        message: t("onboardingV2.step5.missingTokenOrBucket"),
      });
      return;
    }

    if (!title.trim() || !body.trim()) {
      setResult({
        success: false,
        message: t("onboardingV2.step5.missingFields"),
      });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const apiUrl = await ApiConfigService.getApiUrl();
      const response = await fetch(`${apiUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${generatedToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          bucketId,
          actions: [],
          addMarkAsReadAction: false,
          addDeleteAction: false,
          addSnoozeAction: false,
          addOpenAction: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("[Step5] Test notification sent successfully:", data.id);
        setResult({
          success: true,
          message: t("onboardingV2.step5.sendSuccess"),
        });
      } else {
        const errorText = await response.text();
        console.error("[Step5] Error sending test notification:", response.status, errorText);
        setResult({
          success: false,
          message: t("onboardingV2.step5.sendError"),
        });
      }
    } catch (error) {
      console.error("[Step5] Failed to send test notification:", error);
      setResult({
        success: false,
        message: t("onboardingV2.step5.sendError"),
      });
    } finally {
      setSending(false);
    }
  }, [generatedToken, bucketId, title, body, t]);

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
          />

          <Button
            mode="contained"
            icon="send"
            style={styles.sendButton}
            onPress={sendTestNotification}
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
                    color={result.success ? theme.colors.primary : theme.colors.error}
                  />
                  <Text variant="bodyMedium" style={styles.resultText}>
                    {result.message}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          )}
        </View>

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
});

export default Step5;
