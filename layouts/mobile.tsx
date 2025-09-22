import { StatusBadge } from "@/components";
import Header from "@/components/Header";
import UserDropdown from "@/components/UserDropdown";
import { useI18n } from "@/hooks";
import { Stack } from "expo-router";

export default function MobileLayout() {
  const { t } = useI18n();

  return (
    <Stack>
      <Stack.Screen
        name="(home)/(tabs)"
        options={{
          headerShown: true,
          headerBackTitle: "",
          headerTitle: "Home",
          headerRight: () => <UserDropdown />,
          headerLeft: () => <Header />,
          // headerLeft: () => <StatusBadge />,
        }}
      />
      <Stack.Screen
        name="(home)/notification-standalone/[id]"
        options={{
          headerTitle: "",
          headerShown: false,
          presentation: "modal",
          gestureEnabled: true,
          gestureDirection: "vertical",
          animationTypeForReplace: "push",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="(home)/bucket-setting-standalone/create"
        options={{
          headerTitle: t("buckets.form.createTitle"),
        }}
      />
    </Stack>
  );
}
