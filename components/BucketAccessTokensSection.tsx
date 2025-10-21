import { settingsService } from "@/services/settings-service";
import { useI18n } from "@/hooks/useI18n";
import {
  useGetAccessTokensForBucketQuery,
  useCreateAccessTokenForBucketMutation,
  useRevokeAccessTokenMutation,
  GetAccessTokensForBucketDocument,
} from "@/generated/gql-operations-generated";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import {
  Button,
  Dialog,
  Portal,
  useTheme,
} from "react-native-paper";
import BucketApiExamples from "./BucketApiExamples";
import CopyButton from "./ui/CopyButton";
import DetailItemCard from "./ui/DetailItemCard";
import DetailSectionCard from "./ui/DetailSectionCard";

interface BucketAccessTokensSectionProps {
  bucketId: string;
  bucketName: string;
  refetchTrigger?: number;
}

export default function BucketAccessTokensSection({
  bucketId,
  bucketName,
  refetchTrigger,
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

  // Refetch when refetchTrigger changes
  useEffect(() => {
    if (refetchTrigger && bucketId) {
      refetch();
    }
  }, [refetchTrigger, bucketId, refetch]);

  const loadApiUrl = async () => {
    try {
      const customUrl = await settingsService.getCustomApiUrl();
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
    <>
      <DetailSectionCard
        title={t("buckets.accessTokens.title" as any)}
        description={t("buckets.accessTokens.description" as any)}
        actionButton={{
          label: t("buckets.accessTokens.create" as any),
          icon: "plus",
          onPress: handleCreateToken,
          loading: isCreating,
        }}
        loading={loading}
        emptyState={{
          icon: "key-off",
          text: t("buckets.accessTokens.noTokens" as any),
        }}
        items={accessTokens}
        renderItem={(token: any) => (
          <DetailItemCard
            icon={token.token ? "key" : "key-outline"}
            title={token.name}
            titleRight={
              token.token ? <CopyButton text={token.token} size={18} /> : null
            }
            details={
              token.isExpired ? [t("accessTokens.item.expired")] : undefined
            }
            actions={[
              {
                icon: "code-tags",
                onPress: () => handleShowExamples(token),
              },
              {
                icon: "delete",
                onPress: () => handleDeleteToken(token.id, token.name),
                color: theme.colors.error,
              },
            ]}
          />
        )}
      />

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
    </>
  );
}

const styles = StyleSheet.create({
  dialogScroll: {
    maxHeight: 500,
    paddingHorizontal: 0,
  },
});
