import React, { useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, View, Platform, RefreshControl } from "react-native";
import { Card, IconButton, Text, ActivityIndicator, useTheme } from "react-native-paper";
import * as DocumentPicker from "expo-document-picker";
import { useI18n } from "@/hooks/useI18n";
import { settingsService } from "@/services/settings-service";
import {
  useServerFilesQuery,
  useDeleteServerFileMutation,
} from "@/generated/gql-operations-generated";

export default function AdminServerFiles() {
  const { t } = useI18n();
  const theme = useTheme();
  const [path, setPath] = useState<string>("");
  const { data, loading, refetch } = useServerFilesQuery({
    variables: { path: path || null },
  });
  const [deleteFile, { loading: deleting }] = useDeleteServerFileMutation();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch({ path: path || null });
    setRefreshing(false);
  };

  const onDelete = (name: string) => {
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
          await deleteFile({ variables: { name, path: path || null } });
          await refetch({ path: path || null });
        },
      },
    ]);
  };

  const onDownload = async (name: string) => {
    try {
      const apiBase = settingsService.getApiBaseWithPrefix();
      const url = `${apiBase}/server-manager/files/${encodeURIComponent(name)}/download${path ? `?path=${encodeURIComponent(path)}` : ''}`;
      if (Platform.OS === 'web') {
        const token = settingsService.getAuthData().accessToken;
        const resp = await fetch(url, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
        if (!resp.ok) throw new Error('Download failed');
        const blob = await resp.blob();
        const a = document.createElement('a');
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
        window.open(url, '_blank');
      }
    } catch (e) {
      Alert.alert(t('common.error'), 'Download failed');
    }
  };

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
      await refetch();
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

  const renderHeader = () => (
    <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
      <Text variant="titleMedium" style={{ marginBottom: 8 }}>
        {t("administration.serverFiles.title")}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
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
            <View
              key={`${seg}-${idx}`}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <IconButton icon="chevron-right" size={16} disabled />
              <Text
                onPress={() => setPath(newPath)}
                style={{ textDecorationLine: "underline" }}
              >
                {seg}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  if (loading && !data) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={data?.serverFiles || []}
      keyExtractor={(item) => item.name}
      ListHeaderComponent={renderHeader}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text
              variant="bodyMedium"
              onPress={() => {
                if (item.isDir) {
                  const next = path ? `${path}/${item.name}` : item.name;
                  setPath(next);
                }
              }}
              style={{
                textDecorationLine: item.isDir ? "underline" : "none",
              }}
            >
              {item.isDir ? `📁 ${item.name}` : item.name}
            </Text>
            <Text variant="bodySmall" style={{ opacity: 0.7 }}>
              {item.isDir ? "—" : (item.size || 0) + " bytes"} ·{" "}
              {new Date(item.mtime).toLocaleString()}
            </Text>
          </View>
          {!item.isDir && (
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <IconButton
                icon="download"
                mode="contained-tonal"
                onPress={() => onDownload(item.name)}
              />
              <IconButton
                icon="delete"
                mode="contained-tonal"
                onPress={() => onDelete(item.name)}
                disabled={deleting}
              />
            </View>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },
});
