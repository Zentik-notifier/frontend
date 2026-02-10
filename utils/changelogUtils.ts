import { Platform } from "react-native";
import { settingsService } from "@/services/settings-service";
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
  const { backendVersion, nativeVersion } = context;

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

  const lastSeenChangelogId = settingsService.getLastSeenChangelogId();

  const shouldShow =
    (!lastSeenChangelogId || lastSeenChangelogId !== latestEntry.id);

  const nextUnreadIds: string[] = [];
  for (const entry of allEntries) {
    if (entry.id === lastSeenChangelogId) break;
    nextUnreadIds.push(entry.id);
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
