import { I18nProvider } from "@/components/I18nProvider";
import { QueryProviders } from "@/components/QueryProviders";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { useDeviceType } from "@/hooks/useDeviceType";
import { usePendingNotificationIntents } from "@/hooks/usePendingNotificationIntents";
import { ThemeProvider } from "@/hooks/useTheme";
import MobileLayout from "@/layouts/mobile";
import TabletLayout from "@/layouts/tablet";
import { RequireAuth } from "@/services/require-auth";
import { useNavigationUtils } from "@/utils/navigation";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MenuProvider } from "react-native-popup-menu";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useAppContext } from "../contexts/AppContext";
import { ApiConfigService } from "../services/api-config";
import { installConsoleLoggerBridge } from "../services/console-logger-hook";
import { openSharedCacheDb, openWebStorageDb } from "../services/db-setup";
import { Platform } from "react-native";

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
  const { isMobile } = useDeviceType();
  const { processPendingNavigationIntent } = usePendingNotificationIntents();

  useEffect(() => {
    console.log("[RootLayout] Loaded");
  }, []);

  useEffect(() => {
    if (loaded) {
      (async () => {
        installConsoleLoggerBridge();
        console.log("[LayoutInit] Console logger bridge installed");
        ApiConfigService.initialize().catch();
        console.log("[LayoutInit] App config initialized");
        openSharedCacheDb().catch();
        openWebStorageDb().catch();
        console.log("[LayoutInit] DB opened");
        await processPendingNavigationIntent();
        console.log("[LayoutInit] Pending navigation intent processed");
      })();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView>
      <SafeAreaProvider>
        <ThemeProvider>
          <I18nProvider>
            <QueryProviders>
              <AppProvider>
                <MenuProvider>
                  <DeepLinkHandler />
                  <RequireAuth>
                    {isMobile ? <MobileLayout /> : <TabletLayout />}
                    {Platform.OS === "web" && <AlertDialog />}
                  </RequireAuth>
                </MenuProvider>
              </AppProvider>
            </QueryProviders>
          </I18nProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
