import { settingsService } from "@/services/settings-service";
import { useAppContext } from "@/contexts/AppContext";
import { useNavigationUtils } from "@/utils/navigation";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

export default function OAuthCallbackPage() {
  const { refreshUserData, completeAuth, setUserId } = useAppContext();
  const { navigateToHome } = useNavigationUtils();
  const searchParams = useLocalSearchParams();
  const [processing, setProcessing] = useState(false);

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
        let codeParam = searchParams.code as string;
        let sessionIdParam = searchParams.sessionId as string;

        if (Platform.OS === "web") {
          try {
            const hash = typeof window !== "undefined" ? window.location.hash : "";
            if (hash && hash.startsWith("#")) {
              const params = new URLSearchParams(hash.substring(1));
              accessToken = accessToken || (params.get("accessToken") as string);
              refreshToken = refreshToken || (params.get("refreshToken") as string);
              connected = connected || (params.get("connected") as string);
              provider = provider || (params.get("provider") as string);
              
              // Check for exchange code
              const code = params.get("code");
              if (code && !accessToken && !refreshToken) {
                console.log("🔗 Exchange code received, exchanging for tokens...");
                try {
                  const baseUrl = settingsService.getApiBaseWithPrefix();
                  const response = await fetch(`${baseUrl}/auth/exchange-code`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ code }),
                  });
                  
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
          
          if (!accessToken && !refreshToken && !connected) {
            console.log("🔗 No tokens or code in URL");
            router.replace("/(common)/(auth)/login");
            return;
          }
        }

        // On native: exchange code if provided via deep link
        if (Platform.OS !== "web" && !accessToken && !refreshToken && codeParam) {
          try {
            const baseUrl = settingsService.getApiBaseWithPrefix();
            const response = await fetch(`${baseUrl}/auth/exchange-code`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: codeParam, sessionId: sessionIdParam }),
            });
            if (response.ok) {
              const data = await response.json();
              accessToken = data.accessToken;
              refreshToken = data.refreshToken;
            } else {
              console.error('🔗 Native code exchange failed with status', response.status);
            }
          } catch (e) {
            console.error('🔗 Native code exchange error', e);
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

          // Navigate back to the previous page (likely user profile/settings)
          router.back();
          return;
        } else if (accessToken && refreshToken) {
          console.log("🔗 Saving tokens and fetching user data");
          completeAuth(accessToken, refreshToken);
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

  return <Stack.Screen options={{ headerShown: false }} />;
}
