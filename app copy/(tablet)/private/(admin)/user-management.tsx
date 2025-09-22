import UserManagement from "@/components/UserManagement";
import { ThemedView } from "@/components/ThemedView";
import React from "react";
import { StyleSheet, View } from "react-native";

export default function UserManagementPage() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <UserManagement />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
});
