import { Platform, useWindowDimensions } from "react-native";

export type DeviceType = "mobile" | "tablet" | "desktop";

export function useDeviceType(): {
  deviceType: DeviceType;
  isTablet: boolean;
  isDesktop: boolean;
  isMobile: boolean;
  isReady: boolean;
} {
  const { width } = useWindowDimensions();

  // Consideriamo il dispositivo "pronto" quando abbiamo una larghezza valida
  const isReady = width > 0;
  const isPad = Platform.OS === "ios" && (Platform as any).isPad;
  // Conservative breakpoints: avoid classifying large phones as tablet
  const deviceType: DeviceType = isPad
    ? "tablet"
    : width >= 1200
      ? "desktop"
      : width >= 900
        ? "tablet"
        : "mobile";

  return {
    deviceType,
    isTablet: deviceType === "tablet",
    isDesktop: deviceType === "desktop",
    isMobile: deviceType === "mobile",
    isReady,
  };
}
