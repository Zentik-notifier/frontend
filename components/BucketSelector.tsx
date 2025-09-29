import { BucketFragment } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Selector from "./ui/Selector";
import { useTheme } from "react-native-paper";

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
  const theme = useTheme();

  // Use translations for default placeholders
  const defaultPlaceholder = placeholder || t("bucketSelector.selectBucket");

  // Prepare options for the dropdown
  const bucketOptions = useMemo(() => {
    const options: Array<{ id: string | null; name: string; description?: string; icon?: string; color?: string }> = [];

    // Add "All Buckets" option if requested
    if (includeAllOption) {
      options.push({
        id: null,
        name: t("bucketSelector.allBuckets"),
      });
    }

    // Add regular buckets
    buckets.forEach((bucket) => {
      options.push({
        id: bucket.id,
        name: bucket.name,
        description: bucket.description || undefined,
        icon: bucket.icon || undefined,
        color: bucket.color || undefined,
      });
    });

    return options;
  }, [buckets, includeAllOption, t]);

  const selectedOption = bucketOptions.find(option => option.id === selectedBucketId);

  return (
    <View style={styles.container}>
      <Selector
        label={label}
        placeholder={defaultPlaceholder}
        options={bucketOptions.filter(option => option.id !== null) as any}
        selectedValue={selectedOption?.id || ""}
        onValueChange={(value) => onBucketChange(value as string || null)}
        isSearchable={searchable}
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
