import AdminSidebar from "@/components/AdminSidebar";
import { Slot } from "expo-router";
import React from "react";
import { View } from "react-native";

export default function TabletAdminLayout() {
  return (
    <View style={{ flex: 1, flexDirection: "row" }}>
      <AdminSidebar />
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
