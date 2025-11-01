import React from "react";
import { StyleSheet, View } from "react-native";
import { Icon, Surface, Text, useTheme } from "react-native-paper";
import DetailSectionCard from "./ui/DetailSectionCard";
import DetailItemCard from "./ui/DetailItemCard";
import CopyButton from "./ui/CopyButton";
import { useI18n } from "@/hooks/useI18n";

interface BucketInfoSectionProps {
  bucketId: string;
  createdAt: string;
  formatDate: (date: string) => string;
}

export default function BucketInfoSection({
  bucketId,
  createdAt,
  formatDate,
}: BucketInfoSectionProps) {
  const { t } = useI18n();
  const theme = useTheme();

  return (
    <DetailSectionCard
      title={t("buckets.info.title")}
      description={t("buckets.info.description")}
      emptyState={{
        icon: "information-off",
        text: t("buckets.info.noInfo"),
      }}
      items={[{ id: bucketId, createdAt }]}
      renderItem={() => (
        <View style={styles.container}>
          <DetailItemCard
            icon="identifier"
            title={t("buckets.form.bucketId")}
            titleRight={<CopyButton text={bucketId} size={18} />}
            details={[bucketId]}
          />
          <DetailItemCard
            icon="calendar-clock"
            title={t("buckets.item.created")}
            details={[formatDate(createdAt)]}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
});
