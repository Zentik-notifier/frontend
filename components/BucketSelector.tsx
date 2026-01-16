import { useNotificationsState } from "@/hooks/notifications/useNotificationQueries";
import { useI18n } from "@/hooks/useI18n";
import React, { useMemo } from "react";
import BucketIcon from "./BucketIcon";
import Selector, {
  PreferredDropdownDirection,
  SelectorOption,
} from "./ui/Selector";

interface BucketSelectorProps {
  selectedBucketId?: string;
  onBucketChange: (bucketId: string) => void;
  label?: string;
  searchable?: boolean;
  preferredDropdownDirection?: PreferredDropdownDirection;
}

export default function BucketSelector({
  selectedBucketId,
  onBucketChange,
  label,
  searchable: searchableParent,
  preferredDropdownDirection = "down",
}: BucketSelectorProps) {
  const { t } = useI18n();
  const { data: appState } = useNotificationsState();

  const bucketOptions = useMemo(() => {
    const buckets = (appState?.buckets || []).filter(
      (bucket) => !bucket.isOrphan && !bucket.isProtected
    );
    const options: SelectorOption[] = [];

    // Add regular buckets
    buckets.forEach((bucket) => {
      options.push({
        id: bucket.id,
        name: bucket.name,
        iconElement: (
          <BucketIcon bucketId={bucket.id} size="sm" noRouting={true} />
        ),
      });
    });

    return options;
  }, [appState, t]);

  const searchable = searchableParent ?? bucketOptions.length > 15;

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
      preferredDropdownDirection={preferredDropdownDirection}
    />
  );
}
