import { GraphQLProvider } from "@/components/GraphQLProvider";
import { I18nProvider } from "@/components/I18nProvider";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { useDeviceType } from "@/hooks/useDeviceType";
import { usePendingIntents } from "@/hooks/usePendingNotifications";
import { ThemeProvider } from "@/hooks/useTheme";
import MobileLayout from "@/layouts/mobile";
import TabletLayout from "@/layouts/tablet";
import { RequireAuth } from "@/services/require-auth";
import { useNavigationUtils } from "@/utils/navigation";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Platform, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MenuProvider } from "react-native-popup-menu";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useAppContext } from "../contexts/AppContext";
import { ApiConfigService } from "../services/api-config";
import { installConsoleLoggerBridge } from "../services/console-logger-hook";
import {
  openSharedCacheDb
} from "../services/db-setup";

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
  type?: "info" | "error" | "success" | "warning";
};

function DeepLinkHandler() {
  const { refreshUserData } = useAppContext();
  const { navigateToOAuth } = useNavigationUtils();

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
          navigateToOAuth(oauthParams.toString());
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

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [webAlert, setWebAlert] = useState<WebAlertState>({ visible: false });
  const originalAlertRef = useRef<typeof Alert.alert>(null);
  const { isMobile } = useDeviceType();
  const { processPendingNavigationIntent } = usePendingIntents();

  useEffect(() => {
    console.log("🔄 [RootLayout] Loaded");
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    if (!originalAlertRef.current) {
      originalAlertRef.current = Alert.alert;
    }

    const getDialogType = (
      title?: string
    ): "info" | "error" | "success" | "warning" => {
      if (!title) return "info";
      const titleLower = title.toLowerCase();
      if (/(error|errore|failed|fail|unable|impossibile)/i.test(titleLower))
        return "error";
      if (/(success|successo|completed|completato)/i.test(titleLower))
        return "success";
      if (/(warning|avviso|attenzione)/i.test(titleLower)) return "warning";
      return "info";
    };

    Alert.alert = (
      title?: string,
      message?: string,
      buttons?: AlertButton[]
    ) => {
      const dialogType = getDialogType(title);

      let normalizedButtons: AlertButton[];
      if (buttons && buttons.length > 0) {
        normalizedButtons = [...buttons];
      } else {
        normalizedButtons = [{ text: "OK" }];
      }

      setWebAlert({
        visible: true,
        title,
        message,
        buttons: normalizedButtons,
        type: dialogType,
      });
    };

    return () => {
      if (originalAlertRef.current) {
        Alert.alert = originalAlertRef.current;
      }
    };
  }, []);

  const handleCloseAlert = () => setWebAlert((s) => ({ ...s, visible: false }));

  const handleButtonPress = (button: AlertButton) => {
    button.onPress?.();
    handleCloseAlert();
  };

  useEffect(() => {
    if (loaded) {
      (async () => {
        installConsoleLoggerBridge();
        console.log("🔄 [LayoutInit] Console logger bridge installed");
        ApiConfigService.initialize().catch();
        console.log("🔄 [LayoutInit] App config initialized");
        openSharedCacheDb().catch();
        console.log("🔄 [LayoutInit] Shared cache DB opened");
        await processPendingNavigationIntent();
        console.log("🔄 [LayoutInit] Pending navigation intent processed");
      })();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider style={{ flex: 1 }}>
        <ThemeProvider>
          <I18nProvider>
            <GraphQLProvider>
              <AppProvider>
                <MenuProvider>
                  <DeepLinkHandler />
                  <RequireAuth>
                    {isMobile ? <MobileLayout /> : <TabletLayout />}

                    <AlertDialog
                      visible={webAlert.visible}
                      title={webAlert.title || ""}
                      message={webAlert.message || ""}
                      onDismiss={handleCloseAlert}
                      confirmText={
                        webAlert.buttons?.[webAlert.buttons.length - 1]?.text ||
                        "OK"
                      }
                      onConfirm={() => {
                        const lastButton =
                          webAlert.buttons?.[webAlert.buttons.length - 1];
                        if (lastButton) handleButtonPress(lastButton);
                      }}
                      cancelText={
                        webAlert.buttons?.length === 2
                          ? webAlert.buttons[0]?.text
                          : undefined
                      }
                      onCancel={
                        webAlert.buttons?.length === 2
                          ? () => {
                              const firstButton = webAlert.buttons?.[0];
                              if (firstButton) handleButtonPress(firstButton);
                            }
                          : undefined
                      }
                      type={webAlert.type || "info"}
                    />
                  </RequireAuth>
                </MenuProvider>
              </AppProvider>
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
