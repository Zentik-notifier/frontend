import React, { memo } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { Card, Icon, Text, useTheme } from "react-native-paper";
import { useOnboarding } from "./OnboardingContext";

const Step6 = memo(() => {
  const theme = useTheme();
  const { generatedToken, bucketId } = useOnboarding();

  const curlCommand = `curl -X POST https://api.zentik.com/notifications \\
  -H "Authorization: Bearer ${generatedToken || "YOUR_TOKEN"}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Test",
    "message": "Hello World!",
    "bucketId": "${bucketId || "YOUR_BUCKET_ID"}"
  }'`;

  return (
    <ScrollView style={styles.stepContainer}>
      <View style={styles.stepContent}>
        <Icon source="code-braces" size={64} color={theme.colors.primary} />
        <Text variant="headlineMedium" style={styles.stepTitle}>
          API Integration
        </Text>
        <Text variant="bodyLarge" style={styles.stepDescription}>
          Here's how to send notifications programmatically.
        </Text>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            cURL Command
          </Text>
          <Card style={styles.codeCard}>
            <Card.Content>
              <Text variant="bodySmall" style={styles.codeText}>
                {curlCommand}
              </Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.completionBox}>
          <Icon source="party-popper" size={32} color={theme.colors.primary} />
          <Text variant="titleLarge" style={styles.completionTitle}>
            All Set!
          </Text>
          <Text variant="bodyMedium" style={styles.completionText}>
            You're ready to start receiving notifications. Enjoy using Zentik
            Notifier!
          </Text>
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
  },
  codeCard: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  codeText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    opacity: 0.8,
  },
  completionBox: {
    alignItems: "center",
    padding: 24,
    borderRadius: 12,
    marginTop: 24,
    borderWidth: 2,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  completionTitle: {
    marginTop: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  completionText: {
    textAlign: "center",
    opacity: 0.8,
  },
});

export default Step6;
