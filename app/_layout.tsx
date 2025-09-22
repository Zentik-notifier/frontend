import { AlertModal } from "@/components/AlertModal";
import { GraphQLProvider } from "@/components/GraphQLProvider";
import { I18nProvider } from "@/components/I18nProvider";
import { TermsAcceptanceScreen } from "@/components/TermsAcceptanceScreen";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/hooks/useI18n";
import { RequireAuth } from "@/services/require-auth";
import { useUserSettings } from "@/services/user-settings";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { Alert, BackHandler, Platform, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ApiConfigService } from "../services/api-config";
import { AppProvider, useAppContext } from "../services/app-context";
import { installConsoleLoggerBridge } from "../services/console-logger-hook";
import { openSharedCacheDb } from "../services/media-cache-db";
import { useDeviceType } from "@/hooks/useDeviceType";

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

type WebAlertState = {
  visible: boolean;
  title?: string;
  message?: string;
  buttons?: AlertButton[];
};

function ThemedLayout({ children }: { children: React.ReactNode }) {
  const { colorScheme } = useTheme();

  return (
    <NavigationThemeProvider
      value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
    >
      {children}
    </NavigationThemeProvider>
  );
}

function DeepLinkHandler() {
  const { refreshUserData } = useAppContext();

  useEffect(() => {
    const subscription = Linking.addEventListener("url", async ({ url }) => {
      if (!url) return;

      try {
        const parsed = Linking.parse(url);
        if (parsed?.scheme === "zentik" && parsed?.path === "public/oauth") {
          const hash = url.split("#")[1] || "";
          const params = new URLSearchParams(hash);
          const accessToken = params.get("accessToken");
          const refreshToken = params.get("refreshToken");
          const connected = params.get("connected");
          const provider = params.get("provider");
          const oauthParams = new URLSearchParams();
          if (accessToken) oauthParams.set("accessToken", accessToken);
          if (refreshToken) oauthParams.set("refreshToken", refreshToken);
          if (connected) oauthParams.set("connected", connected);
          if (provider) oauthParams.set("provider", provider);
          router.push(`/(auth)/oauth?${oauthParams.toString()}`);
          return;
        }
      } catch (e) {
        console.error("🔗 Error handling deep link:", e);
      }
    });

    return () => subscription.remove();
  }, [refreshUserData]);

  return null;
}

function TermsGuard({ children }: { children: React.ReactNode }) {
  const { hasAcceptedTerms, acceptTerms } = useUserSettings();

  const handleTermsAccepted = async () => {
    await acceptTerms();
  };

  const handleTermsDeclined = () => {
    console.log("Terms declined - handling platform-specific behavior");
    if (Platform.OS === "android") {
      BackHandler.exitApp();
    } else {
      console.log(
        "iOS detected - delegating closure handling to TermsAcceptanceScreen"
      );
    }
  };

  if (!hasAcceptedTerms()) {
    return (
      <SafeAreaView style={styles.container}>
        <TermsAcceptanceScreen
          onAccepted={handleTermsAccepted}
          onDeclined={handleTermsDeclined}
        />
        <StatusBar
          style="auto"
          backgroundColor="transparent"
          translucent={Platform.OS === "android"}
        />
      </SafeAreaView>
    );
  }

  if (hasAcceptedTerms()) {
    return <>{children}</>;
  }

  return null;
}

function AppStack() {
  const { t } = useI18n();
  const { isMobile } = useDeviceType();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTitle: "",
        headerBackTitle: t("common.back"),
        animation: "slide_from_right",
        gestureEnabled: true,
        gestureDirection: "horizontal",
      }}
    >
      {/* AUTH */}
      <Stack.Screen
        name="(auth)"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />

      {/* HOME */}
      <Stack.Screen
        name="home"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />

      {/* HOME TABS */}
      <Stack.Screen
        name="(homeTabs)"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />

      {/* SETTINGS */}
      <Stack.Screen
        name="settings"
        options={{
          headerShown: !isMobile,
        }}
      />

      {/* NOTIFICATION DETAIL */}
      <Stack.Screen
        name="notification-detail"
        options={{
          headerShown: false,
          presentation: "modal",
          gestureEnabled: true,
          gestureDirection: "vertical",
          animation: "slide_from_bottom",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [webAlert, setWebAlert] = useState<WebAlertState>({ visible: false });
  const originalAlertRef = useRef<typeof Alert.alert>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    if (!originalAlertRef.current) {
      originalAlertRef.current = Alert.alert;
    }

    const isErrorTitle = (title?: string) => {
      if (!title) return false;
      return /(error|errore|failed|fail|unable|impossibile)/i.test(title);
    };

    Alert.alert = (
      title?: string,
      message?: string,
      buttons?: AlertButton[]
    ) => {
      const looksLikeError = isErrorTitle(title);

      let normalizedButtons: AlertButton[];
      if (buttons && buttons.length > 0) {
        normalizedButtons = [...buttons];
        if (looksLikeError) {
          // Se non è specificato alcuno style, marca l'ultimo bottone come distruttivo
          const anyStyle = normalizedButtons.some((b) => b.style);
          if (!anyStyle) {
            const lastIdx = normalizedButtons.length - 1;
            normalizedButtons[lastIdx] = {
              ...normalizedButtons[lastIdx],
              style: "destructive",
            };
          }
        }
      } else {
        normalizedButtons = looksLikeError
          ? [{ text: "OK", style: "destructive" }]
          : [{ text: "OK" }];
      }

      setWebAlert({
        visible: true,
        title,
        message,
        buttons: normalizedButtons,
      });
    };

    return () => {
      if (originalAlertRef.current) {
        Alert.alert = originalAlertRef.current;
      }
    };
  }, []);

  const handleCloseAlert = () => setWebAlert((s) => ({ ...s, visible: false }));

  useEffect(() => {
    installConsoleLoggerBridge();
    console.log("🔄 [LayoutInit] Console logger bridge installed");
    ApiConfigService.initialize().catch();
    console.log("🔄 [LayoutInit] App config initialized");
    openSharedCacheDb().catch();
    console.log("🔄 [LayoutInit] Shared cache DB opened");
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <I18nProvider>
            <GraphQLProvider>
              <TermsGuard>
                <AppProvider>
                  <DeepLinkHandler />
                  <RequireAuth>
                    <ThemedLayout>
                      <AppStack />
                      <StatusBar
                        style="auto"
                        backgroundColor="transparent"
                        translucent={Platform.OS === "android"}
                      />

                      <AlertModal
                        visible={webAlert.visible}
                        title={webAlert.title}
                        message={webAlert.message}
                        buttons={webAlert.buttons}
                        onClose={handleCloseAlert}
                      />
                    </ThemedLayout>
                  </RequireAuth>
                </AppProvider>
              </TermsGuard>
            </GraphQLProvider>
          </I18nProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
