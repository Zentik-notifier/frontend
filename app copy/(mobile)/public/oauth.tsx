import { useAppContext } from "@/services/app-context";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";

export default function OAuthCallbackPage() {
  const { refreshUserData, completeAuth, setUserId } = useAppContext();
  const searchParams = useLocalSearchParams();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      if (processing) return;
      setProcessing(true);

      try {
        // Extract parameters from route params (passed by deep link handler)
        const accessToken = searchParams.accessToken as string;
        const refreshToken = searchParams.refreshToken as string;
        const connected = searchParams.connected as string;
        const provider = searchParams.provider as string;

        // Only proceed if we have valid OAuth parameters
        if (!connected && !accessToken) {
          return;
        }
        console.log("🔗 OAuth callback page loaded with params:", searchParams);

        // FORCE browser dismissal immediately and aggressively
        try {
          console.log("🔗 FORCING browser dismissal");
          // Try multiple times to ensure the browser is closed
          await WebBrowser.dismissBrowser();
          await WebBrowser.maybeCompleteAuthSession();

          // Force close any remaining sessions
          setTimeout(async () => {
            try {
              await WebBrowser.dismissBrowser();
            } catch (e) {
              // Ignore errors on second attempt
            }
          }, 50);

          console.log("🔗 Browser forcefully dismissed");
        } catch (e) {
          console.log("🔗 Browser dismiss error (continuing anyway):", e);
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

  // Return an empty view - this page is just for handling the callback
  return null;
}
function handleUserChange(newUserId: string) {
  throw new Error("Function not implemented.");
}
