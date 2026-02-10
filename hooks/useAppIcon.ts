import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { settingsService } from "@/services/settings-service";
import {
  type AppIconId,
  setAppIcon,
  getAppIcon,
  APP_ICON_IDS,
} from "@/services/app-icon-service";

const isNative = Platform.OS === "ios" || Platform.OS === "android";

export function useAppIcon() {
  const [currentIconId, setCurrentIconId] = useState<AppIconId | "default">(
    () => (settingsService.getAppIconId() as AppIconId) ?? "default"
  );
  const [loading, setLoading] = useState(false);
  const [iconIdBeingSet, setIconIdBeingSet] = useState<
    AppIconId | "default" | null
  >(null);

  useEffect(() => {
    if (!isNative) return;
    getAppIcon().then((name) => {
      setCurrentIconId(name);
    });
  }, []);

  const selectIcon = useCallback(
    async (iconId: AppIconId | "default") => {
      if (!isNative) return;
      setIconIdBeingSet(iconId);
      setLoading(true);
      try {
        const ok = await setAppIcon(iconId);
        if (ok) {
          const toStore = iconId === "default" ? null : iconId;
          await settingsService.setAppIconId(toStore);
          setCurrentIconId(iconId);
        }
      } finally {
        setLoading(false);
        setIconIdBeingSet(null);
      }
    },
    []
  );

  return {
    currentIconId,
    selectIcon,
    loading,
    iconIdBeingSet,
    availableIconIds: APP_ICON_IDS,
    isSupported: isNative,
  };
}
