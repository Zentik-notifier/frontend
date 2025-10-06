import CreateWebhookForm from "@/components/CreateWebhookForm";
import EntityExecutionsSection from "@/components/EntityExecutionsSection";
import PaperScrollView from "@/components/ui/PaperScrollView";
import {
  ExecutionType,
  useDeleteWebhookMutation,
  useGetWebhookQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button, Surface, useTheme } from "react-native-paper";

interface EditWebhookProps {
  webhookId: string;
}

export default function EditWebhook({ webhookId }: EditWebhookProps) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const { data, loading, error, refetch } = useGetWebhookQuery({
    variables: { id: webhookId },
    skip: !webhookId,
  });

  const handleRefresh = async () => {
    await refetch();
  };

  const [deleteWebhookMutation, { loading: deletingWebhook }] =
    useDeleteWebhookMutation({
      onCompleted: () => {
        router.back();
      },
      onError: (error) => {
        console.error("Error deleting webhook:", error);
        Alert.alert("Error", error.message || "Failed to delete webhook");
      },
    });

  const webhook = data?.webhook;

  const deleteWebhook = () => {
    if (!webhook) return;
    Alert.alert(
      t("webhooks.deleteConfirmTitle"),
      t("webhooks.deleteConfirmMessage", { webhookName: webhook.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("webhooks.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteWebhookMutation({ variables: { id: webhook.id } });
            } catch {}
          },
        },
      ]
    );
  };

  return (
    <PaperScrollView
      onRefresh={handleRefresh}
      loading={loading}
      error={!!error}
    >
      <CreateWebhookForm webhookId={webhookId} />
      <EntityExecutionsSection
        entityId={webhookId}
        entityType={ExecutionType.Webhook}
      />
      <View style={styles.deleteSection}>
        <Button
          mode="contained"
          buttonColor={theme.colors.error}
          textColor={theme.colors.onError}
          icon="delete"
          onPress={deleteWebhook}
          loading={deletingWebhook}
          disabled={deletingWebhook}
          style={styles.deleteButton}
        >
          {deletingWebhook ? "Deleting..." : t("webhooks.delete")}
        </Button>
      </View>
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16, opacity: 0.7 },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: "#dc3545" },
  deleteSection: { padding: 16, marginTop: 8 },
  deleteButton: { marginTop: 0 },
});
