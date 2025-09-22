import Header from "@/components/Header";
import UserDropdown from "@/components/UserDropdown";
import { useI18n } from "@/hooks";
import { Stack } from "expo-router";

export default function TabletLayout() {
  const { t } = useI18n();

  return (
    <Stack>
      <Stack.Screen
        name="(home)/(stack)"
        options={{
          headerShown: true,
          headerBackTitle: "",
          headerTitle: "Home",
          headerRight: () => <UserDropdown />,
          headerLeft: () => <Header />,
        }}
      />
      <Stack.Screen
        name="(home)/(stack)/notification/[id]"
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
        name="(auth)/login"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(auth)/oauth"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(auth)/forgot-password"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(auth)/register"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(auth)/confirm-email"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(auth)/email-confirmation"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
