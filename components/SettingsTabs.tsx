import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "./ui/Icon";

interface SettingsTabsProps {
  activeSection: "user" | "application";
  onSectionChange: (section: "user" | "application") => void;
}

export default function SettingsTabs({
  activeSection,
  onSectionChange,
}: SettingsTabsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.tab,
          styles.leftTab,
          {
            backgroundColor: activeSection === "user" ? "#0a7ea4" : "#f8f9fa",
          },
        ]}
        onPress={() => onSectionChange("user")}
      >
        <Icon 
          name="user" 
          size="sm" 
          color={activeSection === "user" ? "white" : "primary"} 
        />
        <Text
          style={[
            styles.tabText,
            {
              color: activeSection === "user" ? "#fff" : "#0a7ea4",
            },
          ]}
        >
          User
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          {
            backgroundColor:
              activeSection === "application" ? "#0a7ea4" : "#f8f9fa",
          },
        ]}
        onPress={() => onSectionChange("application")}
      >
        <Icon 
          name="settings" 
          size="sm" 
          color={activeSection === "application" ? "white" : "primary"} 
        />
        <Text
          style={[
            styles.tabText,
            {
              color: activeSection === "application" ? "#fff" : "#0a7ea4",
            },
          ]}
        >
          Application
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
  },
  leftTab: {
    marginRight: 12,
  },
  icon: {
    fontSize: 16,
    marginRight: 6,
  },
  tabText: {
    fontWeight: "600",
    fontSize: 14,
  },
});
