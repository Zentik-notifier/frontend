import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

export default function ConfirmEmailRedirect() {
  const { code } = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    if (code) {
      // Redirect to email confirmation screen with code
      router.replace({
        pathname: "/(mobile)/public/email-confirmation",
        params: { code }
      });
    } else {
      // No code, redirect to login
      router.replace("/(mobile)/public/login");
    }
  }, [code]);

  return null; // This component doesn't render anything
}
