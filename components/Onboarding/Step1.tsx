import React, { memo, useCallback } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Icon,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useOnboarding } from "./OnboardingContext";

const Step1 = memo(() => {
  const theme = useTheme();
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
          Welcome to Zentik Notifier
        </Text>
        <Text variant="bodyLarge" style={styles.stepDescription}>
          A powerful notification management system that helps you organize and
          control your notifications.
        </Text>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Server Configuration
          </Text>

          <View style={styles.switchRow}>
            <Text variant="bodyMedium">Use custom server</Text>
            <Switch
              value={useCustomServer}
              onValueChange={handleUseCustomServerChange}
            />
          </View>

          {useCustomServer && (
            <View style={styles.customServerSection}>
              <TextInput
                mode="outlined"
                label="Custom Server URL"
                value={customServerUrl}
                onChangeText={handleCustomServerUrlChange}
                placeholder="https://your-server.com"
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <Button
                mode="contained-tonal"
                onPress={testServerConnection}
                loading={testingServer}
                disabled={testingServer || !customServerUrl}
                icon="test-tube"
                style={styles.testButton}
              >
                Test Connection
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
