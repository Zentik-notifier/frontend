import { useDeviceType } from "@/hooks/useDeviceType";
import { Stack, Slot } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useTheme";
import Header from "@/components/Header";
import HomeDesktopLayout from "../../views/HomeDesktopLayout";
import { useI18n } from "@/hooks";

export default function HomeLayout() {
  const { isReady, isMobile } = useDeviceType();
  const colorScheme = useColorScheme();
  const { t } = useI18n();

  if (!isReady) {
    return null;
  }

  if (isMobile) {
    return (
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="notification-detail/[id]"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="bucket/[id]"
          options={{
            headerShown: true,
            headerTitle: "",
            headerBackTitle: t("common.back"),
          }}
        />
        <Stack.Screen
          name="edit-bucket/[id]"
          options={{
            headerShown: true,
            headerTitle: "",
            headerBackTitle: t("common.back"),
          }}
        />
      </Stack>
    );
  } else {
    return (
      <View
        style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}
      >
        <Header />
        <View style={{ flex: 1, flexDirection: "row" }}>
          <View
            style={{
              borderRightWidth: 1,
              borderRightColor: Colors[colorScheme].border,
            }}
          >
            <HomeDesktopLayout />
          </View>
          <View
            style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}
          >
            <Slot />
          </View>
        </View>
      </View>
    );
  }
}