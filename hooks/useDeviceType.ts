import * as Device from 'expo-device';
import { useWindowDimensions } from "react-native";

export function useDeviceType() {
  const { width } = useWindowDimensions();

  const isVerySmallDevice = width > 0 && width < 1500;

  const isReady = width > 0;
  const deviceType = Device.deviceType;
  const isMobile = deviceType === Device.DeviceType.PHONE || isVerySmallDevice;
  const isTablet = !isMobile && deviceType === Device.DeviceType.TABLET;
  const isDesktop = !isMobile && deviceType === Device.DeviceType.DESKTOP;

  return {
    deviceType,
    isTablet,
    isDesktop,
    isMobile,
    isReady,
  };
}
