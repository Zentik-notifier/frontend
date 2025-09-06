import CreateOAuthProviderForm from "@/components/CreateOAuthProviderForm";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import IconButton from "@/components/ui/IconButton";
import {
    OAuthProviderType,
    useDeleteOAuthProviderMutation,
    useOAuthProviderQuery
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    View
} from "react-native";

export default function EditOAuthProviderPage() {
  const { providerId } = useLocalSearchParams<{ providerId: string }>();
  const router = useRouter();
  const { t } = useI18n();

  // GraphQL query to get OAuth provider
  const { data, loading, error } = useOAuthProviderQuery({
    variables: { id: providerId },
  });

  // GraphQL mutation for deleting OAuth provider
  const [deleteOAuthProvider, { loading: deletingProvider }] = useDeleteOAuthProviderMutation();

  // Early return if no ID
  if (!providerId) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>{t('administration.oauthProviderForm.noIdProvided')}</ThemedText>
      </ThemedView>
    );
  }

  const provider = data?.oauthProvider;

  const deleteProvider = () => {
    if (!provider) return;

    Alert.alert(
      t('administration.oauthProviderForm.delete.title'),
      t('administration.oauthProviderForm.delete.message', { name: provider.name }),
      [
        { text: t('administration.oauthProviderForm.delete.cancel'), style: "cancel" },
        {
          text: t('administration.oauthProviderForm.delete.delete'),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteOAuthProvider({
                variables: { id: providerId },
                refetchQueries: ['AllOAuthProviders'],
              });
              Alert.alert(
                t('administration.oauthProviderForm.success.title'), 
                t('administration.oauthProviderForm.success.deleted'), 
                [{ text: t('administration.oauthProviderForm.success.ok'), onPress: () => router.back() }]
              );
            } catch (error) {
              console.error('Error deleting OAuth provider:', error);
              Alert.alert(
                t('administration.oauthProviderForm.validation.error'), 
                t('administration.oauthProviderForm.delete.error')
              );
            }
          },
        },
      ]
    );
  };

  // Handle GraphQL error
  if (error) {
    console.error('Error loading OAuth provider:', error);
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>{t('administration.oauthProviderForm.loading')}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!provider) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{t('administration.oauthProviderForm.notFound')}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <CreateOAuthProviderForm
          provider={provider}
          showTitle={true}
          isEditing={true}
        />
        
        {/* Delete Provider Button - Only show for custom providers */}
        {provider.type === OAuthProviderType.Custom && (
          <View style={styles.deleteSection}>
            <IconButton
              title={deletingProvider ? t('administration.oauthProviderForm.delete.deleting') : t('administration.oauthProviderForm.delete.title')}
              iconName="delete"
              onPress={deleteProvider}
              variant="danger"
              size="lg"
              disabled={deletingProvider}
            />
          </View>
        )}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.6,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#ff6b6b',
  },
  deleteSection: {
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#ffebee',
  },
});
