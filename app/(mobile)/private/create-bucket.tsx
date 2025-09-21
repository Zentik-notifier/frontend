import CreateBucketForm from "@/components/CreateBucketForm";
import RefreshableScrollView from "@/components/RefreshableScrollView";
import { ThemedView } from "@/components/ThemedView";
import React from "react";
import { StyleSheet } from "react-native";

export default function CreateBucketScreen() {
  const handleRefresh = async () => {
    console.debug("Refreshing create bucket form");
  };

  return (
    <ThemedView style={styles.container}>
      <RefreshableScrollView style={styles.content} onRefresh={handleRefresh}>
        {() => <CreateBucketForm withHeader />}
      </RefreshableScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
