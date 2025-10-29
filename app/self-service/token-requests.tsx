import UserSystemAccessTokenRequests from "@/components/UserSystemAccessTokenRequests";
import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useTheme } from "react-native-paper";

export default function TokenRequestsPage() {
  const { t } = useI18n();
  const theme = useTheme();

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
