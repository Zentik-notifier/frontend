import CreateSystemAccessTokenForm from "@/components/CreateSystemAccessTokenForm";
import RefreshableScrollView from "@/components/RefreshableScrollView";
import { ThemedView } from "@/components/ThemedView";
import React from "react";
import { StyleSheet } from "react-native";

export default function CreateSystemAccessTokenScreen() {
  const handleRefresh = async () => {};

  return (
    <ThemedView style={styles.container}>
      <RefreshableScrollView style={styles.content} onRefresh={handleRefresh}>
        {() => <CreateSystemAccessTokenForm showTitle />}
      </RefreshableScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
});
