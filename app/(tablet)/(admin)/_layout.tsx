import AdminSidebar from "@/components/AdminSidebar";
import { Slot } from "expo-router";
import React from "react";
import { View, StyleSheet } from "react-native";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useTheme } from "react-native-paper";

export default function TabletAdminLayout() {
  const { isDesktop } = useDeviceType();
  const theme = useTheme();

  const sidebarWidth = isDesktop ? 400 : 300;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.sidebar,
          { width: sidebarWidth, borderRightColor: theme.colors.outline },
        ]}
      >
        <AdminSidebar />
      </View>
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    borderRightWidth: 1,
  },
  content: {
    flex: 1,
    overflow: "hidden",
  },
});
