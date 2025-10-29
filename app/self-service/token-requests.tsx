import UserSystemAccessTokenRequests from "@/components/UserSystemAccessTokenRequests";
import { usePublicAppConfigQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useEffect } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useTheme } from "react-native-paper";
import { Redirect } from "expo-router";

export default function TokenRequestsPage() {
  const { t } = useI18n();
  const theme = useTheme();
  const { navigateToHome } = useNavigationUtils();
  const { data: appConfigData, loading } = usePublicAppConfigQuery();

  const isEnabled = appConfigData?.publicAppConfig?.systemTokenRequestsEnabled;

  useEffect(() => {
    if (!loading && !isEnabled) {
      navigateToHome();
    }
  }, [loading, isEnabled, navigateToHome]);

  if (loading) {
    return null;
  }

  if (!isEnabled) {
    return <Redirect href="/" />;
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.container]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
    >
      <View style={{ backgroundColor: theme.colors.background }}>
        <UserSystemAccessTokenRequests />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
