import { useGetUserTemplatesQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Card, Icon, Text, useTheme } from "react-native-paper";
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
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.centered}>
            <Icon source="file-document" size={48} color={theme.colors.outline} />
            <Text
              variant="titleMedium"
              style={[styles.emptyTitle, { color: theme.colors.outline }]}
            >
              {t("userTemplates.noTemplatesTitle")}
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.emptySubtitle,
                { color: theme.colors.outlineVariant },
              ]}
            >
              {t("userTemplates.noTemplatesSubtext")}
            </Text>
          </Card.Content>
        </Card>
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
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCard: {
    marginTop: 24,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
  },
});
