import {
  GetAccessTokensForBucketDocument,
  useCreateAccessTokenForBucketMutation,
  useGetAccessTokensForBucketQuery,
  useRevokeAccessTokenMutation,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useTheme } from "react-native-paper";
import BucketApiExamples from "./BucketApiExamples";
import CopyButton from "./ui/CopyButton";
import DetailItemCard from "./ui/DetailItemCard";
import DetailModal from "./ui/DetailModal";
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

  // Refetch when refetchTrigger changes
  useEffect(() => {
    if (refetchTrigger && bucketId) {
      refetch();
    }
  }, [refetchTrigger, bucketId, refetch]);

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

      {/* API Examples Modal */}
      <DetailModal
        visible={showExamplesDialog}
        onDismiss={() => setShowExamplesDialog(false)}
        title={t("buckets.apiExamples.title" as any)}
        icon="code-tags"
        actions={{
          cancel: {
            label: t("common.close"),
            onPress: () => setShowExamplesDialog(false),
          },
        }}
      >
        {selectedTokenForExamples && (
          <BucketApiExamples
            bucketId={bucketId}
            accessToken={selectedTokenForExamples.token}
          />
        )}
      </DetailModal>
    </>
  );
}
