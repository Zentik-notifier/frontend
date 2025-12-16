import { useEffect, useState } from "react";
import {
  ChangelogForModalFragment,
  useChangelogsForModalQuery,
} from "@/generated/gql-operations-generated";
import { useGetVersionsInfo } from "@/hooks/useGetVersionsInfo";
import { checkChangelogUpdates } from "@/utils/changelogUtils";

export interface UseChangelogsResult {
  latestChangelog: ChangelogForModalFragment | null;
  changelogsForModal: ChangelogForModalFragment[];
  unreadChangelogIds: string[];
  needsChangelogAppUpdateNotice: boolean;
  needsChangelogBackendBehindNotice: boolean;
  shouldOpenChangelogModal: boolean;
  refetchChangelogs: () => Promise<any>;
}

export function useChangelogs(): UseChangelogsResult {
  const { versions } = useGetVersionsInfo();
  const { data: changelogData, refetch: refetchChangelogs } =
    useChangelogsForModalQuery({
      fetchPolicy: "cache-and-network",
    });

  const { appVersion, backendVersion, nativeVersion } = versions;

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
    const {
      latestEntry,
      unreadIds,
      shouldOpenModal,
      needsAppUpdateNotice,
      needsBackendBehindNotice,
    } = checkChangelogUpdates(changelogData, {
      appVersion,
      backendVersion,
      nativeVersion,
    });

    setChangelogsForModal(changelogData?.changelogs ?? []);
    setLatestChangelog(latestEntry);
    setUnreadChangelogIds(unreadIds);
    setNeedsChangelogAppUpdateNotice(needsAppUpdateNotice);
    setNeedsChangelogBackendBehindNotice(needsBackendBehindNotice);
    setShouldOpenChangelogModal(shouldOpenModal);
  }, [changelogData, appVersion, backendVersion, nativeVersion]);

  return {
    latestChangelog,
    changelogsForModal,
    unreadChangelogIds,
    needsChangelogAppUpdateNotice,
    needsChangelogBackendBehindNotice,
    shouldOpenChangelogModal,
    refetchChangelogs,
  };
}
