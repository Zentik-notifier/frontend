import { AppIcons } from "@/constants/Icons";
import { BucketFragment } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React, { useMemo } from "react";
import InlinePicker, { InlinePickerOption } from "./ui/InlinePicker";

interface BucketSelectorProps {
  selectedBucketId: string | null;
  onBucketChange: (bucketId: string | null) => void;
  buckets: BucketFragment[];
  label?: string;
  placeholder?: string;
  includeAllOption?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export default function BucketSelector({
  selectedBucketId,
  onBucketChange,
  buckets,
  label,
  placeholder,
  includeAllOption = false,
  searchable = false,
  searchPlaceholder,
}: BucketSelectorProps) {
  const { t } = useI18n();

  // Use translations for default placeholders
  const defaultPlaceholder = placeholder || t("bucketSelector.selectBucket" );
  const defaultSearchPlaceholder = searchPlaceholder || t("bucketSelector.searchBuckets" );
  // Helper function to get bucket icon based on bucket properties
  const getBucketIconOption = (bucket: BucketFragment) => {
    if (bucket.icon) {
      return { imageUrl: bucket.icon };
    }
    return { color: bucket.color! };
  };

  // Prepare options for the bucket picker
  const bucketOptions: InlinePickerOption<string | null>[] = useMemo(() => {
    const options: InlinePickerOption<string | null>[] = [];

    // Add "All Buckets" option if requested
    if (includeAllOption) {
      options.push({
        value: null,
        label: t("bucketSelector.allBuckets" ),
        icon: "buckets" as keyof typeof AppIcons,
      });
    }

    // Add regular buckets
    buckets.forEach((bucket) => {
      const iconOption = getBucketIconOption(bucket);
      options.push({
        value: bucket.id,
        label: bucket.name,
        ...iconOption,
        subtitle: bucket.description || undefined,
      });
    });

    return options;
  }, [buckets, includeAllOption, t]);

  return (
    <InlinePicker<string | null>
      label={label}
      selectedValue={selectedBucketId}
      options={bucketOptions}
      onValueChange={onBucketChange}
      placeholder={defaultPlaceholder}
      searchable={searchable}
      searchPlaceholder={defaultSearchPlaceholder}
    />
  );
}
