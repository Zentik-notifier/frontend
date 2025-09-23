import Header from "@/components/Header";
import HomeSidebar from "@/components/HomeSidebar";
import SettingsSidebar from "@/components/SettingsSidebar";
import UserDropdown from "@/components/UserDropdown";
import { useI18n } from "@/hooks";
import { Slot, Stack, useSegments } from "expo-router";
import { View } from "react-native";

export default function TabletLayout() {
  const { t } = useI18n();

  return (
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
}
