import * as Device from 'expo-device';
import { useMemo } from 'react';
import { useWindowDimensions } from "react-native";
import { useSettings } from './useSettings';

export function useDeviceType() {
  const { width } = useWindowDimensions();
  const { settings } = useSettings();
  const layout = settings.theme.layoutMode;

  return useMemo(() => {
    const isReady = width > 0;
    const isAutoLayout = layout === 'auto';

    let deviceType: Device.DeviceType;
    if (isAutoLayout) {
      deviceType = Device.deviceType ?? Device.DeviceType.PHONE;
    } else {
      switch (layout) {
        case 'desktop':
          deviceType = Device.DeviceType.DESKTOP;
          break;
        case 'tablet':
          deviceType = Device.DeviceType.TABLET;
          break;
        case 'mobile':
          deviceType = Device.DeviceType.PHONE;
          break;
        default:
          deviceType = Device.deviceType ?? Device.DeviceType.PHONE;
      }
    }

    const isVerySmallDevice = isAutoLayout && width > 0 && width < 850;
    const isMobile = deviceType === Device.DeviceType.PHONE || isVerySmallDevice;
    const isTablet = !isMobile && deviceType === Device.DeviceType.TABLET;
    const isDesktop = !isMobile && deviceType === Device.DeviceType.DESKTOP;

    return { isReady, deviceType, isMobile, isTablet, isDesktop }
  }, [layout, width])
}
