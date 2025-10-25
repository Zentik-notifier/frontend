import { useNotificationsState } from "@/hooks/notifications/useNotificationQueries";
import { useI18n } from "@/hooks/useI18n";
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

  const bucketOptions = useMemo(() => {
    const buckets = (appState?.buckets || []).filter(
      (bucket) => !bucket.isOrphan && !bucket.isProtected
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
  }, [appState?.buckets]);

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
