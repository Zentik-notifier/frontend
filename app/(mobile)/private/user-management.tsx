import UserManagement from "@/components/UserManagement";
import { ThemedView } from "@/components/ThemedView";
import React from "react";
import { StyleSheet } from "react-native";

export default function UserManagementScreen() {
  return (
    <ThemedView style={styles.container}>
      <UserManagement />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});