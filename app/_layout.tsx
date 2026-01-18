import { I18nProvider } from "@/components/I18nProvider";
import { QueryProviders } from "@/components/QueryProviders";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { useDeviceType } from "@/hooks/useDeviceType";
// import { useForegroundNotificationHandler } from "@/hooks/useForegroundNotificationHandler";
import { useCloudKitEvents } from "@/hooks/useCloudKitEvents";
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
import { NotificationToastProvider } from "../contexts/NotificationToastContext";
import { installConsoleLoggerBridge } from "../services/console-logger-hook";
import { openSharedCacheDb, openWebStorageDb } from "../services/db-setup";
import { settingsService } from "../services/settings-service";

const scheme = getCustomScheme();

function DeepLinkHandler() {
  const { refreshUserData } = useAppContext();
  const { navigateToOAuth, navigateToNotificationDetail } =
    useNavigationUtils();

  useEffect(() => {
    const subscription = Linking.addEventListener("url", async ({ url }) => {
      if (!url) return;

      try {
        const parsed = Linking.parse(url);
        if (parsed?.scheme === scheme) {
          // Handle OAuth deep link
          if (parsed?.path === "oauth") {
            const hash = url.split("#")[1] || "";
            const params = new URLSearchParams(hash);
            const accessToken = params.get("accessToken");
            const refreshToken = params.get("refreshToken");
            const connected = params.get("connected");
            const provider = params.get("provider");
            const code = params.get("code");
            const sessionId = params.get("sessionId");
            const error = params.get("error");
            const errorDescription = params.get("error_description");
            const oauthParams = new URLSearchParams();
            if (accessToken) oauthParams.set("accessToken", accessToken);
            if (refreshToken) oauthParams.set("refreshToken", refreshToken);
            if (connected) oauthParams.set("connected", connected);
            if (provider) oauthParams.set("provider", provider);
            if (code) oauthParams.set("code", code);
            if (sessionId) oauthParams.set("sessionId", sessionId);
            if (error) oauthParams.set("error", error);
            if (errorDescription)
              oauthParams.set("error_description", errorDescription);
            navigateToOAuth(oauthParams.toString());
            return;
          }

          // Handle notification deep link (zentik://notification/:id)
          if (parsed?.path?.startsWith("notification/")) {
            const notificationId = parsed.path.split("/")[1];
            if (notificationId) {
              console.log(
                "🔗 Opening notification from deep link:",
                notificationId
              );
              navigateToNotificationDetail(notificationId);
              return;
            }
          }
        }
      } catch (e) {
        console.error("🔗 Error handling deep link:", e);
      }
    });

    return () => subscription.remove();
  }, [refreshUserData, navigateToOAuth, navigateToNotificationDetail]);

  return null;
}

function AppContent() {
  // Listen to CloudKit events and update SQLite/React Query
  useCloudKitEvents();
  const { isMobile } = useDeviceType();

  // Handle foreground notifications with toast
  // useForegroundNotificationHandler();

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
    openSharedCacheDb().catch();
    openWebStorageDb().catch();
    console.log("[LayoutInit] DB opened");

    // Wait for settings service to be ready
    console.log("[LayoutInit] Waiting for settings service...");
    const subscription = settingsService.isInitialized$.subscribe(
      (initialized) => {
        if (initialized) {
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
              <NotificationToastProvider>
                <AppContent />
              </NotificationToastProvider>
            </I18nProvider>
          </ThemeProvider>
        </QueryProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
