import BucketDetail from "@/components/BucketDetail";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useGetBucketData } from "@/hooks";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { ThemedText } from "../../../components/ThemedText";
import Icon from "../../../components/ui/Icon";

export default function BucketDetailScreen() {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { bucket, loading, error } = useGetBucketData(id);

  if (loading || !bucket) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t("common.loading"),
            headerShown: true,
          }}
        />
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
          <ThemedText
            style={[
              styles.loadingText,
              { color: Colors[colorScheme].textSecondary },
            ]}
          >
            {t("buckets.loadingBucket")}
          </ThemedText>
        </ThemedView>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t("common.error"),
            headerShown: true,
          }}
        />
        <ThemedView style={styles.errorContainer}>
          <Icon name="warning" size="lg" color="error" />
          <ThemedText
            style={[styles.errorTitle, { color: Colors[colorScheme].text }]}
          >
            {t("buckets.bucketNotFound")}
          </ThemedText>
          <ThemedText
            style={[
              styles.errorDescription,
              { color: Colors[colorScheme].textSecondary },
            ]}
          >
            {t("buckets.bucketNotFoundDescription")}
          </ThemedText>
          <TouchableOpacity
            style={[
              styles.backButton,
              { backgroundColor: Colors[colorScheme].tint },
            ]}
            onPress={() => router.back()}
          >
            <ThemedText style={[styles.backButtonText, { color: "white" }]}>
              {t("common.back")}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: bucket!.name,
          headerShown: true,
          headerStyle: {
            backgroundColor: Colors[colorScheme].background,
          },
          headerTintColor: Colors[colorScheme].text,
        }}
      />

      <BucketDetail bucketId={bucket!.id} />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
