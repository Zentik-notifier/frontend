import { downloadHistoryService, DownloadHistoryEntry } from "@/services/download-history-service";
import { useI18n } from "@/hooks/useI18n";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { List, Text, useTheme } from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";
import { useDownloadQueue } from "@/hooks/useMediaCache";
import { MediaType } from "@/generated/gql-operations-generated";
import { useCachedItem } from "@/hooks/useMediaCache";
import { MediaTypeIcon } from "./MediaTypeIcon";
import { Image } from "expo-image";
import { DownloadQueueItem } from "@/services/media-cache-service";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatSize(bytes?: number): string {
  if (bytes == null || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DownloadEntryRow({ entry }: { entry: DownloadHistoryEntry }) {
  const theme = useTheme();
  const cached = useCachedItem(entry.url, entry.mediaType, { force: false });
  const previewUri =
    cached?.localPath &&
    (entry.mediaType === MediaType.Image || entry.mediaType === MediaType.Gif)
      ? cached.localPath
      : entry.mediaType === MediaType.Image || entry.mediaType === MediaType.Gif
        ? entry.url
        : null;

  const title =
    entry.title ||
    entry.bucketName ||
    entry.mediaType ||
    entry.url.replace(/^.*\//, "").slice(0, 40);

  return (
    <View style={[styles.entryRow, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.entryThumb}>
        {previewUri ? (
          <Image
            source={{ uri: previewUri }}
            style={styles.entryThumbImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.entryThumbIcon}>
            <MediaTypeIcon mediaType={entry.mediaType} size={32} />
          </View>
        )}
      </View>
      <View style={styles.entryContent}>
        <Text variant="bodyLarge" numberOfLines={1} style={styles.entryTitle}>
          {title}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {formatDate(entry.completedAt)} · {formatSize(entry.size)}
        </Text>
      </View>
    </View>
  );
}

function QueueItemRow({ item, isCurrent }: { item: DownloadQueueItem; isCurrent?: boolean }) {
  const theme = useTheme();
  const title = item.bucketName || item.url.replace(/^.*\//, "").slice(0, 40) || item.mediaType;

  return (
    <View style={[styles.entryRow, { backgroundColor: theme.colors.surfaceVariant }]}>
      <View style={[styles.entryThumb, styles.entryThumbIcon]}>
        <MediaTypeIcon mediaType={item.mediaType} size={28} />
      </View>
      <View style={styles.entryContent}>
        <Text variant="bodyLarge" numberOfLines={1} style={styles.entryTitle}>
          {title}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {isCurrent ? "…" : ""}
        </Text>
      </View>
    </View>
  );
}

export default function DownloadsList() {
  const theme = useTheme();
  const { t } = useI18n();
  const [entries, setEntries] = useState<DownloadHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { queueState } = useDownloadQueue();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await downloadHistoryService.getDownloads();
      setEntries(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleClear = useCallback(async () => {
    await downloadHistoryService.clear();
    setEntries([]);
  }, []);

  const hasQueue =
    queueState.isProcessing ||
    (queueState.currentItem != null) ||
    (queueState.queue?.length ?? 0) > 0;

  const customActions = [
    {
      icon: "delete-sweep" as const,
      label: t("downloads.clear") as string,
      onPress: handleClear,
      disabled: entries.length === 0,
    },
  ];

  return (
    <PaperScrollView
      onRefresh={load}
      customActions={customActions}
      loading={loading}
      fabGroupIcon="cog"
      style={styles.scrollViewWrap}
    >
      <View style={styles.container}>
        {hasQueue && (
          <List.Section title={t("downloads.inProgress")} style={styles.section}>
            {queueState.currentItem && (
              <QueueItemRow item={queueState.currentItem} isCurrent />
            )}
            {(queueState.queue ?? []).map((item) => (
              <QueueItemRow key={item.key} item={item} />
            ))}
          </List.Section>
        )}

        {entries.length > 0 ? (
          <List.Section title={t("downloads.completed")} style={styles.section}>
            {entries.map((entry) => (
              <DownloadEntryRow key={entry.id} entry={entry} />
            ))}
          </List.Section>
        ) : !hasQueue ? (
          <Text
            variant="bodyLarge"
            style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
          >
            {t("downloads.noDownloads")}
          </Text>
        ) : null}
      </View>
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  scrollViewWrap: {
    padding: 0,
  },
  container: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  section: {
    marginHorizontal: 0,
    paddingHorizontal: 0,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    width: "100%",
  },
  entryThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 12,
  },
  entryThumbImage: {
    width: "100%",
    height: "100%",
  },
  entryThumbIcon: {
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  entryContent: {
    flex: 1,
    minWidth: 0,
  },
  entryTitle: {
    fontWeight: "600",
  },
  emptyText: {
    paddingVertical: 24,
    textAlign: "center",
  },
});
