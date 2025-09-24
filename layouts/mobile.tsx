import { ThemedText } from "@/components";
import Header from "@/components/Header";
import { useI18n } from "@/hooks";
import { useNavigationUtils } from "@/utils/navigation";
import { Stack, useNavigation } from "expo-router";
import { useLocalSearchParams } from "expo-router/build/hooks";
import { Pressable } from "react-native";

export default function TabletLayout() {
  const { t } = useI18n();
  const { navigateToHome } = useNavigationUtils();
  const { forceFetch } = useLocalSearchParams();

  return (
    <Stack>
      <Stack.Screen
        name="(mobile)/(home)/(tabs)"
        options={{
          headerTitle: t("common.home"),
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
        name="(mobile)/(admin)/index"
        options={{
          headerTitle: t("administration.title"),
        }}
      />
      <Stack.Screen
        name="(mobile)/(home)/notification/[id]"
        options={{
          headerTitle: "",
          headerLeft: () =>
            forceFetch ? (
              <Pressable onPress={navigateToHome}>
                <ThemedText>{t("common.home")}</ThemedText>
              </Pressable>
            ) : undefined,
          // headerShown: false,
          // presentation: "modal",
          // gestureEnabled: true,
          // gestureDirection: "vertical",
          // animationTypeForReplace: "push",
          // animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="(mobile)/(home)/bucket/settings/[id]"
        options={{
          headerTitle: t("buckets.form.editTitle"),
        }}
      />
    </Stack>
  );
}
