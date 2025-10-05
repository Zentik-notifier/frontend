import * as Device from 'expo-device';
import { useWindowDimensions } from "react-native";

export function useDeviceType() {
  const { width } = useWindowDimensions();


  const isReady = width > 0;
  // const isVerySmallDevice = width > 0 && width < 850;
  const deviceType = Device.deviceType;
  // const isMobile = deviceType === Device.DeviceType.PHONE || isVerySmallDevice;
  // const isTablet = !isMobile && deviceType === Device.DeviceType.TABLET;
  // const isDesktop = !isMobile && deviceType === Device.DeviceType.DESKTOP;

  const isMobile = width < 768;
  const isTablet =!isMobile && width < 1024;
  const isDesktop =!isMobile && !isTablet;

  return {
    deviceType,
    isTablet,
    isDesktop,
    isMobile,
    isReady,
  };
}
