import React, { useMemo } from "react";
import { Platform, StyleSheet, View, Pressable } from "react-native";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Button, Icon, Text, useTheme } from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";
import SwipeableItem from "./SwipeableItem";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";

export interface ChangelogItem {
  id: string;
  iosVersion: string;
  androidVersion: string;
  uiVersion: string;
  backendVersion: string;
  description: string;
  createdAt: string;
}

interface ChangelogsQueryResult {
  changelogs: ChangelogItem[];
}

export const CHANGELOGS_QUERY = gql`
  query Changelogs {
    changelogs {
      id
      iosVersion
      androidVersion
      uiVersion
      backendVersion
      description
      createdAt
    }
  }
`;

const DELETE_CHANGELOG_MUTATION = gql`
  mutation DeleteChangelog($id: ID!) {
    deleteChangelog(id: $id)
  }
`;

export default function ChangelogList() {
  const theme = useTheme();
  const { t } = useI18n();
  const { navigateToCreateChangelog, navigateToEditChangelog } =
    useNavigationUtils();
  const { data, loading, error, refetch } = useQuery<ChangelogsQueryResult>(
    CHANGELOGS_QUERY,
    {
      fetchPolicy: "cache-and-network",
    }
  );

  const [deleteChangelog] = useMutation(DELETE_CHANGELOG_MUTATION);

  const changelogs = useMemo(() => data?.changelogs ?? [], [data]);

  const handleDelete = async (item: ChangelogItem) => {
    await deleteChangelog({ variables: { id: item.id } });
    await refetch();
  };

  const translate = (key: string) => t(key as any) as string;

  const getItemTitle = (item: ChangelogItem) => {
    const date = new Date(item.createdAt);

    if (Number.isNaN(date.getTime())) {
      return t("changelog.title");
    }

    const formatted = date.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  return (
    <View style={styles.container}>
      <PaperScrollView
        onRefresh={async () => {
          await refetch();
        }}
        loading={loading}
        error={!!error}
        onAdd={navigateToCreateChangelog}
      >
        <View style={styles.listContainer}>
          {changelogs.length === 0 && !loading && !error ? (
            <View style={styles.emptyState}>
              <Icon
                source="new-box"
                size={64}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="headlineSmall" style={styles.emptyTitle}>
                {t("changelog.title")}
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtitle}>
                {t("changelog.empty")}
              </Text>
            </View>
          ) : (
            changelogs.map((item) => (
              <SwipeableItem
                key={item.id}
                rightAction={{
                  icon: "delete",
                  label: t("common.delete"),
                  backgroundColor: theme.colors.error,
                  onPress: () => handleDelete(item),
                  showAlert: {
                    title: t("common.delete"),
                    message: t("changelog.description"),
                    confirmText: t("common.delete"),
                    cancelText: t("common.cancel"),
                  },
                }}
              >
                <Pressable
                  style={styles.card}
                  onPress={() => navigateToEditChangelog(item.id)}
                >
                  <View style={styles.cardHeader}>
                    <Text variant="titleMedium">{getItemTitle(item)}</Text>
                  </View>
                  {(item.iosVersion ||
                    item.androidVersion ||
                    item.uiVersion ||
                    item.backendVersion) && (
                    <View style={styles.versionsRow}>
                      {item.iosVersion ? (
                        <Text variant="bodySmall">
                          {translate("changelog.iosVersion")}: {" "}
                          <Text>{item.iosVersion}</Text>
                        </Text>
                      ) : null}
                      {item.androidVersion ? (
                        <Text variant="bodySmall">
                          {translate("changelog.androidVersion")}: {" "}
                          <Text>{item.androidVersion}</Text>
                        </Text>
                      ) : null}
                      {item.uiVersion ? (
                        <Text variant="bodySmall">
                          {translate("changelog.uiVersion")}: {" "}
                          <Text>{item.uiVersion}</Text>
                        </Text>
                      ) : null}
                      {item.backendVersion ? (
                        <Text variant="bodySmall">
                          {translate("changelog.backendVersion")}: {" "}
                          <Text>{item.backendVersion}</Text>
                        </Text>
                      ) : null}
                    </View>
                  )}
                  <View style={styles.descriptionContainer}>
                    <Text variant="bodyMedium">{item.description}</Text>
                  </View>
                  <Text variant="bodySmall" style={styles.dateText}>
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </Pressable>
              </SwipeableItem>
            ))
          )}
        </View>
      </PaperScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: Platform.OS === "web" ? 1 : 0,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  versionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  descriptionContainer: {
    marginBottom: 8,
  },
  dateText: {
    opacity: 0.7,
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: 8,
    textAlign: "center",
  },
});
