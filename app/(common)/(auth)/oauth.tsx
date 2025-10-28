import { useAppContext } from "@/contexts/AppContext";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

export default function OAuthCallbackPage() {
  const { refreshUserData, completeAuth, setUserId } = useAppContext();
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

        if (Platform.OS === "web") {
          try {
            const hash = typeof window !== "undefined" ? window.location.hash : "";
            if (hash && hash.startsWith("#")) {
              const params = new URLSearchParams(hash.substring(1));
              accessToken = accessToken || (params.get("accessToken") as string);
              refreshToken = refreshToken || (params.get("refreshToken") as string);
              connected = connected || (params.get("connected") as string);
              provider = provider || (params.get("provider") as string);
            }
          } catch {}
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
