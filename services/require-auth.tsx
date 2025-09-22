import { useNavigationUtils } from "@/utils/navigation";
import { useSegments } from "expo-router";
import { useEffect } from "react";
import { useAppContext } from "../services/app-context";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { lastUserId, isInitializing } = useAppContext();
  const segments = useSegments();
  const showPrivateRoutes = !!lastUserId;
  const { navigateToHome, navigateToLogin } = useNavigationUtils();

  useEffect(() => {
    const isPrivate = segments?.some((segment) => segment === "private");
    const isPublic = segments?.some((segment) => segment === "public");
    const isHome = segments?.some((segment) => segment === "home");

    if (!showPrivateRoutes && isPrivate && !isInitializing) {
      navigateToLogin();
    }

    if (showPrivateRoutes && isPublic && !isHome) {
      navigateToHome();
    }

    if (!isPrivate && !isPublic && !isHome) {
      navigateToHome();
    }
  }, [showPrivateRoutes, segments, isInitializing]);

  return <>{children}</>;
}
