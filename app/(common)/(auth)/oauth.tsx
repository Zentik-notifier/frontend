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
      console.log("🔎 [OAuth] Raw searchParams:", searchParams);

      try {
        // Extract parameters from route params (native) or URL hash (web)
        try {
          // Help Expo WebBrowser close the auth window on web even if redirect URL check fails in dev
          WebBrowser.maybeCompleteAuthSession({ skipRedirectCheck: true });
        } catch {}
        let exchangedAccessToken: string | undefined;
        let exchangedRefreshToken: string | undefined;
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
              connected = connected || (params.get("connected") as string);
              provider = provider || (params.get("provider") as string);
              errorParam = errorParam || (params.get("error") as string);
              errorDescriptionParam =
                errorDescriptionParam ||
                (params.get("error_description") as string);
              const code = params.get("code");
              if (code) {
                codeParam = code as string;
              }
            }
          } catch {}

          if (!connected && !errorParam && !codeParam) {
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

        // Exchange code (any platform) if no tokens present
        if (!exchangedAccessToken && !exchangedRefreshToken && codeParam) {
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
              exchangedAccessToken = data.accessToken;
              exchangedRefreshToken = data.refreshToken;
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
        const hasTokens = !!exchangedAccessToken && !!exchangedRefreshToken;
        console.log("🔎 [OAuth] Gate check:", {
          connected,
          provider,
          hasTokens,
          hasCode: !!codeParam,
        });
        if (!connected && !hasTokens) {
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

          // On web: notify opener (settings page) and close the popup
          if (Platform.OS === 'web') {
            try {
              if (typeof window !== 'undefined' && window.opener) {
                window.opener.postMessage({ type: 'oauth-connected', provider }, '*');
                window.close();
                return;
              }
            } catch (e) {
              console.warn('🔗 Unable to postMessage to opener:', e);
            }
          }

          // Fallback (native or no opener): navigate to User Profile
          navigateToUserProfile();
          return;
        } else if (hasTokens) {
          console.log("🔗 Saving tokens and fetching user data");
          setSuccessTitle(t("oauth.successTitle"));
          setSuccessMessage(t("oauth.successMessage"));
          await completeAuth(exchangedAccessToken!, exchangedRefreshToken!);

          // After OAuth login, check for redirect-after-login and navigate there
          try {
            const redirectPath = await settingsRepository.getSetting(
              "auth_redirectAfterLogin"
            );
            // Remove redirect intent immediately to avoid later side-effects
            try {
              await settingsRepository.removeSetting("auth_redirectAfterLogin");
            } catch {}
            // Avoid forcing users to Settings after a plain login flow
            const isSettingsRoute =
              typeof redirectPath === "string" &&
              (redirectPath.includes("/(phone)/(settings)") ||
                redirectPath.includes("/(desktop)/(settings)") ||
                redirectPath === "/user/profile");
            console.log(
              "🔎 [OAuth] redirectAfterLogin:",
              redirectPath,
              "isSettingsRoute=",
              isSettingsRoute
            );
            if (redirectPath && redirectPath !== "/" && !isSettingsRoute) {
              router.replace(redirectPath as any);
              return;
            }
          } catch (e) {
            console.error("🔗 Error checking redirect after OAuth login:", e);
          }

          // Fallback: go Home directly
          console.log("🔎 [OAuth] Navigating Home (no redirectAfterLogin)");
          navigateToHome();
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
                style={{
                  color: theme.colors.onBackground,
                  textAlign: "center",
                }}
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
