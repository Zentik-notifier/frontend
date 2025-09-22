import { Redirect } from "expo-router";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useEffect } from "react";

export default function TabletHomeIndex() {
  const { isTablet, isDesktop, isMobile, isReady } = useDeviceType();
  useEffect(() => {
    console.log("[TabletHomeIndex] device:", { isTablet, isDesktop, isMobile, isReady });
  }, [isTablet, isDesktop, isMobile, isReady]);
  return <Redirect href="/(tablet)/private/(home)/notifications" />;
}
