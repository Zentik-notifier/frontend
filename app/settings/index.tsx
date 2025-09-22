import React, { useEffect } from "react";
import { router } from "expo-router";
import { useDeviceType } from "@/hooks/useDeviceType";
import SettingsLanding from "@/components/SettingsLanding";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { StyleSheet } from "react-native";

export default function SettingsPage() {
  const { isMobile } = useDeviceType();

  useEffect(() => {
    if (!isMobile) {
      router.replace("/settings/user-profile");
    }
  }, [isMobile]);

  // Su mobile mostra la landing page delle impostazioni
  if (isMobile) {
    return <SettingsLanding />;
  }

  // Su desktop mostra un messaggio di default (verrà reindirizzato)
  return (
    <ThemedView style={styles.desktopDefault}>
      <ThemedText style={styles.desktopDefaultText}>
        Seleziona un'impostazione dalla sidebar
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  desktopDefault: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  desktopDefaultText: {
    fontSize: 18,
    opacity: 0.7,
  },
});
