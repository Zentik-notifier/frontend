import { GraphQLProvider } from "@/components/GraphQLProvider";
import { I18nProvider } from "@/components/I18nProvider";
import { Topbar } from "@/components/pwa/Topbar";
import { ThemeProvider } from "@/hooks/useTheme";
import { AppProvider } from "@/services/app-context";
import { Slot } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function PWALayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nProvider>
          <GraphQLProvider>
            <AppProvider>
              <View style={styles.container}>
                <Topbar />
                <Slot />
              </View>
            </AppProvider>
          </GraphQLProvider>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
});


