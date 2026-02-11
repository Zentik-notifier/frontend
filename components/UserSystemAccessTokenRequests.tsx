import React, { useMemo, useState } from "react";
import { StyleSheet, View, Alert } from "react-native";
import {
  Button,
  Card,
  Text,
  TextInput,
  useTheme,
  Divider,
} from "react-native-paper";
import { useI18n } from "@/hooks/useI18n";
import { useDateFormat } from "@/hooks/useDateFormat";
import DetailModal from "./ui/DetailModal";
import CopyButton from "./ui/CopyButton";
import {
  SystemAccessTokenRequestFragment,
  SystemAccessTokenRequestStatus,
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

  const [maxRequests, setMaxRequests] = useState<string>("5000");
  const [description, setDescription] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const requests = data?.mySystemAccessTokenRequests || [];

  const hasPendingRequest = useMemo(() => {
    return requests.some(
      (r) => r.status === SystemAccessTokenRequestStatus.Pending
    );
  }, [requests]);

  const handleCreate = async () => {
    // Validate description is required
    if (!description.trim()) {
      Alert.alert(
        t("common.error"),
        t("systemAccessTokens.userRequests.descriptionRequired" as any)
      );
      return;
    }

    // Check for pending request
    if (hasPendingRequest) {
      Alert.alert(
        t("common.error"),
        t("systemAccessTokens.userRequests.pendingRequestExists" as any)
      );
      return;
    }

    const max = parseInt(maxRequests, 10);
    if (!max || max <= 0) {
      Alert.alert(
        t("common.error"),
        t("systemAccessTokens.userRequests.invalidMaxRequests" as any)
      );
      return;
    }

    await createRequest({
      variables: {
        input: {
          maxRequests: max,
          description: description.trim(),
        },
      },
    });
    setDescription("");
    await refetch();
  };

  const selected = useMemo(
    () => requests.find((r) => r.id === selectedId) || null,
    [requests, selectedId]
  );

  return (
    <>
      <View>
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
            label={`${t("systemAccessTokens.item.description")} *`}
            value={description}
            onChangeText={setDescription}
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={handleCreate}
            disabled={creating || hasPendingRequest || !description.trim()}
            loading={creating}
            style={styles.createButton}
          >
            {t("systemAccessTokens.userRequests.create")}
          </Button>
        </View>

        {hasPendingRequest && (
          <View
            style={[
              styles.pendingWarning,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {t(
                "systemAccessTokens.userRequests.pendingRequestWarning" as any
              )}
            </Text>
          </View>
        )}

        <View style={styles.list}>
          {requests.map((r: SystemAccessTokenRequestFragment) => (
            <View
              key={r.id}
              style={[
                styles.itemContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <View style={styles.itemHeader}>
                <Text
                  variant="titleSmall"
                  style={{ color: theme.colors.onSurface, flex: 1 }}
                >
                  {r.description ||
                    t("systemAccessTokens.userRequests.noDescription")}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{
                    color:
                      r.status === SystemAccessTokenRequestStatus.Approved
                        ? theme.colors.primary
                        : r.status === SystemAccessTokenRequestStatus.Pending
                        ? theme.colors.secondary
                        : theme.colors.error,
                    fontWeight: "600",
                  }}
                >
                  {r.status}
                </Text>
              </View>

              <Divider style={styles.itemDivider} />

              <View style={styles.itemDetails}>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {t("systemAccessTokens.item.created")}:{" "}
                  {formatDate(r.createdAt)}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {t("systemAccessTokens.userRequests.maxRequests")}:{" "}
                  {r.maxRequests}
                </Text>
                {r.systemAccessToken && (
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {t("systemAccessTokens.userRequests.tokenId" as any)}:{" "}
                    {r.systemAccessToken.id}
                  </Text>
                )}
              </View>

              {r.plainTextToken && (
                <View style={styles.tokenSection}>
                  <Divider style={styles.itemDivider} />
                  <View style={styles.tokenRow}>
                    <Text
                      variant="bodySmall"
                      style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}
                    >
                      {r.plainTextToken}
                    </Text>
                    <CopyButton
                      text={r.plainTextToken}
                      label={
                        t(
                          "systemAccessTokens.userRequests.copyToken" as any
                        ) as string
                      }
                      successLabel={
                        t(
                          "systemAccessTokens.userRequests.tokenCopied" as any
                        ) as string
                      }
                    />
                  </View>
                </View>
              )}
            </View>
          ))}
          {requests.length === 0 && !loading && (
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {t("systemAccessTokens.userRequests.empty")}
            </Text>
          )}
        </View>
      </View>
      <DetailModal
        visible={!!selected}
        onDismiss={() => setSelectedId(null)}
        title={t("systemAccessTokens.userRequests.title")}
        icon="key"
        actions={{
          cancel: {
            label: t("common.close"),
            onPress: () => setSelectedId(null),
          },
        }}
      >
        {selected && (
          <View style={{ gap: 12 }}>
            <Text
              variant="titleSmall"
              style={{ color: theme.colors.onSurface }}
            >
              {selected.description ||
                t("systemAccessTokens.userRequests.noDescription")}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              ID: {selected.id}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {t("systemAccessTokens.userRequests.status")}: {selected.status}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {t("systemAccessTokens.item.created")}:{" "}
              {formatDate(selected.createdAt)}
            </Text>
            {selected.systemAccessToken && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Token Id: {selected.systemAccessToken.id}
              </Text>
            )}
            {selected.plainTextToken && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Token: {selected.plainTextToken}
              </Text>
            )}
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Max Requests: {selected.maxRequests}
            </Text>
          </View>
        )}
      </DetailModal>
    </>
  );
}

const styles = StyleSheet.create({
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
  pendingWarning: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
  itemContainer: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  itemDivider: {
    marginVertical: 4,
  },
  itemDetails: {
    gap: 8,
  },
  tokenSection: {
    gap: 8,
  },
  tokenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
