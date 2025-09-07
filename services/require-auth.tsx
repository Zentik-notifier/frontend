import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useAppContext } from "../services/app-context";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { lastUserId, isInitializing } = useAppContext();
  const router = useRouter();
  const segments = useSegments();
  const showPrivateRoutes = !!lastUserId;

  useEffect(() => {
    const isPrivate = segments?.some((segment) => segment === "private");
    const isPublic = segments?.some((segment) => segment === "public");
    const isHome = segments?.some((segment) => segment === "home");

    if (!showPrivateRoutes && isPrivate && !isInitializing) {
      router.replace("/(mobile)/public/login");
    }

    if (showPrivateRoutes && isPublic && !isHome) {
      router.replace("/(mobile)/private/home");
    }

    if (!isPrivate && !isPublic && !isHome) {
      router.replace("/(mobile)/private/home");
    }
  }, [showPrivateRoutes, segments, isInitializing]);

  return <>{children}</>;
}
