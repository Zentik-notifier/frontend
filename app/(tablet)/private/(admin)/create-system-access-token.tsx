import CreateSystemAccessTokenForm from "@/components/CreateSystemAccessTokenForm";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Icon from "@/components/ui/Icon";
import { useI18n } from "@/hooks/useI18n";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export default function CreateSystemAccessTokenPage() {
  const { t } = useI18n();
  const router = useRouter();

  const handleClose = () => {
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>
          {t("systemAccessTokens.form.title")}
        </ThemedText>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Icon name="close" size="md" color="primary" />
        </TouchableOpacity>
      </View>

      {/* Form Content */}
      <View style={styles.content}>
        <CreateSystemAccessTokenForm />
      </View>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    padding: 24,
  },
});
