import React, { useMemo } from "react";
import { Platform, StyleSheet, View, Pressable } from "react-native";
import { gql, useMutation } from "@apollo/client";
import { Button, Icon, Text, useTheme } from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";
import SwipeableItem from "./SwipeableItem";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import { useAdminChangelogsQuery } from "@/generated/gql-operations-generated";

export interface ChangelogEntryItem {
  type: string;
  text: string;
}

export interface ChangelogItem {
  id: string;
  iosVersion: string;
  androidVersion: string;
  uiVersion: string;
  backendVersion: string;
  description: string;
  createdAt: string;
  active: boolean;
  entries?: ChangelogEntryItem[] | null;
}

const DELETE_CHANGELOG_MUTATION = gql`
  mutation DeleteChangelog($id: ID!) {
    deleteChangelog(id: $id)
  }
`;

const TOGGLE_CHANGELOG_ACTIVE_MUTATION = gql`
  mutation ToggleChangelogActive($input: UpdateChangelogInput!) {
    updateChangelog(input: $input) {
      id
      active
    }
  }
`;

export default function ChangelogList() {
  const theme = useTheme();
  const { t } = useI18n();
  const { navigateToCreateChangelog, navigateToEditChangelog } =
    useNavigationUtils();
  const { data, loading, error, refetch } = useAdminChangelogsQuery({
    fetchPolicy: "cache-and-network",
  });
  const isSelfHosted = process.env.EXPO_PUBLIC_SELFHOSTED === "true";

  const [deleteChangelog] = useMutation(DELETE_CHANGELOG_MUTATION);
  const [toggleChangelogActive] = useMutation(TOGGLE_CHANGELOG_ACTIVE_MUTATION);

  const changelogs = useMemo(() => data?.adminChangelogs ?? [], [data]);

  if (isSelfHosted) {
    return null;
  }

  const handleDelete = async (item: ChangelogItem) => {
    await deleteChangelog({ variables: { id: item.id } });
    await refetch();
  };

  const translate = (key: string) => t(key as any) as string;

  const getItemTitle = (item: ChangelogItem) => {
    if (item.description && item.description.trim().length > 0) {
      return item.description.trim();
    }

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

  const handleToggleActive = async (item: ChangelogItem) => {
    await toggleChangelogActive({
      variables: {
        input: {
          id: item.id,
          active: !item.active,
        },
      },
    });
    await refetch();
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
                leftAction={{
                  icon: item.active ? "toggle-switch-off" : "toggle-switch",
                  label: item.active
                    ? t("changelog.deactivate")
                    : t("changelog.activate"),
                  backgroundColor: item.active
                    ? theme.colors.secondary
                    : theme.colors.primary,
                  onPress: () => handleToggleActive(item),
                }}
                cardStyle={[
                  !item.active && {
                    backgroundColor: theme.colors.surfaceVariant,
                  },
                ]}
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
                          {translate("changelog.iosVersion")}:{" "}
                          <Text>{item.iosVersion}</Text>
                        </Text>
                      ) : null}
                      {item.androidVersion ? (
                        <Text variant="bodySmall">
                          {translate("changelog.androidVersion")}:{" "}
                          <Text>{item.androidVersion}</Text>
                        </Text>
                      ) : null}
                      {item.uiVersion ? (
                        <Text variant="bodySmall">
                          {translate("changelog.uiVersion")}:{" "}
                          <Text>{item.uiVersion}</Text>
                        </Text>
                      ) : null}
                      {item.backendVersion ? (
                        <Text variant="bodySmall">
                          {translate("changelog.backendVersion")}:{" "}
                          <Text>{item.backendVersion}</Text>
                        </Text>
                      ) : null}
                    </View>
                  )}
                  {item.entries && item.entries.length > 0 && (
                    <View style={styles.entriesContainer}>
                      {item.entries.map((entry, index) => (
                        <Text
                          key={index}
                          variant="bodyMedium"
                          style={styles.entryLine}
                        >
                          {t(`changelog.entryTypes.${entry.type}` as any)}
                          {": "}
                          {entry.text}
                        </Text>
                      ))}
                    </View>
                  )}
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
  entriesContainer: {
    marginBottom: 8,
  },
  entryLine: {
    marginBottom: 2,
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
