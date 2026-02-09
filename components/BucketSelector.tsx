import { useNotificationsState } from "@/hooks/notifications/useNotificationQueries";
import { useI18n } from "@/hooks/useI18n";
import { UserRole, useGetMeQuery } from "@/generated/gql-operations-generated";
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
  /** When set, only buckets linked to this external system are shown */
  filterByExternalSystemId?: string | null;
}

export default function BucketSelector({
  selectedBucketId,
  onBucketChange,
  label,
  searchable: searchableParent,
  preferredDropdownDirection = "down",
  filterByExternalSystemId,
}: BucketSelectorProps) {
  const { t } = useI18n();
  const { data: appState } = useNotificationsState();
  const { data: meData } = useGetMeQuery();

  const bucketOptions = useMemo(() => {
    const isAdmin = meData?.me?.role === UserRole.Admin;
    let buckets = (appState?.buckets || []).filter(
      (bucket) =>
        !bucket.isOrphan &&
        !bucket.isProtected &&
        (!bucket.isPublic || isAdmin)
    );
    if (filterByExternalSystemId) {
      buckets = buckets.filter(
        (bucket) =>
          bucket.externalNotifySystem?.id === filterByExternalSystemId
      );
    }
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
  }, [appState, meData?.me?.role, filterByExternalSystemId, t]);

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
