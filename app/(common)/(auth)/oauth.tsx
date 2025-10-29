import { settingsService } from "@/services/settings-service";
import { settingsRepository } from "@/services/settings-repository";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/contexts/AppContext";
import { useNavigationUtils } from "@/utils/navigation";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Platform, View, StyleSheet } from "react-native";
import { Text, Button, useTheme, ActivityIndicator } from "react-native-paper";

export default function OAuthCallbackPage() {
  const { refreshUserData, completeAuth, setUserId } = useAppContext();
  const { navigateToHome, navigateToUserProfile } = useNavigationUtils();
  const { t } = useI18n();
  const searchParams = useLocalSearchParams();
  const [processing, setProcessing] = useState(false);
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successTitle, setSuccessTitle] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const theme = useTheme();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      if (processing) return;
      setProcessing(true);

      try {
        // Extract parameters from route params (native) or URL hash (web)
        let accessToken = searchParams.accessToken as string;
        let refreshToken = searchParams.refreshToken as string;
        let connected = searchParams.connected as string;
        let provider = searchParams.provider as string;
        let errorParam = searchParams.error as string;
        let errorDescriptionParam = searchParams.error_description as string;
        let codeParam = searchParams.code as string;
        let sessionIdParam = searchParams.sessionId as string;

        if (Platform.OS === "web") {
          try {
            const hash =
              typeof window !== "undefined" ? window.location.hash : "";
            if (hash && hash.startsWith("#")) {
              const params = new URLSearchParams(hash.substring(1));
              accessToken =
                accessToken || (params.get("accessToken") as string);
              refreshToken =
                refreshToken || (params.get("refreshToken") as string);
              connected = connected || (params.get("connected") as string);
              provider = provider || (params.get("provider") as string);
              errorParam = errorParam || (params.get("error") as string);
              errorDescriptionParam =
                errorDescriptionParam ||
                (params.get("error_description") as string);

              // Check for exchange code
              const code = params.get("code");
              if (code && !accessToken && !refreshToken) {
                console.log(
                  "🔗 Exchange code received, exchanging for tokens..."
                );
                try {
                  const baseUrl = settingsService.getApiBaseWithPrefix();
                  const response = await fetch(
                    `${baseUrl}/auth/exchange-code`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ code }),
                    }
                  );

                  if (response.ok) {
                    const data = await response.json();
                    console.log("🔗 Tokens received from exchange");
                    accessToken = data.accessToken;
                    refreshToken = data.refreshToken;
                  } else {
                    const errorData = await response.json();
                    console.error("🔗 Code exchange failed:", errorData);
                    router.replace("/(common)/(auth)/login");
                    return;
                  }
                } catch (error) {
                  console.error("🔗 Error exchanging code:", error);
                  router.replace("/(common)/(auth)/login");
                  return;
                }
              }
            }
          } catch {}

          if (!accessToken && !refreshToken && !connected && !errorParam) {
            console.log("🔗 No tokens or code in URL");
            router.replace("/(common)/(auth)/login");
            return;
          }
        }

        // Handle OAuth errors (both web and native)
        if (errorParam) {
          const title = provider
            ? t("oauth.signInTitleWithProvider", { provider })
            : t("oauth.genericSignInTitle");
          const message =
            errorDescriptionParam || t("oauth.accessDeniedMessage");
          try {
            if (Platform.OS !== "web") {
              await WebBrowser.dismissBrowser();
              await WebBrowser.maybeCompleteAuthSession();
            }
          } catch {}
          setErrorTitle(title);
          setErrorMessage(message);
          return;
        }

        // On native: exchange code if provided via deep link
        if (
          Platform.OS !== "web" &&
          !accessToken &&
          !refreshToken &&
          codeParam
        ) {
          try {
            const baseUrl = settingsService.getApiBaseWithPrefix();
            const response = await fetch(`${baseUrl}/auth/exchange-code`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code: codeParam,
                sessionId: sessionIdParam,
              }),
            });
            if (response.ok) {
              const data = await response.json();
              accessToken = data.accessToken;
              refreshToken = data.refreshToken;
            } else {
              console.error(
                "🔗 Native code exchange failed with status",
                response.status
              );
            }
          } catch (e) {
            console.error("🔗 Native code exchange error", e);
          }
        }

        // Only proceed if we have valid OAuth parameters
        if (!connected && !accessToken) {
          return;
        }
        console.log("🔗 OAuth callback page loaded with params:", searchParams);

        // FORCE browser dismissal only on native (not needed on web)
        if (Platform.OS !== "web") {
          try {
            console.log("🔗 FORCING browser dismissal");
            await WebBrowser.dismissBrowser();
            await WebBrowser.maybeCompleteAuthSession();
            setTimeout(async () => {
              try {
                await WebBrowser.dismissBrowser();
              } catch {}
            }, 50);
            console.log("🔗 Browser forcefully dismissed");
          } catch (e) {
            console.log("🔗 Browser dismiss error (continuing anyway):", e);
          }
        }

        if (connected === "true" && provider) {
          // This is a provider connection callback
          console.log(`🔗 Provider ${provider} connected successfully`);

          // Refresh user data to show the new connection
          try {
            await refreshUserData();
            console.log("🔗 User data refreshed after provider connection");
          } catch (error) {
            console.error(
              "🔗 Error refreshing user data after connection:",
              error
            );
          }

          // Always navigate explicitly to the User Profile after connecting a provider
          // This avoids unintended redirects to Home or incorrect back stack behavior
          navigateToUserProfile();
          return;
        } else if (accessToken && refreshToken) {
          console.log("🔗 Saving tokens and fetching user data");
          setSuccessTitle(t("oauth.successTitle"));
          setSuccessMessage(t("oauth.successMessage"));
          const ok = await completeAuth(accessToken, refreshToken);

          // After OAuth login, check for redirect-after-login and navigate there, then remove it
          try {
            const redirectPath = await settingsRepository.getSetting(
              "auth_redirectAfterLogin"
            );
            if (redirectPath && redirectPath !== "/") {
              await settingsRepository.removeSetting("auth_redirectAfterLogin");
              router.replace(redirectPath as any);
              return;
            }
          } catch (e) {
            console.error("🔗 Error checking redirect after OAuth login:", e);
          }

          // Fallback: navigate home via button or RequireAuth will handle
        } else {
          console.error("🔗 Missing tokens in OAuth callback");
          router.back();
        }
      } catch (e) {
        console.error("🔗 Error handling OAuth callback:", e);
        router.back();
      }
    };

    handleOAuthCallback();
  }, [searchParams, refreshUserData, setUserId]);

  if (errorTitle) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={[
            styles.container,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <View style={styles.card}>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.error, marginBottom: 8 }}
            >
              {errorTitle}
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onBackground, marginBottom: 16 }}
            >
              {errorMessage}
            </Text>
            <Button mode="contained" onPress={() => navigateToHome()}>
              {t("oauth.back")}
            </Button>
          </View>
        </View>
      </>
    );
  }

  if (successTitle) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={[
            styles.container,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <View style={styles.card}>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.primary, marginBottom: 8 }}
            >
              {successTitle}
            </Text>
            <View style={{ alignItems: "center", gap: 12, marginBottom: 16 }}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onBackground, textAlign: "center" }}
              >
                {successMessage}
              </Text>
            </View>
            <Button mode="contained" onPress={() => navigateToHome()}>
              {t("oauth.goHome")}
            </Button>
          </View>
        </View>
      </>
    );
  }

  return <Stack.Screen options={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    maxWidth: 480,
    width: "100%",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
});
