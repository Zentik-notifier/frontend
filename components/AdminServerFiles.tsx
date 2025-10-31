import React from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { Card, IconButton, Text } from "react-native-paper";
import * as DocumentPicker from "expo-document-picker";
import { useI18n } from "@/hooks/useI18n";
import { settingsService } from "@/services/settings-service";
import {
  useServerFilesQuery,
  useDeleteServerFileMutation,
} from "@/generated/gql-operations-generated";
import PaperScrollView from "./ui/PaperScrollView";

export default function AdminServerFiles() {
  const { t } = useI18n();
  const { data, loading, refetch } = useServerFilesQuery();
  const [deleteFile, { loading: deleting }] = useDeleteServerFileMutation();

  const onDelete = (name: string) => {
    const title = t("administration.serverFiles.confirmDeleteTitle") as string;
    const message = String(
      t("administration.serverFiles.confirmDeleteMessage")
    ).replace("{name}", name);
    Alert.alert(title, message, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          await deleteFile({ variables: { name } });
          await refetch();
        },
      },
    ]);
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
      const url = `${apiBase}/server-manager/files/upload`;
      const token = settingsService.getAuthData().accessToken;
      const form: any = new FormData();
      form.append("file", {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || "application/octet-stream",
      });

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

  return (
    <PaperScrollView
      loading={loading}
      refetch={async () => {
        await refetch();
      }}
      customActions={[
        {
          icon: "refresh",
          label: t("administration.serverFiles.refresh"),
          onPress: async () => {
            await refetch();
          },
          style: { backgroundColor: "#94a3b8" },
        },
        {
          icon: "upload",
          label: t("administration.serverFiles.upload"),
          onPress: onUpload,
        },
      ]}
    >
      <FlatList
        data={data?.serverFiles || []}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">{item.name}</Text>
              <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                {(item.size || 0) + " bytes"} ·{" "}
                {new Date(item.mtime).toLocaleString()}
              </Text>
            </View>
            <IconButton
              icon="delete"
              mode="contained-tonal"
              onPress={() => onDelete(item.name)}
              disabled={deleting}
            />
          </View>
        )}
      />
    </PaperScrollView>
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
