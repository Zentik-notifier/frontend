import {
  useDeleteServerFileMutation,
  useServerFilesQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { settingsService } from "@/services/settings-service";
import { formatFileSize } from "@/utils/fileUtils";
import { gql, useQuery } from "@apollo/client";
import * as DocumentPicker from "expo-document-picker";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";
import Selector from "./ui/Selector";

const ALL_SERVER_FILES_QUERY = gql`
  query AllServerFiles($path: String) {
    allServerFiles(path: $path) {
      name
      fullPath
      size
      mtime
      isDir
    }
  }
`;

type ViewMode = "structure" | "allFiles";
type SortField = "name" | "size" | "mtime";
type SortOrder = "asc" | "desc";

export default function AdminServerFiles() {
  const { t } = useI18n();
  const theme = useTheme();
  const [path, setPath] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("structure");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const { data, loading, refetch } = useServerFilesQuery({
    variables: { path: path || null },
    skip: viewMode === "allFiles",
  });

  const {
    data: allFilesData,
    loading: loadingAllFiles,
    refetch: refetchAllFiles,
  } = useQuery(ALL_SERVER_FILES_QUERY, {
    variables: { path: null },
    skip: viewMode === "structure",
  });

  const [deleteFile, { loading: deleting }] = useDeleteServerFileMutation();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (viewMode === "structure") {
      await refetch({ path: path || null });
    } else {
      await refetchAllFiles({ path: null });
    }
    setRefreshing(false);
  };

  const onDelete = useCallback(async (name: string, filePath?: string) => {
    const title = t("administration.serverFiles.confirmDeleteTitle");
    const message = String(
      t("administration.serverFiles.confirmDeleteMessage")
    ).replace("{name}", name);
    Alert.alert(title, message, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          let deleteName = name;
          let deleteDirPath: string | null = null;

          if (viewMode === "allFiles" && filePath) {
            const pathParts = filePath.split("/");
            deleteName = pathParts.pop() || name;
            deleteDirPath = pathParts.length > 0 ? pathParts.join("/") : null;
          } else {
            deleteDirPath = path || null;
          }

          await deleteFile({
            variables: { name: deleteName, path: deleteDirPath },
          });

          if (viewMode === "structure") {
            await refetch({ path: path || null });
          } else {
            await refetchAllFiles({ path: null });
          }
        },
      },
    ]);
  }, [t, path, viewMode, deleteFile, refetch, refetchAllFiles]);

  const onDownload = useCallback(async (name: string, filePath?: string) => {
    try {
      const apiBase = settingsService.getApiBaseWithPrefix();
      let downloadPath: string | null = null;

      if (viewMode === "allFiles" && filePath) {
        // Extract directory path from fullPath
        const pathParts = filePath.split("/");
        pathParts.pop(); // Remove filename
        downloadPath = pathParts.length > 0 ? pathParts.join("/") : null;
      } else {
        downloadPath = path || null;
      }

      const url = `${apiBase}/server-manager/files/${encodeURIComponent(
        name
      )}/download${
        downloadPath ? `?path=${encodeURIComponent(downloadPath)}` : ""
      }`;
      if (Platform.OS === "web") {
        const token = settingsService.getAuthData().accessToken;
        const resp = await fetch(url, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (!resp.ok) throw new Error("Download failed");
        const blob = await resp.blob();
        const a = document.createElement("a");
        const href = URL.createObjectURL(blob);
        a.href = href;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
      } else {
        // Basic fallback for native
        // @ts-ignore
        window.open(url, "_blank");
      }
    } catch (e) {
      Alert.alert(
        t("common.error"),
        t("administration.serverFiles.downloadError")
      );
    }
  }, [t, path, viewMode]);

  const onUpload = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.uri || !asset.name) return;

      const apiBase = settingsService.getApiBaseWithPrefix();
      const url = `${apiBase}/server-manager/files/upload${
        path ? `?path=${encodeURIComponent(path)}` : ""
      }`;
      const token = settingsService.getAuthData().accessToken;
      const form: any = new FormData();
      if (Platform.OS === "web") {
        const blobResp = await fetch(asset.uri);
        const blob = await blobResp.blob();
        form.append("file", blob, asset.name);
      } else {
        form.append("file", {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/octet-stream",
        });
      }

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: form,
      });
      if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
      if (viewMode === "structure") {
        await refetch();
      } else {
        await refetchAllFiles({ path: null });
      }
      Alert.alert(
        t("common.success"),
        t("administration.serverFiles.uploadSuccess")
      );
    } catch (e: any) {
      Alert.alert(
        t("common.error"),
        t("administration.serverFiles.uploadError")
      );
    }
  };

  const breadcrumbs = useMemo(
    () => (path ? path.split("/").filter(Boolean) : []),
    [path]
  );

  // Sort files based on selected field and order
  const sortedFiles = useMemo(() => {
    const files =
      viewMode === "allFiles"
        ? (allFilesData?.allServerFiles || []).map((f: any) => ({
            name: f.name,
            fullPath: f.fullPath,
            size: f.size || 0,
            mtime: f.mtime,
            isDir: f.isDir,
          }))
        : data?.serverFiles || [];

    if (viewMode === "allFiles") {
      const sorted = [...files].sort((a: any, b: any) => {
        let comparison = 0;

        if (sortField === "name") {
          comparison = a.name.localeCompare(b.name);
        } else if (sortField === "size") {
          comparison = (a.size || 0) - (b.size || 0);
        } else if (sortField === "mtime") {
          comparison =
            new Date(a.mtime).getTime() - new Date(b.mtime).getTime();
        }

        return sortOrder === "asc" ? comparison : -comparison;
      });

      return sorted;
    }

    return files;
  }, [
    viewMode,
    allFilesData?.allServerFiles,
    data?.serverFiles,
    sortField,
    sortOrder,
  ]);

  const renderHeader = () => (
    <View
      style={[
        styles.headerContainer,
        { backgroundColor: theme.colors.surface },
      ]}
    >
      <Text
        variant="titleMedium"
        style={[styles.headerTitle, { color: theme.colors.onSurface }]}
      >
        {t("administration.serverFiles.title")}
      </Text>

      {/* View Mode Selector */}
      <View style={styles.selectorContainer}>
        <Selector
          mode="inline"
          label={t("administration.serverFiles.viewMode")}
          placeholder={t("administration.serverFiles.viewMode")}
          options={[
            {
              id: "structure",
              name: t("administration.serverFiles.structure"),
            },
            { id: "allFiles", name: t("administration.serverFiles.allFiles") },
          ]}
          selectedValue={viewMode}
          onValueChange={(value) => {
            setViewMode(value as ViewMode);
            if (value === "structure") {
              setPath("");
            }
          }}
        />
      </View>

      {/* Sort Controls - Only shown in allFiles mode */}
      {viewMode === "allFiles" && (
        <View style={styles.sortControls}>
          <View style={styles.sortSelector}>
            <Selector
              mode="inline"
              label={t("administration.serverFiles.sortBy")}
              placeholder={t("administration.serverFiles.sortBy")}
              options={[
                {
                  id: "name",
                  name: t("administration.serverFiles.sortByName"),
                },
                {
                  id: "size",
                  name: t("administration.serverFiles.sortBySize"),
                },
                {
                  id: "mtime",
                  name: t("administration.serverFiles.sortByDate"),
                },
              ]}
              selectedValue={sortField}
              onValueChange={(value) => setSortField(value as SortField)}
            />
          </View>
          <View style={styles.sortOrderSelector}>
            <Selector
              mode="inline"
              label={t("administration.serverFiles.sortOrder")}
              placeholder={t("administration.serverFiles.sortOrder")}
              options={[
                { id: "asc", name: t("administration.serverFiles.ascending") },
                {
                  id: "desc",
                  name: t("administration.serverFiles.descending"),
                },
              ]}
              selectedValue={sortOrder}
              onValueChange={(value) => setSortOrder(value as SortOrder)}
            />
          </View>
        </View>
      )}

      {/* Breadcrumbs - Only shown in structure mode */}
      {viewMode === "structure" && (
        <View style={styles.breadcrumbsRow}>
          <IconButton
            icon="home"
            mode="contained-tonal"
            onPress={() => setPath("")}
            size={20}
          />
          <IconButton
            icon="upload"
            mode="contained-tonal"
            onPress={onUpload}
            size={20}
          />
          {breadcrumbs.map((seg, idx) => {
            const newPath = breadcrumbs.slice(0, idx + 1).join("/");
            return (
              <View key={`${seg}-${idx}`} style={styles.breadcrumbItem}>
                <IconButton icon="chevron-right" size={16} disabled />
                <Text
                  onPress={() => setPath(newPath)}
                  style={[
                    styles.breadcrumbText,
                    { color: theme.colors.primary },
                  ]}
                >
                  {seg}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const displayFiles =
    viewMode === "allFiles" ? sortedFiles : data?.serverFiles || [];
  const isLoading =
    viewMode === "structure"
      ? loading && !data
      : loadingAllFiles && !allFilesData;

  return (
    <PaperScrollView
      withScroll={false}
      loading={isLoading}
      onRefresh={handleRefresh}
      contentContainerStyle={styles.listContent}
    >
      <FlatList
        data={displayFiles}
        keyExtractor={(item, index) => {
          if (viewMode === "allFiles") {
            return item.fullPath || `file-${index}`;
          }
          return item.name || `item-${index}`;
        }}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ item }) => {
          if (viewMode === "allFiles") {
            const fileItem = item as {
              name: string;
              fullPath: string;
              size: number;
              mtime: string;
              isDir: boolean;
            };
            return (
              <View
                style={[
                  styles.row,
                  { borderBottomColor: theme.colors.surfaceVariant },
                ]}
              >
                <View style={styles.rowMain}>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.fileName,
                      {
                        color: theme.colors.onSurface,
                      },
                    ]}
                  >
                    {fileItem.fullPath}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.metaText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {formatFileSize(fileItem.size || 0)} ·{" "}
                    {new Date(fileItem.mtime).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.actionsRow}>
                  <IconButton
                    icon="download"
                    mode="contained-tonal"
                    onPress={() => onDownload(fileItem.name, fileItem.fullPath)}
                  />
                  <IconButton
                    icon="delete"
                    mode="contained-tonal"
                    onPress={() => onDelete(fileItem.name, fileItem.fullPath)}
                    disabled={deleting}
                  />
                </View>
              </View>
            );
          } else {
            const fileItem = item as {
              name: string;
              size: number;
              mtime: string;
              isDir: boolean;
            };
            return (
              <View
                style={[
                  styles.row,
                  { borderBottomColor: theme.colors.surfaceVariant },
                ]}
              >
                <View style={styles.rowMain}>
                  <Text
                    variant="bodyMedium"
                    onPress={() => {
                      if (fileItem.isDir) {
                        const next = path
                          ? `${path}/${fileItem.name}`
                          : fileItem.name;
                        setPath(next);
                      }
                    }}
                    style={[
                      styles.fileName,
                      {
                        color: theme.colors.onSurface,
                        textDecorationLine: fileItem.isDir
                          ? "underline"
                          : "none",
                      },
                    ]}
                  >
                    {fileItem.isDir ? `📁 ${fileItem.name}` : fileItem.name}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.metaText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {fileItem.isDir ? "—" : formatFileSize(fileItem.size || 0)}{" "}
                    · {new Date(fileItem.mtime).toLocaleString()}
                  </Text>
                </View>
                {!fileItem.isDir && (
                  <View style={styles.actionsRow}>
                    <IconButton
                      icon="download"
                      mode="contained-tonal"
                      onPress={() => onDownload(fileItem.name)}
                    />
                    <IconButton
                      icon="delete"
                      mode="contained-tonal"
                      onPress={() => onDelete(fileItem.name)}
                      disabled={deleting}
                    />
                  </View>
                )}
              </View>
            );
          }
        }}
      />
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    marginBottom: 8,
  },
  selectorContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  sortControls: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  sortSelector: {
    flex: 1,
  },
  sortOrderSelector: {
    flex: 1,
  },
  breadcrumbsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
    marginTop: 8,
  },
  breadcrumbItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  breadcrumbText: {
    textDecorationLine: "underline",
  },
  listContent: {
    paddingHorizontal: 0,
    paddingBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: 1,
  },
  rowMain: {
    flex: 1,
  },
  fileName: {
    // font handled by Text variant
  },
  metaText: {
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 4,
  },
});
