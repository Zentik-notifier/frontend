import CreateWebhookForm from "@/components/CreateWebhookForm";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import IconButton from "@/components/ui/IconButton";
import { useDeleteWebhookMutation, useGetWebhookQuery } from "@/generated/gql-operations-generated";
import React from "react";
import { Alert, StyleSheet, View } from "react-native";
import SettingsScrollView from "@/components/SettingsScrollView";
import { useRouter } from "expo-router";

interface EditWebhookSectionProps {
  webhookId: string;
}

export default function EditWebhookSection({ webhookId }: EditWebhookSectionProps) {
  const router = useRouter();

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
      "Delete Webhook",
      `Are you sure you want to delete "${webhook.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
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
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>Loading webhook...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!webhook) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>Webhook not found</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SettingsScrollView>
        <CreateWebhookForm webhookId={webhookId} showTitle={false} />
        <View style={styles.deleteSection}>
          <IconButton
            title={deletingWebhook ? "Deleting..." : "Delete Webhook"}
            iconName="delete"
            onPress={deleteWebhook}
            variant="danger"
            size="lg"
            disabled={deletingWebhook}
          />
        </View>
      </SettingsScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16, opacity: 0.7 },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: "#dc3545" },
  deleteSection: { padding: 16, marginTop: 20 },
});


