import { Platform, useWindowDimensions } from "react-native";
import * as Device from 'expo-device';

export function useDeviceType() {
  const { width } = useWindowDimensions();

  const isReady = width > 0;
  const deviceType = Device.deviceType;
  const isTablet = deviceType === Device.DeviceType.TABLET;
  const isMobile = deviceType === Device.DeviceType.PHONE;
  const isDesktop = deviceType === Device.DeviceType.DESKTOP;

  return {
    deviceType,
    isTablet,
    isDesktop,
    isMobile,
    isReady,
  };
}
