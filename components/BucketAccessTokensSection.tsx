import { useI18n } from "@/hooks/useI18n";
import { ApiConfigService } from "@/services/api-config";
import {
  useGetAccessTokensForBucketQuery,
  useCreateAccessTokenForBucketMutation,
  useRevokeAccessTokenMutation,
  GetAccessTokensForBucketDocument,
} from "@/generated/gql-operations-generated";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Dialog,
  Icon,
  IconButton,
  Portal,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import BucketApiExamples from "./BucketApiExamples";

interface BucketAccessTokensSectionProps {
  bucketId: string;
  bucketName: string;
}

export default function BucketAccessTokensSection({
  bucketId,
  bucketName,
}: BucketAccessTokensSectionProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [isCreating, setIsCreating] = useState(false);
  const [apiUrl, setApiUrl] = useState("https://your-server.com");
  const [showExamplesDialog, setShowExamplesDialog] = useState(false);
  const [selectedTokenForExamples, setSelectedTokenForExamples] =
    useState<any>(null);

  // GraphQL query and mutation
  const { data, loading, refetch } = useGetAccessTokensForBucketQuery({
    variables: { bucketId },
    skip: !bucketId,
  });

  const [createAccessTokenForBucket] = useCreateAccessTokenForBucketMutation({
    refetchQueries: [
      "GetUserAccessTokens",
      {
        query: GetAccessTokensForBucketDocument,
        variables: { bucketId },
      },
    ],
  });

  const [revokeAccessToken] = useRevokeAccessTokenMutation({
    refetchQueries: [
      "GetUserAccessTokens",
      {
        query: GetAccessTokensForBucketDocument,
        variables: { bucketId },
      },
    ],
  });

  const accessTokens = data?.getAccessTokensForBucket || [];

  useEffect(() => {
    loadApiUrl();
  }, []);

  const loadApiUrl = async () => {
    try {
      const customUrl = await ApiConfigService.getCustomApiUrl();
      setApiUrl(customUrl || "https://your-server.com");
    } catch (error) {
      console.error("Failed to load API URL:", error);
    }
  };

  const handleCreateToken = async () => {
    const tokenName = `${bucketName} Token`;

    setIsCreating(true);
    try {
      await createAccessTokenForBucket({
        variables: {
          bucketId,
          name: tokenName,
        },
      });
      await refetch();
    } catch (error) {
      console.error("Error creating access token:", error);
      Alert.alert(
        t("common.error"),
        t("buckets.accessTokens.createError" as any)
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteToken = (tokenId: string, tokenName: string) => {
    Alert.alert(
      t("accessTokens.item.deleteTokenTitle"),
      t("accessTokens.item.deleteTokenMessage"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("accessTokens.item.deleteTokenConfirm"),
          style: "destructive",
          onPress: async () => {
            try {
              await revokeAccessToken({ variables: { tokenId } });
            } catch (error) {
              console.error("Error deleting token:", error);
              Alert.alert(
                t("common.error"),
                t("buckets.accessTokens.deleteError" as any)
              );
            }
          },
        },
      ]
    );
  };

  const handleShowExamples = (token: any) => {
    setSelectedTokenForExamples(token);
    setShowExamplesDialog(true);
  };

  return (
    <Card style={styles.container}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>
              {t("buckets.accessTokens.title" as any)}
            </Text>
            <Text
              style={[
                styles.description,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {t("buckets.accessTokens.description" as any)}
            </Text>
          </View>
          <Button
            mode="contained-tonal"
            compact
            icon="plus"
            onPress={handleCreateToken}
            loading={isCreating}
            disabled={isCreating}
          >
            {t("buckets.accessTokens.create" as any)}
          </Button>
        </View>

        {loading ? (
          <Text
            style={[
              styles.loadingText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {t("common.loading")}
          </Text>
        ) : accessTokens.length === 0 ? (
          <Surface
            style={[
              styles.emptyState,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <Icon
              source="key-off"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.emptyText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {t("buckets.accessTokens.noTokens" as any)}
            </Text>
          </Surface>
        ) : (
          <View style={styles.tokensList}>
            {accessTokens.map((token: any) => (
              <Surface
                key={token.id}
                style={[
                  styles.tokenItem,
                  { backgroundColor: theme.colors.elevation.level1 },
                ]}
                elevation={1}
              >
                <View style={styles.tokenInfo}>
                  <View style={styles.tokenHeader}>
                    <Icon
                      source={token.token ? "key" : "key-outline"}
                      size={20}
                      color={theme.colors.primary}
                    />
                    <Text
                      style={[
                        styles.tokenName,
                        { color: theme.colors.onSurface },
                      ]}
                      numberOfLines={1}
                    >
                      {token.name}
                    </Text>
                  </View>
                  {token.isExpired && (
                    <Text
                      style={[
                        styles.expiredText,
                        { color: theme.colors.error },
                      ]}
                    >
                      {t("accessTokens.item.expired")}
                    </Text>
                  )}
                </View>
                <View style={styles.tokenActions}>
                  <IconButton
                    icon="code-tags"
                    size={20}
                    onPress={() => handleShowExamples(token)}
                  />
                  <IconButton
                    icon="delete"
                    size={20}
                    iconColor={theme.colors.error}
                    onPress={() => handleDeleteToken(token.id, token.name)}
                  />
                </View>
              </Surface>
            ))}
          </View>
        )}
      </Card.Content>

      {/* API Examples Dialog */}
      <Portal>
        <Dialog
          visible={showExamplesDialog}
          onDismiss={() => setShowExamplesDialog(false)}
        >
          <Dialog.Title>{t("buckets.apiExamples.title" as any)}</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScroll}>
            <ScrollView>
              {selectedTokenForExamples && (
                <BucketApiExamples
                  bucketId={bucketId}
                  accessToken={selectedTokenForExamples.token}
                  apiUrl={apiUrl}
                />
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowExamplesDialog(false)}>
              {t("common.close")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
  },
  loadingText: {
    fontSize: 14,
    textAlign: "center",
    padding: 16,
  },
  emptyState: {
    padding: 24,
    borderRadius: 8,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  tokensList: {
    gap: 8,
  },
  tokenItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
  },
  tokenInfo: {
    flex: 1,
    marginRight: 8,
  },
  tokenHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  tokenName: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  expiredText: {
    fontSize: 12,
    fontWeight: "500",
  },
  tokenActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  dialog: {
    maxHeight: "80%",
  },
  dialogScroll: {
    maxHeight: 500,
    paddingHorizontal: 0,
  },
});
