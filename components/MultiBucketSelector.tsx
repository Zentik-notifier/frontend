import { BucketFragment } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React, { useMemo } from "react";
import Multiselect, { MultiselectOption } from "./ui/Multiselect";
import BucketIcon from "./BucketIcon";

interface MultiBucketSelectorProps {
  selectedBucketIds?: string[];
  onBucketsChange: (bucketIds: string[]) => void;
  buckets: BucketFragment[];
  label?: string;
  searchable?: boolean;
}

export default function MultiBucketSelector({
  selectedBucketIds = [],
  onBucketsChange,
  buckets,
  label,
  searchable = false,
}: MultiBucketSelectorProps) {
  const { t } = useI18n();

  const bucketOptions = useMemo(() => {
    const options: MultiselectOption[] = [];

    // Add regular buckets with BucketIcon
    buckets.forEach((bucket) => {
      options.push({
        id: bucket.id,
        name: bucket.name,
        description: bucket.description ?? undefined,
        iconElement: (
          <BucketIcon
            size="sm"
            bucketId={bucket.id}
            noRouting
          />
        ),
      });
    });

    return options;
  }, [buckets]);

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
