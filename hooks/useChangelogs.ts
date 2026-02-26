import { useEffect, useState } from "react";
import {
  ChangelogForModalFragment,
  useChangelogsForModalQuery,
} from "@/generated/gql-operations-generated";
import { useGetVersionsInfo } from "@/hooks/useGetVersionsInfo";
import { useSettings } from "@/hooks/useSettings";
import { checkChangelogUpdates } from "@/utils/changelogUtils";

export function useChangelogs() {
  const { versions, loading: versionsLoading } = useGetVersionsInfo();
  const { settings } = useSettings();
  const {
    data: changelogData,
    loading: changelogLoading,
    refetch: refetchChangelogs,
  } = useChangelogsForModalQuery({
    fetchPolicy: "cache-and-network",
  });

  const { appVersion, backendVersion, nativeVersion } = versions;
  const lastSeenChangelogId = settings.lastSeenChangelogId;

  const [latestChangelog, setLatestChangelog] =
    useState<ChangelogForModalFragment | null>(null);
  const [changelogsForModal, setChangelogsForModal] = useState<
    ChangelogForModalFragment[]
  >([]);
  const [unreadChangelogIds, setUnreadChangelogIds] = useState<string[]>([]);
  const [needsChangelogAppUpdateNotice, setNeedsChangelogAppUpdateNotice] =
    useState(false);
  const [needsChangelogBackendBehindNotice, setNeedsChangelogBackendBehindNotice] =
    useState(false);
  const [shouldOpenChangelogModal, setShouldOpenChangelogModal] =
    useState(false);

  useEffect(() => {
    if (changelogLoading || versionsLoading) {
      return;
    }

    const {
      latestEntry,
      unreadIds,
      shouldOpenModal,
      needsAppUpdateNotice,
      needsBackendBehindNotice,
    } = checkChangelogUpdates(changelogData, {
      backendVersion,
      nativeVersion,
    });

    setChangelogsForModal(changelogData?.changelogs ?? []);
    setLatestChangelog(latestEntry);
    setUnreadChangelogIds(unreadIds);
    setNeedsChangelogAppUpdateNotice(needsAppUpdateNotice);
    setNeedsChangelogBackendBehindNotice(needsBackendBehindNotice);
    setShouldOpenChangelogModal(shouldOpenModal);
  }, [
    changelogData,
    changelogLoading,
    versionsLoading,
    appVersion,
    backendVersion,
    nativeVersion,
    lastSeenChangelogId,
  ]);

  return {
    latestChangelog,
    changelogsForModal,
    unreadChangelogIds,
    needsChangelogAppUpdateNotice,
    needsChangelogBackendBehindNotice,
    shouldOpenChangelogModal,
    refetchChangelogs,
    versions,
  };
}
