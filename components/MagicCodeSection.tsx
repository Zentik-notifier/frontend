import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Switch, View } from "react-native";
import { Icon, Surface, Text, useTheme } from "react-native-paper";
import DetailSectionCard from "./ui/DetailSectionCard";
import DetailItemCard from "./ui/DetailItemCard";
import CopyButton from "./ui/CopyButton";
import DetailModal from "./ui/DetailModal";
import BucketApiExamples from "./BucketApiExamples";
import { useI18n } from "@/hooks/useI18n";
import {
  useRegenerateMagicCodeMutation,
  useDeleteMagicCodeMutation,
  GetBucketsDocument,
} from "@/generated/gql-operations-generated";
import { useRefreshBucket } from "@/hooks/notifications";
import { Alert } from "react-native";

interface MagicCodeSectionProps {
  bucketId: string;
  magicCode: string | null | undefined;
  disabled?: boolean;
}

export default function MagicCodeSection({
  bucketId,
  magicCode,
  disabled = false,
}: MagicCodeSectionProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const [showExamplesDialog, setShowExamplesDialog] = useState(false);
  const refreshBucket = useRefreshBucket();

  const [regenerateMagicCode, { loading: regeneratingMagicCode }] =
    useRegenerateMagicCodeMutation({
      refetchQueries: [{ query: GetBucketsDocument }],
      onCompleted: async () => {
        await refreshBucket(bucketId);
      },
      onError: (error) => {
        console.error("Error regenerating magic code:", error);
        Alert.alert(
          t("common.error"),
          t("buckets.form.magicCodeRegenerateError")
        );
      },
    });

  const [deleteMagicCode, { loading: deletingMagicCode }] =
    useDeleteMagicCodeMutation({
      refetchQueries: [{ query: GetBucketsDocument }],
      onCompleted: async () => {
        await refreshBucket(bucketId);
      },
      onError: (error) => {
        console.error("Error deleting magic code:", error);
        Alert.alert(
          t("common.error"),
          t("buckets.form.magicCodeDeleteError")
        );
      },
    });

  const handleRegenerate = () => {
    regenerateMagicCode({ variables: { bucketId } });
  };

  const handleDelete = () => {
    deleteMagicCode({ variables: { bucketId } });
  };

  const isLoading = regeneratingMagicCode || deletingMagicCode;

  return (
    <>
      <DetailSectionCard
        title={t("buckets.form.magicCodeLabel")}
        description={t("buckets.form.magicCodeDescription")}
        headerRight={
          isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Switch
              value={!!magicCode}
              onValueChange={magicCode ? handleDelete : handleRegenerate}
              disabled={disabled}
              trackColor={{
                false: theme.colors.outline,
                true: theme.colors.primary,
              }}
            />
          )
        }
        // emptyState={{
        //   text: t("buckets.form.noMagicCode"),
        // }}
        items={magicCode ? [{ code: magicCode }] : []}
        renderItem={() => (
          <View>
            <DetailItemCard
              icon="key"
              title={magicCode || "-"}
              titleRight={
                magicCode ? (
                  <CopyButton
                    text={magicCode}
                    size={18}
                    label={t("common.copy")}
                  />
                ) : null
              }
              actions={
                magicCode
                  ? [
                      {
                        icon: "refresh",
                        onPress: handleRegenerate,
                        disabled: disabled || regeneratingMagicCode,
                      },
                      {
                        icon: "code-tags",
                        onPress: () => setShowExamplesDialog(true),
                      },
                    ]
                  : undefined
              }
            />
            {magicCode && (
              <Surface
                style={[
                  styles.warning,
                  { backgroundColor: theme.colors.errorContainer },
                ]}
              >
                <Icon
                  source="alert"
                  size={16}
                  color={theme.colors.onErrorContainer}
                />
                <Text
                  style={[
                    styles.warningText,
                    { color: theme.colors.onErrorContainer },
                  ]}
                >
                  {t("buckets.form.magicCodeWarning")}
                </Text>
              </Surface>
            )}
          </View>
        )}
      />

      {/* API Examples Modal */}
      <DetailModal
        visible={showExamplesDialog && !!magicCode}
        onDismiss={() => setShowExamplesDialog(false)}
        title={t("buckets.apiExamples.title" as any)}
        icon="code-tags"
        actions={{
          cancel: {
            label: t("common.close"),
            onPress: () => setShowExamplesDialog(false),
          },
        }}
      >
        {magicCode && (
          <BucketApiExamples bucketId={bucketId} magicCode={magicCode} />
        )}
      </DetailModal>
    </>
  );
}

const styles = StyleSheet.create({
  warning: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
});
