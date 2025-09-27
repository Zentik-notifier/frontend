import SettingsSidebar from "@/components/SettingsSidebar";
import { Slot } from "expo-router";
import React from "react";
import { View } from "react-native";

export default function TabletSettingsLayout() {
  return (
    <View style={{ flex: 1, flexDirection: "row" }}>
      <SettingsSidebar />
      <View
        style={{
          flex: 1,
          overflow: "hidden",
        }}
      >
        <Slot />
      </View>
    </View>
  );
}
