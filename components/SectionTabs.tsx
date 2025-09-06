import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "./ui/Icon";

interface SectionTabsProps {
  activeSection: "notifications" | "buckets";
  onSectionChange: (section: "notifications" | "buckets") => void;
}

export default function SectionTabs({
  activeSection,
  onSectionChange,
}: SectionTabsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.tab,
          styles.leftTab,
          {
            backgroundColor:
              activeSection === "notifications" ? "#0a7ea4" : "#f8f9fa",
          },
        ]}
        onPress={() => onSectionChange("notifications")}
      >
        <Icon 
          name="notification" 
          size="md" 
          color={activeSection === "notifications" ? "white" : "primary"} 
        />
        <Text
          style={[
            styles.tabText,
            {
              color: activeSection === "notifications" ? "#fff" : "#0a7ea4",
            },
          ]}
        >
          Notifications
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          {
            backgroundColor:
              activeSection === "buckets" ? "#0a7ea4" : "#f8f9fa",
          },
        ]}
        onPress={() => onSectionChange("buckets")}
      >
        <Icon 
          name="bucket" 
          size="md" 
          color={activeSection === "buckets" ? "white" : "primary"} 
        />
        <Text
          style={[
            styles.tabText,
            {
              color: activeSection === "buckets" ? "#fff" : "#0a7ea4",
            },
          ]}
        >
          Buckets
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    minWidth: 120,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  leftTab: {
    marginRight: 12,
  },
  tabText: {
    fontWeight: "600",
    fontSize: 14,
  },
});
