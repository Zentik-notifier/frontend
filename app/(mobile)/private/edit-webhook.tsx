import CreateWebhookForm from "@/components/CreateWebhookForm";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import IconButton from "@/components/ui/IconButton";
import {
  useDeleteWebhookMutation,
  useGetWebhookQuery,
} from "@/generated/gql-operations-generated";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

export default function EditWebhookScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const { data, loading, error } = useGetWebhookQuery({
    variables: {
      id: id as string,
    },
    skip: !id,
  });

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
      "Delete Webhook",
      `Are you sure you want to delete "${webhook.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteWebhookMutation({
                variables: { id: webhook.id },
              });
              // Success handled by onCompleted callback
            } catch (error) {
              // Error handled by onError callback
            }
          },
        },
      ]
    );
  };

  // Handle GraphQL error
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
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <CreateWebhookForm webhookId={id as string} showTitle />

        {/* Delete Webhook Button */}
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
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#dc3545",
  },
  deleteSection: {
    padding: 16,
    marginTop: 20,
  },
});
