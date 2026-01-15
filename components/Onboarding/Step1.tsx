import React, { memo, useCallback } from "react";
import { ScrollView, StyleSheet, View, Keyboard } from "react-native";
import {
  Button,
  Card,
  Icon,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useI18n } from "@/hooks/useI18n";
import { useOnboarding } from "./OnboardingContext";

const Step1 = memo(() => {
  const theme = useTheme();
  const { t } = useI18n();
  const {
    customServerUrl,
    useCustomServer,
    testingServer,
    testResult,
    setCustomServerUrl,
    setUseCustomServer,
    setTestResult,
    testServerConnection,
  } = useOnboarding();

  const handleCustomServerUrlChange = useCallback((text: string) => {
    setCustomServerUrl(text);
    setTestResult(null);
  }, [setCustomServerUrl, setTestResult]);

  const handleUseCustomServerChange = useCallback((value: boolean) => {
    setUseCustomServer(value);
  }, [setUseCustomServer]);

  return (
    <ScrollView
      style={styles.stepContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.stepContent}>
        <Icon source="server" size={64} color={theme.colors.primary} />
        <Text variant="headlineMedium" style={styles.stepTitle}>
          {t("onboardingV2.step1.title")}
        </Text>
        <Text variant="bodyLarge" style={styles.stepDescription}>
          {t("onboardingV2.step1.description")}
        </Text>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t("onboardingV2.step1.serverConfiguration")}
          </Text>

          <View style={styles.switchRow}>
            <Text variant="bodyMedium">{t("onboardingV2.step1.useCustomServer")}</Text>
            <Switch
              value={useCustomServer}
              onValueChange={handleUseCustomServerChange}
            />
          </View>

          {useCustomServer && (
            <View style={styles.customServerSection}>
              <TextInput
                mode="outlined"
                label={t("onboardingV2.step1.customServerUrl")}
                value={customServerUrl}
                onChangeText={handleCustomServerUrlChange}
                placeholder={t("onboardingV2.step1.customServerPlaceholder")}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              <Button
                mode="contained-tonal"
                onPress={testServerConnection}
                loading={testingServer}
                disabled={testingServer || !customServerUrl}
                icon="test-tube"
                style={styles.testButton}
              >
                {t("onboardingV2.step1.testConnection")}
              </Button>

              {testResult && (
                <Card
                  style={[
                    styles.testResultCard,
                    {
                      backgroundColor: testResult.success
                        ? "rgba(76, 175, 80, 0.1)"
                        : "rgba(244, 67, 54, 0.1)",
                      borderColor: testResult.success ? "#4CAF50" : "#F44336",
                    },
                  ]}
                >
                  <Card.Content style={styles.testResultContent}>
                    <Icon
                      source={
                        testResult.success ? "check-circle" : "alert-circle"
                      }
                      size={20}
                      color={testResult.success ? "#4CAF50" : "#F44336"}
                    />
                    <Text
                      variant="bodySmall"
                      style={[
                        styles.testResultText,
                        {
                          color: testResult.success ? "#4CAF50" : "#F44336",
                        },
                      ]}
                    >
                      {testResult.message}
                    </Text>
                  </Card.Content>
                </Card>
              )}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
});

Step1.displayName = "Step1";

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
  customServerSection: {
    marginTop: 16,
    gap: 12,
  },
  input: {
    marginBottom: 8,
  },
  testButton: {
    marginTop: 8,
  },
  testResultCard: {
    marginTop: 12,
    borderWidth: 2,
  },
  testResultContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  testResultText: {
    flex: 1,
    fontWeight: "500",
  },
});

export default Step1;
