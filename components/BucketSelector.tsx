import { BucketFragment } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React, { useMemo } from "react";
import Selector, { SelectorOption } from "./ui/Selector";

export const BUCKET_ALL = "ALL";

interface BucketSelectorProps {
  selectedBucketId: string | typeof BUCKET_ALL;
  onBucketChange: (bucketId: string | typeof BUCKET_ALL) => void;
  buckets: BucketFragment[];
  label?: string;
  includeAllOption?: boolean;
  searchable?: boolean;
}

export default function BucketSelector({
  selectedBucketId,
  onBucketChange,
  buckets,
  label,
  includeAllOption = false,
  searchable = false,
}: BucketSelectorProps) {
  const { t } = useI18n();
  const bucketOptions = useMemo(() => {
    const options: SelectorOption[] = [];

    if (includeAllOption) {
      options.push({
        id: "ALL",
        name: t("bucketSelector.allBuckets"),
      });
    }

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
  }, [buckets, includeAllOption, t]);

  const selectedOption = bucketOptions.find(
    (option) => option.id === selectedBucketId
  );

  return (
    <Selector
      label={label}
      placeholder={t("bucketSelector.selectBucket")}
      options={bucketOptions.filter((option) => option.id !== BUCKET_ALL)}
      selectedValue={selectedOption?.id || ""}
      onValueChange={(value) => onBucketChange(value)}
      isSearchable={searchable}
      mode="inline"
    />
  );
}
