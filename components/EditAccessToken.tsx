import CreateAccessTokenForm from "@/components/CreateAccessTokenForm";
// @ts-ignore - Will be available after running codegen
import { useGetAccessTokenQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { StyleSheet } from "react-native";
import { Card, Surface, Text, useTheme } from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";
import IdWithCopyButton from "./IdWithCopyButton";
import { useDateFormat } from "@/hooks/useDateFormat";

interface EditAccessTokenProps {
  tokenId: string;
}

export default function EditAccessToken({ tokenId }: EditAccessTokenProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { formatDate } = useDateFormat();

  const isUuidLike = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

  const canFetchToken = !!tokenId && isUuidLike(tokenId);

  const { data, loading, error, refetch } = useGetAccessTokenQuery({
    variables: { tokenId },
    skip: !canFetchToken,
  });

  const tokenData = data?.getAccessToken;

  const handleRefresh = async () => {
    await refetch().catch(console.error);
  };

  if (!tokenId) {
    return (
      <Surface style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {t("accessTokens.form.noTokenId" as any)}
        </Text>
      </Surface>
    );
  }

  if (!canFetchToken) {
    return (
      <Surface style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {t("accessTokens.form.invalidTokenId" as any)}
        </Text>
      </Surface>
    );
  }

  return (
    <PaperScrollView
      onRefresh={handleRefresh}
      loading={loading}
      error={!error && !tokenData && !loading}
    >
      <CreateAccessTokenForm tokenData={tokenData} />

      {tokenData && (
        <Card style={styles.readonlyContainer}>
          <Card.Content>
            <Text style={styles.readonlyLabel}>
              {t("accessTokens.item.created")}:
            </Text>
            <Text style={styles.readonlyValue}>
              {formatDate(tokenData.createdAt)}
            </Text>
            {tokenData.lastUsed && (
              <>
                <Text style={[styles.readonlyLabel, { marginTop: 10 }]}>
                  {t("accessTokens.item.lastUsed")}:
                </Text>
                <Text style={styles.readonlyValue}>
                  {formatDate(tokenData.lastUsed)}
                </Text>
              </>
            )}
          </Card.Content>
        </Card>
      )}
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  readonlyContainer: {
    marginBottom: 16,
  },
  readonlyValue: {
    fontSize: 14,
    fontFamily: "monospace",
  },
  readonlyLabel: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.7,
    marginBottom: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
});
