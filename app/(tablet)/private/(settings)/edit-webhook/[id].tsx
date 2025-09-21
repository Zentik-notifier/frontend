import { CreateWebhookForm } from "@/components";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Icon from "@/components/ui/Icon";
import { Colors } from "@/constants/Colors";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

export default function TabletEditWebhookFromSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const router = useRouter();

  if (!id) {
    return null;
  }

  const handleClose = () => {
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header with close button */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: Colors[colorScheme].backgroundCard,
            borderBottomColor: Colors[colorScheme].border,
          },
        ]}
      >
        <ThemedText style={styles.headerTitle}>
          {t("webhooks.edit")}
        </ThemedText>
        <TouchableOpacity
          style={[
            styles.closeButton,
            { backgroundColor: Colors[colorScheme].background },
          ]}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <Icon name="close" size="md" color={Colors[colorScheme].text} />
        </TouchableOpacity>
      </View>

      {/* Edit webhook content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <CreateWebhookForm webhookId={id} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
});
