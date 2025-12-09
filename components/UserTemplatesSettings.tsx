import { useGetUserTemplatesQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";
import SwipeableUserTemplateItem from "./SwipeableUserTemplateItem";
import PaperScrollView from "./ui/PaperScrollView";

export default function UserTemplatesSettings() {
  const { t } = useI18n();
  const theme = useTheme();
  const { navigateToCreateUserTemplate } = useNavigationUtils();

  const {
    data: userTemplatesData,
    loading: loadingUserTemplates,
    refetch,
    error: errorUserTemplates,
  } = useGetUserTemplatesQuery();

  const handleCreate = () => {
    navigateToCreateUserTemplate();
  };

  const userTemplates = userTemplatesData?.userTemplates || [];

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <PaperScrollView
      onRefresh={handleRefresh}
      loading={loadingUserTemplates}
      onAdd={handleCreate}
      error={!!errorUserTemplates && !loadingUserTemplates}
      onRetry={handleRefresh}
    >
      {userTemplates.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon
            source="file-document"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="headlineSmall" style={styles.emptyText}>
            {t("userTemplates.noTemplatesTitle")}
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            {t("userTemplates.noTemplatesSubtext")}
          </Text>
        </View>
      ) : (
        <View>
          {userTemplates.map((item) => (
            <SwipeableUserTemplateItem key={item.id} userTemplate={item} />
          ))}
        </View>
      )}
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: "center",
  },
});
