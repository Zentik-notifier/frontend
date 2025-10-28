import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Text, TextInput, useTheme } from "react-native-paper";
import { useI18n } from "@/hooks/useI18n";
import { useDateFormat } from "@/hooks/useDateFormat";
import DetailModal from "./ui/DetailModal";
import {
  SystemAccessTokenRequestFragment,
  useMySystemAccessTokenRequestsQuery,
  useCreateSystemAccessTokenRequestMutation,
} from "@/generated/gql-operations-generated";

export default function UserSystemAccessTokenRequests() {
  const { t } = useI18n();
  const theme = useTheme();
  const { formatDate } = useDateFormat();
  const { data, loading, refetch } = useMySystemAccessTokenRequestsQuery();
  const [createRequest, { loading: creating }] =
    useCreateSystemAccessTokenRequestMutation();

  const [maxRequests, setMaxRequests] = useState<string>("1000");
  const [description, setDescription] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleCreate = async () => {
    const max = parseInt(maxRequests, 10);
    if (!max || max <= 0) return;
    await createRequest({ variables: { input: { maxRequests: max, description: description || undefined } } });
    setDescription("");
    await refetch();
  };

  const requests = data?.mySystemAccessTokenRequests || [];

  const selected = useMemo(
    () => requests.find((r) => r.id === selectedId) || null,
    [requests, selectedId]
  );

  return (
    <>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            {t("systemAccessTokens.userRequests.title")}
          </Text>

          <View style={styles.formRow}>
            <TextInput
              mode="outlined"
              label={t("systemAccessTokens.userRequests.maxRequests")}
              value={maxRequests}
              onChangeText={setMaxRequests}
              keyboardType="number-pad"
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label={t("systemAccessTokens.item.description")}
              value={description}
              onChangeText={setDescription}
              style={styles.input}
            />
            <Button
              mode="contained"
              onPress={handleCreate}
              disabled={creating}
              loading={creating}
              style={styles.createButton}
            >
              {t("systemAccessTokens.userRequests.create")}
            </Button>
          </View>

          <View style={styles.list}>
            {requests.map((r: SystemAccessTokenRequestFragment) => (
              <View key={r.id} style={styles.item}>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurface }}
                  onPress={() => setSelectedId(r.id)}
                >
                  {r.description || t("systemAccessTokens.userRequests.noDescription")}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t("systemAccessTokens.item.created")}: {formatDate(r.createdAt)} — {t("systemAccessTokens.userRequests.status")}: {r.status}
                </Text>
              </View>
            ))}
            {requests.length === 0 && !loading && (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {t("systemAccessTokens.userRequests.empty")}
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>
      <DetailModal
      visible={!!selected}
      onDismiss={() => setSelectedId(null)}
      title={t("systemAccessTokens.userRequests.title")}
      icon="key"
      actions={{
        cancel: { label: t("common.close"), onPress: () => setSelectedId(null) },
      }}
    >
      {selected && (
        <View style={{ gap: 12 }}>
          <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
            {selected.description || t("systemAccessTokens.userRequests.noDescription")}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            ID: {selected.id}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {t("systemAccessTokens.userRequests.status")}: {selected.status}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {t("systemAccessTokens.item.created")}: {formatDate(selected.createdAt)}
          </Text>
          {selected.systemAccessToken && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Token Id: {selected.systemAccessToken.id}
            </Text>
          )}
          {selected.plainTextToken && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Token: {selected.plainTextToken}
            </Text>
          )}
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Max Requests: {selected.maxRequests}
          </Text>
        </View>
      )}
    </DetailModal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
  },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  input: {
    flex: 1,
  },
  createButton: {
    marginTop: 4,
  },
  list: {
    gap: 12,
  },
  item: {
    gap: 4,
  },
});


