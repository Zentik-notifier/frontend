import CreateWebhookForm from "@/components/CreateWebhookForm";
import { useDeleteWebhookMutation, useGetWebhookQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import {
  Surface,
  Button,
  useTheme,
} from "react-native-paper";
import SettingsScrollView from "@/components/SettingsScrollView";
import { useRouter } from "expo-router";

interface EditWebhookSectionProps {
  webhookId: string;
}

export default function EditWebhookSection({ webhookId }: EditWebhookSectionProps) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();

  const { data, loading, error } = useGetWebhookQuery({
    variables: { id: webhookId },
    skip: !webhookId,
  });

  const [deleteWebhookMutation, { loading: deletingWebhook }] = useDeleteWebhookMutation({
    onCompleted: () => { router.back(); },
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

  if (error) {
    console.error("Error loading webhooks:", error);
  }

  if (loading) {
    return (
      <Surface style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading webhook...</Text>
        </View>
      </Surface>
    );
  }

  if (!webhook) {
    return (
      <Surface style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Webhook not found</Text>
        </View>
      </Surface>
    );
  }

  return (
    <Surface style={styles.container}>
      <SettingsScrollView>
        <CreateWebhookForm webhookId={webhookId} />
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
      </SettingsScrollView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16, opacity: 0.7 },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: "#dc3545" },
  deleteSection: { padding: 16, marginTop: 8 },
  deleteButton: { marginTop: 0 },
});


