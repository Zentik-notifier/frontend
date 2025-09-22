import { Colors } from "@/constants/Colors";
import { useI18n } from "@/hooks";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useColorScheme } from "@/hooks/useTheme";
import { useNavigationUtils } from "@/utils/navigation";
import SettingsDesktopLayout from "@/views/SettingsDesktopLayout";
import { HeaderBackButton } from "@react-navigation/elements";
import { Slot, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

export default function SettingsLayout() {
  const { isReady, isMobile } = useDeviceType();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { navigateToHome } = useNavigationUtils();

  if (!isReady) {
    return null;
  }

  const stack = (
    <Stack
      screenOptions={{
        headerShown: isMobile,
        headerBackTitle: t("common.back"),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          headerTitle: "",
          headerLeft: () => (
            <HeaderBackButton
              label={t("common.back")}
              tintColor={Colors[colorScheme].text}
              onPress={navigateToHome}
            />
          ),
        }}
      />
      <Stack.Screen
        name="user-profile"
        options={{
          headerShown: true,
          headerTitle: "",
        }}
      />
      <Stack.Screen
        name="app-settings"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: t("common.back"),
        }}
      />
      <Stack.Screen
        name="change-password"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: t("common.back"),
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: t("common.back"),
        }}
      />
      <Stack.Screen
        name="devices"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: t("common.back"),
        }}
      />
      <Stack.Screen
        name="user-sessions"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: t("common.back"),
        }}
      />
      <Stack.Screen
        name="logs"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: t("common.back"),
        }}
      />
      <Stack.Screen
        name="bucket/create"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: t("common.back"),
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
        name="bucket/list"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: t("common.back"),
        }}
      />
      <Stack.Screen
        name="access-token/create"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: t("common.back"),
        }}
      />
      <Stack.Screen
        name="access-token/list"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: t("common.back"),
        }}
      />
      <Stack.Screen
        name="webhook/create"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: t("common.back"),
        }}
      />
      <Stack.Screen
        name="webhook/[id]"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: t("common.back"),
        }}
      />
      <Stack.Screen
        name="webhook/list"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: t("common.back"),
        }}
      />
    </Stack>
  );

  if (isMobile) {
    return stack;
  } else {
    return (
      <View style={styles.desktopContainer}>
        <View style={styles.desktopContent}>
          <View
            style={[
              styles.sidebar,
              { borderColor: Colors[colorScheme].border },
            ]}
          >
            <SettingsDesktopLayout />
          </View>
          <View style={styles.content}>
            <Slot />
          </View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
  },
  contentHeader: {
    height: 60,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderBottomWidth: 1,
    backgroundColor: "transparent",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
    borderRadius: 6,
  },
  desktopContent: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 280,
    borderRightWidth: 1,
  },
  content: {
    flex: 1,
  },
});
