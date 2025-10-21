import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, View, StyleSheet, ScrollView } from "react-native";
import { Text, ActivityIndicator, useTheme } from "react-native-paper";
import { useI18n } from "@/hooks/useI18n";
import RedeemInviteCodeModal from "@/components/RedeemInviteCodeModal";
import { useNavigationUtils } from "@/utils/navigation";
import { ResourceType } from "@/generated/gql-operations-generated";
// import * as Linking from 'expo-linking';

// console.log(Linking.createURL('/'));

export default function InviteCodeRedirect() {
  const { code, env } = useLocalSearchParams<{ code: string; env?: string }>();
  const theme = useTheme();
  const { t } = useI18n();
  const [initialCode, setInitialCode] = useState<string>();
  const { navigateToBucketDetail, navigateToHome } = useNavigationUtils();

  useEffect(() => {
    setInitialCode(code);
  }, [code]);

  const handleRedeemSuccess = (resourceType: string, resourceId: string) => {
    console.log("[AppContext] Invite code redeemed successfully:", {
      resourceType,
      resourceId,
    });

    if (resourceType === ResourceType.Bucket) {
      navigateToBucketDetail(resourceId);
    }
  };

  useEffect(() => {
    if (Platform.OS === "web" && code) {
      const scheme = env === "dev" ? "zentik.dev" : "zentik";
      const generatedDeepLink = `${scheme}://invite/${code}`;

      console.log(
        "[InviteRedirect] Opening deep link:",
        generatedDeepLink,
        "for env:",
        env || "prod"
      );
      window.location.href = generatedDeepLink;

      setTimeout(() => {
        console.log("App did not open, showing instructions");
      }, 2000);
    }
  }, [code, env]);

  if (Platform.OS !== "web") {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <RedeemInviteCodeModal
            onCancel={navigateToHome}
            onSuccess={handleRedeemSuccess}
            initialCode={initialCode}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.webContainer}>
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text variant="headlineMedium" style={styles.title}>
          🎉 {t("buckets.inviteCodes.shareTitle")}
        </Text>

        <View style={styles.codeContainer}>
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {t("buckets.inviteCodes.inviteCode")}:
          </Text>
          <Text
            variant="headlineSmall"
            style={[styles.code, { color: theme.colors.primary }]}
          >
            {code}
          </Text>
        </View>

        <ActivityIndicator size="large" style={styles.spinner} />

        <Text
          variant="bodyMedium"
          style={[styles.message, { color: theme.colors.onSurface }]}
        >
          {t("buckets.inviteCodes.openingApp")}...
        </Text>

        <View style={styles.divider} />

        <Text
          variant="bodySmall"
          style={[
            styles.instructions,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {t("buckets.inviteCodes.appNotOpening")}
        </Text>

        <Text
          variant="bodySmall"
          style={[
            styles.instructions,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {t("buckets.inviteCodes.manualInstructions")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    minHeight: "100%",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  webContainer: {
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
