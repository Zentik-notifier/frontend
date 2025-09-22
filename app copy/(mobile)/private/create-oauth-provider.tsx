import CreateOAuthProviderForm from "@/components/CreateOAuthProviderForm";
import { ThemedView } from "@/components/ThemedView";
import React from "react";
import {
    ScrollView,
    StyleSheet,
} from "react-native";

export default function CreateOAuthProviderScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <CreateOAuthProviderForm showTitle={true} />
      </ScrollView>
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
