import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import {
  SystemAccessTokenRequestFragment,
  useSystemAccessTokenRequestsQuery,
  useApproveSystemAccessTokenRequestMutation,
  useDeclineSystemAccessTokenRequestMutation,
  SystemAccessTokenRequestStatus,
} from "@/generated/gql-operations-generated";
import SwipeableItem from "./SwipeableItem";
import { useI18n } from "@/hooks/useI18n";
import { useDateFormat } from "@/hooks/useDateFormat";

interface Props {
  disabled?: boolean;
}

export default function SystemAccessTokenRequestsManagement({
  disabled,
}: Props) {
  const { t } = useI18n();
  const { formatDate } = useDateFormat();
  const { data, refetch } = useSystemAccessTokenRequestsQuery({
    fetchPolicy: "cache-and-network",
  });
  const [approveRequest] = useApproveSystemAccessTokenRequestMutation();
  const [declineRequest] = useDeclineSystemAccessTokenRequestMutation();

  const requests = (data?.systemAccessTokenRequests || []).filter(
    (r) => r.status === SystemAccessTokenRequestStatus.Pending
  );

  const handleApprove = async (id: string) => {
    await approveRequest({ variables: { id } });
    await refetch();
  };

  const handleDecline = async (id: string) => {
    await declineRequest({ variables: { id } });
    await refetch();
  };

  const renderRequestItem = (request: SystemAccessTokenRequestFragment) => (
    <SwipeableItem
      key={request.id}
      rightAction={
        !disabled
          ? {
              icon: "delete",
              label: t("systemAccessTokens.item.deleteTokenConfirm"),
              backgroundColor: "#ff6b6b",
              onPress: () => handleDecline(request.id),
              showAlert: {
                title: t("systemAccessTokens.item.deleteTokenTitle"),
                message: t("systemAccessTokens.item.deleteTokenMessage"),
                confirmText: t("systemAccessTokens.item.deleteTokenConfirm"),
                cancelText: t("common.cancel"),
              },
            }
          : undefined
      }
    >
      <View style={styles.item}>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.title}>
            {request.description || request.id}
          </Text>
          <View style={styles.actions}>
            <Button
              mode="contained"
              compact
              onPress={() => handleApprove(request.id)}
              disabled={disabled}
              style={styles.approve}
            >
              {t("common.ok")}
            </Button>
            <Button
              mode="outlined"
              compact
              onPress={() => handleDecline(request.id)}
              disabled={disabled}
              style={styles.decline}
            >
              {t("common.cancel")}
            </Button>
          </View>
        </View>

        <View style={styles.details}>
          <Text variant="bodySmall" style={styles.detail}>
            {t("systemAccessTokens.item.created")}:{" "}
            {formatDate(request.createdAt)}
          </Text>
          {request.user && (
            <>
              <Text variant="bodySmall" style={styles.detail}>
                {t("systemAccessTokens.userRequests.userId" as any)}: {request.user.id}
              </Text>
              <Text variant="bodySmall" style={styles.detail}>
                {t("systemAccessTokens.userRequests.username" as any)}: {request.user.username}
              </Text>
              <Text variant="bodySmall" style={styles.detail}>
                {t("systemAccessTokens.userRequests.email" as any)}: {request.user.email}
              </Text>
            </>
          )}
          <Text variant="bodySmall" style={styles.detail}>
            Max Requests: {request.maxRequests}
          </Text>
          {request.description && (
            <Text variant="bodySmall" style={styles.detail}>
              {t("systemAccessTokens.item.description")}: {request.description}
            </Text>
          )}
        </View>
      </View>
    </SwipeableItem>
  );

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.sectionTitle}>
        {t("systemAccessTokens.requests.pendingTitle")}
      </Text>
      {requests.length === 0 ? (
        <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
          {t("systemAccessTokens.noTokensSubtext")}
        </Text>
      ) : (
        <View>{requests.map((r) => renderRequestItem(r))}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    fontWeight: "600",
  },
  item: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  approve: {
    marginLeft: 8,
  },
  decline: {
    marginLeft: 8,
  },
  details: {
    gap: 4,
  },
  detail: {
    opacity: 0.7,
  },
});
