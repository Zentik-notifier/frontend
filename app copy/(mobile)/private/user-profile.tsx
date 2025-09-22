import { ThemedView } from "@/components/ThemedView";
import UserSection from "@/components/UserSection";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useTheme";
import React, { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";

export default function UserProfileScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      console.debug("Refreshing user profile");
      // Add a delay to allow components to complete their refresh
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error("Error refreshing user profile:", error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors[colorScheme ?? 'light'].tint]} // Android
            tintColor={Colors[colorScheme ?? 'light'].tint} // iOS
          />
        }
      >
        <UserSection refreshing={refreshing} />
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
    padding: 20,
    paddingTop: 30,
  },
});
