import React, { memo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Icon, Text, useTheme } from "react-native-paper";
import { useOnboarding } from "./OnboardingContext";

const Step5 = memo(() => {
  const theme = useTheme();
  const { sendTestNotification } = useOnboarding();

  return (
    <ScrollView style={styles.stepContainer}>
      <View style={styles.stepContent}>
        <Icon source="bell-ring" size={64} color={theme.colors.primary} />
        <Text variant="headlineMedium" style={styles.stepTitle}>
          Test Notification
        </Text>
        <Text variant="bodyLarge" style={styles.stepDescription}>
          Let's send a test notification to verify everything is working.
        </Text>

        <View style={styles.section}>
          <Button
            mode="contained"
            icon="send"
            style={styles.sendButton}
            onPress={sendTestNotification}
          >
            Send Test Notification
          </Button>
        </View>

        <View style={styles.infoBox}>
          <Icon source="information" size={20} color={theme.colors.primary} />
          <Text variant="bodySmall" style={styles.infoText}>
            You should receive a notification shortly. If you don't, check your
            device notification settings.
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
  sendButton: {
    marginVertical: 16,
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
