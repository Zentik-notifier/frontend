import React, { memo, useState, useCallback } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
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

const Step5 = memo(() => {
  const theme = useTheme();
  const { t } = useI18n();
  const { sendTestNotification } = useOnboarding();

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
