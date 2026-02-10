import { Platform } from "react-native";
import { settingsService } from "./settings-service";

export const APP_ICON_IDS = [
  "default",
  "dark",
  "tintedLight",
  "tintedDark",
  "clearLight",
  "clearDark",
  "ntfy",
  "gotify",
  "zentikNtfy",
  "zentikGotify",
] as const;

export type AppIconId = (typeof APP_ICON_IDS)[number];

function isNative(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}

export async function setAppIcon(iconId: AppIconId | "default" | null): Promise<boolean> {
  if (!isNative()) return true;
  try {
    const { setAppIcon: setIcon } = await import("@mozzius/expo-dynamic-app-icon");
    const name = iconId === "default" || iconId === null ? null : iconId;
    const result = setIcon(name as Parameters<typeof setIcon>[0]);
    return result !== false;
  } catch {
    return false;
  }
}

export async function getAppIcon(): Promise<AppIconId | "default"> {
  if (!isNative()) return "default";
  try {
    const { getAppIcon: getIcon } = await import("@mozzius/expo-dynamic-app-icon");
    const name = getIcon();
    if (name === "DEFAULT" || !name) return "default";
    return name as AppIconId;
  } catch {
    return "default";
  }
}

export async function applyStoredAppIcon(): Promise<void> {
  const stored = settingsService.getAppIconId();
  const toApply = stored === undefined || stored === "default" ? null : stored;
  if (!isNative()) return;
  try {
    const { setAppIcon: setIcon } = await import("@mozzius/expo-dynamic-app-icon");
    setIcon(toApply as any);
  } catch {
    // ignore
  }
}
