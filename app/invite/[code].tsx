import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, View, StyleSheet } from "react-native";
import { Text, ActivityIndicator, useTheme } from "react-native-paper";
import { useI18n } from "@/hooks/useI18n";

export default function InviteCodeRedirect() {
  const { code, env } = useLocalSearchParams<{ code: string; env?: string }>();
  const theme = useTheme();
  const { t } = useI18n();
  const [deepLink, setDeepLink] = useState<string>("");

  useEffect(() => {
    if (code) {
      // On web, redirect to appropriate app based on env parameter
      // On native, this route is handled by the deep link system directly
      if (Platform.OS === 'web') {
        // env=dev → zentik.dev://invite/{code}
        // default → zentik://invite/{code}
        const scheme = env === 'dev' ? 'zentik.dev' : 'zentik';
        const generatedDeepLink = `${scheme}://invite/${code}`;
        setDeepLink(generatedDeepLink);
        
        console.log('[InviteRedirect] Opening deep link:', generatedDeepLink, 'for env:', env || 'prod');
        window.location.href = generatedDeepLink;
        
        // After 2 seconds, show manual instructions if app didn't open
        setTimeout(() => {
          console.log('App did not open, showing instructions');
        }, 2000);
      }
    }
  }, [code, env]);

  // This component is only shown on web
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text variant="headlineMedium" style={styles.title}>
          🎉 {t("buckets.inviteCodes.shareTitle")}
        </Text>
        
        <View style={styles.codeContainer}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {t("buckets.inviteCodes.inviteCode")}:
          </Text>
          <Text variant="headlineSmall" style={[styles.code, { color: theme.colors.primary }]}>
            {code}
          </Text>
        </View>

        {deepLink && (
          <View style={styles.schemeContainer}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
              Opening:
            </Text>
            <Text variant="bodySmall" style={[styles.schemeText, { color: theme.colors.secondary }]}>
              {deepLink}
            </Text>
          </View>
        )}

        <ActivityIndicator size="large" style={styles.spinner} />
        
        <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onSurface }]}>
          {t("buckets.inviteCodes.openingApp")}...
        </Text>
        
        <View style={styles.divider} />
        
        <Text variant="bodySmall" style={[styles.instructions, { color: theme.colors.onSurfaceVariant }]}>
          {t("buckets.inviteCodes.appNotOpening")}
        </Text>
        
        <Text variant="bodySmall" style={[styles.instructions, { color: theme.colors.onSurfaceVariant }]}>
          {t("buckets.inviteCodes.manualInstructions")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#667eea",
  },
  card: {
    maxWidth: 500,
    width: "100%",
    padding: 40,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 8,
  },
  title: {
    textAlign: "center",
    marginBottom: 24,
  },
  codeContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  code: {
    fontWeight: "bold",
    letterSpacing: 2,
    marginTop: 8,
  },
  schemeContainer: {
    alignItems: "center",
    marginBottom: 24,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
  },
  schemeText: {
    fontFamily: "monospace",
    textAlign: "center",
  },
  spinner: {
    marginVertical: 24,
  },
  message: {
    textAlign: "center",
    marginBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginVertical: 24,
  },
  instructions: {
    textAlign: "center",
    marginTop: 8,
    opacity: 0.7,
  },
});

