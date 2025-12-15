import { Platform } from "react-native";
import { ChangelogSeenVersions, settingsService } from "@/services/settings-service";
import { ChangelogsForModalQuery } from "@/generated/gql-operations-generated";

export interface ChangelogCheckContext {
  appVersion?: string | null;
  backendVersion?: string | null;
  nativeVersion?: string | null;
}

export interface ChangelogCheckResult {
  latestEntry: ChangelogsForModalQuery["changelogs"][number] | null;
  unreadIds: string[];
  shouldOpenModal: boolean;
  needsAppUpdateNotice: boolean;
  needsBackendBehindNotice: boolean;
}

const parseVersion = (v?: string | null): number[] => {
  if (!v) return [];
  return v
    .split(".")
    .map((part) => parseInt(part, 10))
    .map((n) => (Number.isNaN(n) ? 0 : n));
};

export const isVersionLess = (a?: string | null, b?: string | null): boolean => {
  if (!a || !b) return false;
  const av = parseVersion(a);
  const bv = parseVersion(b);
  const len = Math.max(av.length, bv.length);
  for (let i = 0; i < len; i++) {
    const ai = av[i] ?? 0;
    const bi = bv[i] ?? 0;
    if (ai < bi) return true;
    if (ai > bi) return false;
  }
  return false;
};

export function checkChangelogUpdates(
  changelogData: ChangelogsForModalQuery | undefined,
  context: ChangelogCheckContext
): ChangelogCheckResult {
  const { appVersion, backendVersion, nativeVersion } = context;

  if (!changelogData || !changelogData.changelogs.length) {
    return {
      latestEntry: null,
      unreadIds: [],
      shouldOpenModal: false,
      needsAppUpdateNotice: false,
      needsBackendBehindNotice: false,
    };
  }

  const allEntries = changelogData.changelogs;
  const latestEntry = allEntries[0];

  const seen: ChangelogSeenVersions | undefined =
    settingsService.getChangelogSeenVersions();

  let shouldShow = false;

  // UI / web app version
  if (
    appVersion &&
    (!seen || isVersionLess(appVersion, latestEntry.uiVersion))
  ) {
    shouldShow = true;
  }

  // Backend version
  if (
    backendVersion &&
    (!seen || isVersionLess(seen.backendVersion, latestEntry.backendVersion))
  ) {
    shouldShow = true;
  }

  // Native versions per platform
  if (Platform.OS === "ios") {
    if (
      nativeVersion &&
      (!seen ||
        isVersionLess(seen.iosVersion, latestEntry.iosVersion) ||
        isVersionLess(nativeVersion, latestEntry.iosVersion))
    ) {
      shouldShow = true;
    }
  } else if (Platform.OS === "android") {
    if (
      nativeVersion &&
      isVersionLess(nativeVersion, latestEntry.androidVersion) &&
      (!seen || isVersionLess(seen.androidVersion, latestEntry.androidVersion))
    ) {
      shouldShow = true;
    }
  }

  const nextUnreadIds: string[] = [];
  for (const entry of allEntries) {
    let isUnread = false;

    if (!seen) {
      isUnread = true;
    } else {
      if (isVersionLess(seen.uiVersion, entry.uiVersion)) {
        isUnread = true;
      }
      if (isVersionLess(seen.backendVersion, entry.backendVersion)) {
        isUnread = true;
      }

      if (Platform.OS === "ios") {
        if (isVersionLess(seen.iosVersion, entry.iosVersion)) {
          isUnread = true;
        }
      } else if (Platform.OS === "android") {
        if (isVersionLess(seen.androidVersion, entry.androidVersion)) {
          isUnread = true;
        }
      }
    }

    if (isUnread) {
      nextUnreadIds.push(entry.id);
    }
  }

  const latestNativeVersion =
    Platform.OS === "ios"
      ? latestEntry.iosVersion
      : Platform.OS === "android"
      ? latestEntry.androidVersion
      : null;

  const needsAppUpdateNotice =
    (Platform.OS === "macos" || Platform.OS === "ios") &&
    !!nativeVersion &&
    !!latestNativeVersion &&
    isVersionLess(nativeVersion, latestNativeVersion);

  const isSelfHosted = process.env.EXPO_PUBLIC_SELFHOSTED === "true";
  const needsBackendBehindNotice =
    isSelfHosted &&
    !!backendVersion &&
    !!latestEntry.backendVersion &&
    isVersionLess(backendVersion, latestEntry.backendVersion);

  return {
    latestEntry,
    unreadIds: nextUnreadIds,
    shouldOpenModal: shouldShow,
    needsAppUpdateNotice,
    needsBackendBehindNotice,
  };
}
