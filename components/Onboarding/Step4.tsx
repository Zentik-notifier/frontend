import React, { memo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Icon, Text, useTheme } from "react-native-paper";
import { useOnboarding } from "./OnboardingContext";

const Step4 = memo(() => {
  const theme = useTheme();
  const { deviceRegistered, bucketCreated, tokenCreated } = useOnboarding();

  return (
    <ScrollView style={styles.stepContainer}>
      <View style={styles.stepContent}>
        <Icon source="send" size={64} color={theme.colors.primary} />
        <Text variant="headlineMedium" style={styles.stepTitle}>
          Setup Messaging
        </Text>
        <Text variant="bodyLarge" style={styles.stepDescription}>
          We'll create your first bucket and access token.
        </Text>

        <View style={styles.section}>
          <Card style={styles.statusCard}>
            <Card.Content>
              <View style={styles.statusRow}>
                <Icon
                  source={deviceRegistered ? "check-circle" : "circle-outline"}
                  size={24}
                  color={
                    deviceRegistered
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant
                  }
                />
                <Text variant="titleMedium">Device Registration</Text>
              </View>
              <Text variant="bodySmall" style={styles.statusText}>
                {deviceRegistered
                  ? "Your device is registered for push notifications"
                  : "We'll register your device"}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statusCard}>
            <Card.Content>
              <View style={styles.statusRow}>
                <Icon
                  source={bucketCreated ? "check-circle" : "circle-outline"}
                  size={24}
                  color={
                    bucketCreated
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant
                  }
                />
                <Text variant="titleMedium">Bucket Created</Text>
              </View>
              <Text variant="bodySmall" style={styles.statusText}>
                {bucketCreated
                  ? "Your first bucket is ready"
                  : "We'll create your first bucket"}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statusCard}>
            <Card.Content>
              <View style={styles.statusRow}>
                <Icon
                  source={tokenCreated ? "check-circle" : "circle-outline"}
                  size={24}
                  color={
                    tokenCreated
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant
                  }
                />
                <Text variant="titleMedium">Access Token</Text>
              </View>
              <Text variant="bodySmall" style={styles.statusText}>
                {tokenCreated
                  ? "Access token generated"
                  : "We'll create an access token for API access"}
              </Text>
            </Card.Content>
          </Card>
        </View>
      </View>
    </ScrollView>
  );
});

Step4.displayName = "Step4";

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
  statusCard: {
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  statusText: {
    marginLeft: 36,
    opacity: 0.8,
  },
});

export default Step4;
