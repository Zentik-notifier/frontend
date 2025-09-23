import CloseHeader from "@/components/CloseHeader";
import Header from "@/components/Header";
import { useI18n } from "@/hooks";
import { useNavigationUtils } from "@/utils/navigation";
import { Stack } from "expo-router";

export default function TabletLayout() {
  const { t } = useI18n();
  const { navigateToHome } = useNavigationUtils();

  return (
    <Stack>
      <Stack.Screen
        name="(mobile)/(home)/(tabs)"
        options={{
          headerTitle: "",
          header: () => <Header />,
        }}
      />
      <Stack.Screen
        name="(mobile)/(settings)/index"
        options={{
          headerTitle: t("common.settings"),
        }}
      />
      <Stack.Screen
        name="(mobile)/(home)/notification/[id]"
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
    </Stack>
  );
}
