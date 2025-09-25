import Header from "@/components/Header";
import { useI18n } from "@/hooks";
import { useDeviceType } from "@/hooks/useDeviceType";
import { Stack } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";

export default function TabletLayout() {
  const { t } = useI18n();
  const { isDesktop } = useDeviceType();

  const content = (
    <Stack>
      <Stack.Screen
        name="(tablet)/(home)"
        options={{
          headerTitle: t("common.home"),
          header: () => <Header />,
        }}
      />
      <Stack.Screen
        name="(tablet)/(settings)"
        options={{
          headerTitle: t("common.settings"),
        }}
      />
      <Stack.Screen
        name="(tablet)/(admin)"
        options={{
          headerTitle: t("administration.title"),
        }}
      />
    </Stack>
  );

  if (isDesktop) {
    return (
      <View style={styles.webContainer}>
        <View style={styles.webContentWrapper}>{content}</View>
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  webContentWrapper: {
    width: "100%",
    maxWidth: 1200,
    height: "100%",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
});
