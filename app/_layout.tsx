import { AlertModal } from "@/components/AlertModal";
import { GraphQLProvider } from "@/components/GraphQLProvider";
import { I18nProvider } from "@/components/I18nProvider";
import { NavigationOptimizationProvider } from "@/components/NavigationOptimizationProvider";
import { TermsAcceptanceScreen } from "@/components/TermsAcceptanceScreen";
import { useUserSettings } from "@/services/user-settings";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";
import { RequireAuth } from "@/services/require-auth";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import { router, Slot, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Platform,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ApiConfigService } from "../services/api-config";
import { AppProvider, useAppContext } from "../services/app-context";
import { openSharedCacheDb } from "../services/media-cache-db";
import { installConsoleLoggerBridge } from "../services/console-logger-hook";

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

function ThemedLayout() {
  const { colorScheme } = useTheme();
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

  return (
    <NavigationThemeProvider
      value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
    >
      <Stack>
        <Stack.Screen name="(mobile)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: "" }} />
      </Stack>
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
          router.push(`/(mobile)/public/oauth?${oauthParams.toString()}`);
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApiConfigService.initialize();
    installConsoleLoggerBridge();
    // Ensure shared cache DB and schema exist for NSE/NCE
    (async () => {
      try {
        await openSharedCacheDb();
      } catch (e) {
        console.warn("[Bootstrap] Failed to init shared cache DB:", e);
      }
    })();
    // Simulate loading state for compatibility
    const timer = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

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

  if (!loading && !hasAcceptedTerms()) {
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

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    return <Slot />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <I18nProvider>
            <NavigationOptimizationProvider>
              <GraphQLProvider>
                <TermsGuard>
                  <AppProvider>
                    <DeepLinkHandler />
                    <RequireAuth>
                      <ThemedLayout />
                    </RequireAuth>
                  </AppProvider>
                </TermsGuard>
              </GraphQLProvider>
            </NavigationOptimizationProvider>
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
