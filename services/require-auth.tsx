import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useAppContext } from "../services/app-context";
import { useDeviceType } from "@/hooks/useDeviceType";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { lastUserId, isInitializing } = useAppContext();
  const router = useRouter();
  const segments = useSegments();
  const showPrivateRoutes = !!lastUserId;
  const { isTablet, isDesktop } = useDeviceType();

  useEffect(() => {
    const isPrivate = segments?.some((segment) => segment === "private");
    const isPublic = segments?.some((segment) => segment === "public");
    const isHome = segments?.some((segment) => segment === "home");
    const rootRoute = isTablet || isDesktop ? "(tablet)" : "(mobile)";

    if (!showPrivateRoutes && isPrivate && !isInitializing) {
      router.replace(`/${rootRoute}/public/login`);
    }

    if (showPrivateRoutes && isPublic && !isHome) {
      router.replace(`/${rootRoute}/private/home`);
    }

    if (!isPrivate && !isPublic && !isHome) {
      router.replace(`/${rootRoute}/private/home`);
    }
  }, [showPrivateRoutes, segments, isInitializing]);

  return <>{children}</>;
}
