import { BucketFragment } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
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
    <View style={styles.container}>
      <Selector
        label={label}
        placeholder={t("bucketSelector.selectBucket")}
        options={bucketOptions.filter((option) => option.id !== BUCKET_ALL)}
        selectedValue={selectedOption?.id || ""}
        onValueChange={(value) => onBucketChange(value)}
        isSearchable={searchable}
        mode="inline"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  dropdownButton: {
    width: "100%",
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  dropdownButtonText: {
    fontSize: 16,
    textAlign: "left",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  buttonText: {
    fontSize: 16,
    flex: 1,
  },
  dropdown: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  dropdownRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  dropdownRowText: {
    fontSize: 16,
  },
  rowContent: {
    flexDirection: "column",
  },
  rowText: {
    fontSize: 16,
    fontWeight: "500",
  },
  rowSubtext: {
    fontSize: 14,
    marginTop: 2,
    opacity: 0.7,
  },
  searchInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    marginVertical: 8,
    fontSize: 16,
  },
});
