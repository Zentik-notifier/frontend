import { BucketFragment } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React, { useMemo } from "react";
import Selector, { SelectorOption } from "./ui/Selector";
import { useNotificationsState } from "@/hooks/notifications/useNotificationQueries";

interface BucketSelectorProps {
  selectedBucketId?: string;
  onBucketChange: (bucketId: string) => void;
  label?: string;
  searchable?: boolean;
}

export default function BucketSelector({
  selectedBucketId,
  onBucketChange,
  label,
  searchable = false,
}: BucketSelectorProps) {
  const { t } = useI18n();
  const { data: appState } = useNotificationsState();

  const bucketOptions = useMemo(() => {
    const buckets = (appState?.buckets || []).filter(
      (bucket) => !bucket.isOrphan
    );
    const options: SelectorOption[] = [];

    // Add regular buckets
    buckets.forEach((bucket) => {
      options.push({
        id: bucket.id,
        name: bucket.name,
        iconUrl: bucket.icon ?? undefined,
        iconColor: bucket.color ?? undefined,
        iconName: "circle",
      });
    });

    return options;
  }, [appState, t]);

  const selectedOption = bucketOptions.find(
    (option) => option.id === selectedBucketId
  );

  return (
    <Selector
      label={label}
      placeholder={t("bucketSelector.selectBucket")}
      options={bucketOptions}
      selectedValue={selectedOption?.id || ""}
      onValueChange={(value) => onBucketChange(value)}
      isSearchable={searchable}
      mode="inline"
    />
  );
}
