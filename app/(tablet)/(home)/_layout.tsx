import HomeSidebar from "@/components/HomeSidebar";
import { Slot } from "expo-router";
import React from "react";
import { View } from "react-native";

export default function TabletHomeLayout() {
  return (
    <View style={{ flex: 1, flexDirection: "row" }}>
      <HomeSidebar />
      <View
        style={{
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: 0,
          overflow: "hidden",
        }}
      >
        <Slot />
      </View>
    </View>
  );
}
