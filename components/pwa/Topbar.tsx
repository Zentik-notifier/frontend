import { useTheme } from "@/hooks/useTheme";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export function Topbar() {
  const { colorScheme } = useTheme();

  return (
    <View style={[styles.container, colorScheme === "dark" && styles.dark]}>
      <Text style={styles.title}>Zentik</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.iconButton}>
          <Text>🔍</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <Text>⚙️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  dark: {
    backgroundColor: "#111",
    borderBottomColor: "#222",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    marginLeft: 12,
    padding: 8,
  },
});


