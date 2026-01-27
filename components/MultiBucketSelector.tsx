import { useNotificationsState } from "@/hooks/notifications/useNotificationQueries";
import { useI18n } from "@/hooks/useI18n";
import { UserRole, useGetMeQuery } from "@/generated/gql-operations-generated";
import React, { useMemo } from "react";
import BucketIcon from "./BucketIcon";
import Multiselect, { MultiselectOption } from "./ui/Multiselect";

interface MultiBucketSelectorProps {
  selectedBucketIds?: string[];
  onBucketsChange: (bucketIds: string[]) => void;
  label?: string;
  searchable?: boolean;
}

export default function MultiBucketSelector({
  selectedBucketIds = [],
  onBucketsChange,
  label,
  searchable = false,
}: MultiBucketSelectorProps) {
  const { t } = useI18n();
  const { data: appState } = useNotificationsState();
  const { data: meData } = useGetMeQuery();

  const bucketOptions = useMemo(() => {
    const isAdmin = meData?.me?.role === UserRole.Admin;
    const buckets = (appState?.buckets || []).filter(
      (bucket) =>
        !bucket.isOrphan &&
        !bucket.isProtected &&
        (!bucket.isPublic || isAdmin)
    );
    const options: MultiselectOption[] = [];

    // Add regular buckets with BucketIcon
    buckets.forEach((bucket) => {
      options.push({
        id: bucket.id,
        name: bucket.name,
        description: bucket.description ?? undefined,
        iconElement: <BucketIcon size="sm" bucketId={bucket.id} noRouting />,
      });
    });

    return options;
  }, [appState?.buckets, meData?.me?.role]);

  return (
    <Multiselect
      label={label}
      placeholder={t("bucketSelector.selectBucket")}
      options={bucketOptions}
      selectedValues={selectedBucketIds}
      onValuesChange={onBucketsChange}
      isSearchable={searchable}
      mode="inline"
    />
  );
}
