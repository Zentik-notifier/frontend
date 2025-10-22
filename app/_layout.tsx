import { I18nProvider } from "@/components/I18nProvider";
import { QueryProviders } from "@/components/QueryProviders";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { useDeviceType } from "@/hooks/useDeviceType";
import { ThemeProvider } from "@/hooks/useTheme";
import MobileLayout from "@/layouts/mobile";
import TabletLayout from "@/layouts/tablet";
import { RequireAuth } from "@/services/require-auth";
import { useNavigationUtils } from "@/utils/navigation";
import { getCustomScheme } from "@/utils/universal-links";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MenuProvider } from "react-native-popup-menu";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useAppContext } from "../contexts/AppContext";
import { installConsoleLoggerBridge } from "../services/console-logger-hook";
import { openSharedCacheDb, openWebStorageDb } from "../services/db-setup";
import { settingsService } from "../services/settings-service";

const scheme = getCustomScheme();

function DeepLinkHandler() {
  const { refreshUserData } = useAppContext();
  const { navigateToOAuth } = useNavigationUtils();

  useEffect(() => {
    const subscription = Linking.addEventListener("url", async ({ url }) => {
      if (!url) return;

      try {
        const parsed = Linking.parse(url);
        if (parsed?.scheme === scheme && parsed?.path === "oauth") {
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

function AppContent() {
  const { isMobile } = useDeviceType();

  return (
    <AppProvider>
      <MenuProvider>
        <DeepLinkHandler />
        <RequireAuth>
          {isMobile ? <MobileLayout /> : <TabletLayout />}
          {Platform.OS === "web" && <AlertDialog />}
        </RequireAuth>
      </MenuProvider>
    </AppProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [settingsReady, setSettingsReady] = useState(false);

  useEffect(() => {
    console.log("[RootLayout] Loaded");
  }, []);

  useEffect(() => {
    if (!loaded) return;

    // Initialize core services
    installConsoleLoggerBridge();
    console.log("[LayoutInit] Console logger bridge installed");
    Promise.resolve().catch();
    console.log("[LayoutInit] App config initialized");
    openSharedCacheDb().catch();
    openWebStorageDb().catch();
    console.log("[LayoutInit] DB opened");

    // Wait for settings service to be ready
    console.log("[LayoutInit] Waiting for settings service...");
    const subscription = settingsService.isInitialized$.subscribe(
      (initialized) => {
        if (initialized) {
          console.log("[LayoutInit] ✅ Settings service ready!");
          setSettingsReady(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loaded]);

  if (!loaded || !settingsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView>
      <SafeAreaProvider>
        <QueryProviders>
          <ThemeProvider>
            <I18nProvider>
              <AppContent />
            </I18nProvider>
          </ThemeProvider>
        </QueryProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
