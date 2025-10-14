import { useNavigationUtils } from "@/utils/navigation";
import { useSegments } from "expo-router";
import { useEffect } from "react";
import { useAppContext } from "../contexts/AppContext";
import { useUserSettings } from "./user-settings";
import { CURRENT_TERMS_VERSION } from "./auth-storage";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { lastUserId, isInitializing } = useAppContext();
  const segments = useSegments() as string[];
  const showPrivateRoutes = !!lastUserId;
  const { navigateToHome, navigateToLogin, navigateToTerms } =
    useNavigationUtils();
  const {
    settings: {
      termsAcceptance: { acceptedVersion, termsAccepted },
    },
  } = useUserSettings();

  useEffect(() => {
    const isPublic = segments[0] === "(common)";
    const isPrivate = !isPublic;
    const isHome = segments[1] === "(home)";
    const isTerms = isPublic && segments[1] === "terms-acceptance";

    // 1) Terms gate has highest priority
    const needsTerms =
      !termsAccepted || acceptedVersion !== CURRENT_TERMS_VERSION;
    if (!isInitializing && needsTerms) {
      if (!isTerms) {
        navigateToTerms();
      }
      return;
    }

    // 1b) If terms are accepted and user is on terms page, redirect to home
    if (!isInitializing && !needsTerms && isTerms) {
      navigateToHome();
      return;
    }

    // 2) If not logged in, send to login (avoid loop when already in public routes)
    if (!isInitializing && !showPrivateRoutes) {
      if (isPrivate) {
        navigateToLogin();
      }
      return;
    }

    // 3) If logged in and currently in public routes (not home), go home
    if (showPrivateRoutes && isPublic && !isHome) {
      navigateToHome();
      return;
    }
  }, [
    showPrivateRoutes,
    segments,
    isInitializing,
    acceptedVersion,
    termsAccepted,
  ]);

  return <>{children}</>;
}
