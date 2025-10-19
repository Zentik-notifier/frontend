import { useI18n } from "@/hooks/useI18n";
import { ApiConfigService } from "@/services/api-config";
// @ts-ignore - Will be available after running codegen
import {
  useGetAccessTokensForBucketQuery,
  useCreateAccessTokenForBucketMutation,
  GetAccessTokensForBucketDocument,
} from "@/generated/gql-operations-generated";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Dialog,
  Icon,
  Menu,
  Portal,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import BucketApiExamples from "./BucketApiExamples";

interface BucketAccessTokensSectionProps {
  bucketId: string;
}

export default function BucketAccessTokensSection({
  bucketId,
}: BucketAccessTokensSectionProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [apiUrl, setApiUrl] = useState("https://your-server.com");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");

  // GraphQL query and mutation
  const { data, loading, refetch } = useGetAccessTokensForBucketQuery({
    variables: { bucketId },
    skip: !bucketId,
  });
  
  const [createAccessTokenForBucket] = useCreateAccessTokenForBucketMutation({
    refetchQueries: [
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

  const handleCreateToken = () => {
    setNewTokenName("");
    setShowCreateDialog(true);
  };

  const confirmCreateToken = async () => {
    if (!newTokenName.trim()) {
      Alert.alert(t("common.error"), t("accessTokens.form.nameRequired"));
      return;
    }

    setIsCreating(true);
    try {
      const result = await createAccessTokenForBucket({
        variables: {
          bucketId,
          name: newTokenName.trim(),
        },
      });

      if (result.data?.createAccessTokenForBucket) {
        setShowCreateDialog(false);
        setNewTokenName("");
        Alert.alert(
          t("common.success"),
          t("buckets.accessTokens.tokenCreated" as any)
        );
        await refetch();
      }
    } catch (error) {
      console.error("Error creating access token:", error);
      Alert.alert(t("common.error"), t("buckets.accessTokens.createError" as any));
    } finally {
      setIsCreating(false);
    }
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
              style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
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
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
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
              style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
            >
              {t("buckets.accessTokens.noTokens" as any)}
            </Text>
          </Surface>
        ) : (
          <>
            <View style={styles.selectorContainer}>
              <Text
                style={[styles.selectorLabel, { color: theme.colors.onSurface }]}
              >
                {t("buckets.accessTokens.selectToken" as any)}:
              </Text>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setMenuVisible(true)}
                    icon="key"
                  >
                    {selectedToken
                      ? selectedToken.name
                      : t("buckets.accessTokens.chooseToken" as any)}
                  </Button>
                }
              >
                {accessTokens.map((token: any) => (
                  <Menu.Item
                    key={token.id}
                    onPress={() => {
                      setSelectedToken(token);
                      setMenuVisible(false);
                    }}
                    title={token.name}
                    disabled={token.isExpired || !token.token}
                    leadingIcon={token.isExpired ? "clock-alert" : "key"}
                  />
                ))}
              </Menu>
            </View>

            {selectedToken && (
              <BucketApiExamples
                bucketId={bucketId}
                accessToken={selectedToken.token}
                apiUrl={apiUrl}
              />
            )}
          </>
        )}
      </Card.Content>

      {/* Create Token Dialog */}
      <Portal>
        <Dialog
          visible={showCreateDialog}
          onDismiss={() => !isCreating && setShowCreateDialog(false)}
        >
          <Dialog.Title>{t("buckets.accessTokens.create" as any)}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label={t("accessTokens.form.tokenName")}
              value={newTokenName}
              onChangeText={setNewTokenName}
              placeholder={t("accessTokens.form.tokenNamePlaceholder")}
              disabled={isCreating}
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onPress={confirmCreateToken}
              disabled={isCreating || !newTokenName.trim()}
              loading={isCreating}
            >
              {t("common.create" as any)}
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
  selectorContainer: {
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
});

