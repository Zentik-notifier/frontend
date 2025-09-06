import { ConversationList } from "@/components/pwa/ConversationList";
import { ConversationView } from "@/components/pwa/ConversationView";
import React from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

export default function PwaIndex() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  return (
    <View style={styles.container}>
      <View style={[styles.sidebar, isDesktop ? styles.sidebarDesktop : isTablet ? styles.sidebarTablet : styles.sidebarMobile]}>
        <ConversationList />
      </View>
      {(isDesktop || isTablet) && (
        <View style={styles.content}>
          <ConversationView />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    height: "100%",
  },
  sidebar: {
    borderRightWidth: 1,
    borderRightColor: "#eee",
    backgroundColor: "#fafafa",
  },
  sidebarDesktop: {
    width: 360,
  },
  sidebarTablet: {
    width: 320,
  },
  sidebarMobile: {
    width: 80,
  },
  content: {
    flex: 1,
  },
});


