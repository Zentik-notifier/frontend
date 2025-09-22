import { useNavigationUtils } from "@/utils/navigation";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

export default function ConfirmEmailRedirect() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { navigateToLogin, navigateToEmailConfirmation } = useNavigationUtils();

  useEffect(() => {
    if (code) {
      navigateToEmailConfirmation({ code });
    } else {
      navigateToLogin();
    }
  }, [code]);

  return null;
}
