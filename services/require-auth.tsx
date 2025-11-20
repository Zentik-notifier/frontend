import { useNavigationUtils } from "@/utils/navigation";
import { usePathname, useSegments } from "expo-router";
import { useEffect } from "react";
import { useAppContext } from "../contexts/AppContext";
import { useSettings } from "@/hooks/useSettings";
import { CURRENT_TERMS_VERSION } from "./settings-service";
import { settingsRepository } from "./settings-repository";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { lastUserId, isInitializing } = useAppContext();
  const segments = useSegments() as string[];
  const showPrivateRoutes = !!lastUserId;
  const { navigateToHome, navigateToLogin, navigateToTerms } =
    useNavigationUtils();
  const pathname = usePathname();
  const {
    isInitialized,
    settings: {
      termsAcceptance: { termsEnabled, termsAccepted, acceptedVersion },
    },
  } = useSettings();

  useEffect(() => {
    const isPublic = segments[0] === "(common)";
    const isPrivate = !isPublic;
    const isHome = segments[1] === "(home)";
    const isOAuthCallback =
      isPublic && segments[1] === "(auth)" && segments[2] === "oauth";
    const isTerms = isPublic && segments[1] === "terms-acceptance";

    // Wait for user settings to be loaded from storage to avoid race condition
    if (!isInitialized) return;

    // 1) Terms gate has highest priority
    const needsTerms =
      termsEnabled &&
      (!termsAccepted || acceptedVersion !== CURRENT_TERMS_VERSION);
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
        // Save redirect path to return after login
        try {
          const redirectPath = pathname || "/";
          settingsRepository
            .setSetting("auth_redirectAfterLogin", redirectPath)
            .catch(() => {});
        } catch {}
        navigateToLogin();
      }
      return;
    }

    // 3) If logged in and currently in public routes (not home), go home
    //    Skip when we're on OAuth callback to allow custom back behavior
    if (showPrivateRoutes && isPublic && !isHome && !isOAuthCallback) {
      navigateToHome();
      return;
    }
  }, [
    showPrivateRoutes,
    segments,
    isInitializing,
    isInitialized,
    acceptedVersion,
    termsAccepted,
  ]);

  return <>{children}</>;
}
