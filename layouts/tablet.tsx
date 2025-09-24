import Header from "@/components/Header";
import { useI18n } from "@/hooks";
import { Stack } from "expo-router";

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
