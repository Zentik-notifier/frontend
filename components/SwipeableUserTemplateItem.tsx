import { useAppContext } from "@/contexts/AppContext";
import {
  GetUserTemplatesDocument,
  GetUserTemplatesQuery,
  useDeleteUserTemplateMutation,
  UserTemplateFragment,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import SwipeableItem, { SwipeAction } from "./SwipeableItem";

interface SwipeableUserTemplateItemProps {
  userTemplate: UserTemplateFragment;
}

const SwipeableUserTemplateItem: React.FC<SwipeableUserTemplateItemProps> = ({
  userTemplate,
}) => {
  const { t } = useI18n();
  const theme = useTheme();
  const { navigateToEditUserTemplate } = useNavigationUtils();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();

  const isDisabled = isOfflineAuth || isBackendUnreachable;

  const [deleteUserTemplateMutation] = useDeleteUserTemplateMutation({
    update: (cache, { data }) => {
      if (data?.deleteUserTemplate) {
        const existingUserTemplates = cache.readQuery<GetUserTemplatesQuery>({
          query: GetUserTemplatesDocument,
        });
        if (existingUserTemplates?.userTemplates) {
          cache.writeQuery({
            query: GetUserTemplatesDocument,
            data: {
              userTemplates: existingUserTemplates.userTemplates.filter(
                (template: UserTemplateFragment) =>
                  template.id !== userTemplate.id
              ),
            },
          });
        }
      }
    },
    onError: (error) => {
      console.error("Error deleting user template:", error);
      Alert.alert(
        t("common.error"),
        error.message || t("userTemplates.deleteErrorMessage")
      );
    },
  });

  const handleEditPress = () => {
    navigateToEditUserTemplate(userTemplate.id);
  };

  const handleDeletePress = async () => {
    Alert.alert(
      t("userTemplates.deleteConfirmTitle"),
      t("userTemplates.deleteConfirmMessage"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("userTemplates.delete"),
          style: "destructive",
          onPress: async () => {
            await deleteUserTemplateMutation({
              variables: { id: userTemplate.id },
            });
          },
        },
      ]
    );
  };

  const leftAction: SwipeAction | undefined = {
    icon: "pencil",
    label: t("userTemplates.edit"),
    backgroundColor: theme.colors.primary,
    onPress: handleEditPress,
  };

  const rightAction: SwipeAction | undefined = !isDisabled
    ? {
        icon: "delete",
        label: t("userTemplates.delete"),
        destructive: true,
        onPress: handleDeletePress,
      }
    : undefined;

  const templatePreview = userTemplate.template
    ? userTemplate.template.substring(0, 100) +
      (userTemplate.template.length > 100 ? "..." : "")
    : "";

  return (
    <SwipeableItem
      showMenu={!isDisabled}
      leftAction={leftAction}
      rightAction={rightAction}
    >
      <Pressable onPress={handleEditPress}>
        <View style={styles.templateContent}>
          <View style={styles.templateHeader}>
            <View style={styles.templateInfo}>
              <Text variant="titleMedium" style={styles.templateName}>
                {userTemplate.name || t("userTemplates.template")}
              </Text>
              {userTemplate.description && (
                <Text
                  variant="bodySmall"
                  style={[styles.templateDescription, { color: theme.colors.outline }]}
                  numberOfLines={2}
                >
                  {userTemplate.description}
                </Text>
              )}
              <Text
                variant="bodySmall"
                style={[styles.templateSubtitle, { color: theme.colors.outline }]}
              >
                {t("common.created")}:{" "}
                {new Date(userTemplate.createdAt).toLocaleDateString()}
              </Text>
              {templatePreview && (
                <Text
                  variant="bodySmall"
                  style={[styles.templatePreview, { color: theme.colors.outline }]}
                  numberOfLines={2}
                >
                  {templatePreview}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </SwipeableItem>
  );
};

const styles = StyleSheet.create({
  templateContent: {
    padding: 16,
  },
  templateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    marginBottom: 4,
  },
  templateDescription: {
    marginBottom: 4,
  },
  templateSubtitle: {
    marginBottom: 8,
  },
  templatePreview: {
    fontFamily: "monospace",
    fontSize: 12,
  },
});

export default SwipeableUserTemplateItem;
