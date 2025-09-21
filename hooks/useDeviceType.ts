import { useWindowDimensions } from "react-native";

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
  const deviceType: DeviceType = width >= 1024 ? "desktop" : width >= 768 ? "tablet" : "mobile";
  
  
  return {
    deviceType,
    isTablet: deviceType === "tablet",
    isDesktop: deviceType === "desktop", 
    isMobile: deviceType === "mobile",
    isReady,
  };
}
