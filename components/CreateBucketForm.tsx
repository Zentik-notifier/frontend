import {
  CreateBucketDto,
  GetBucketsDocument,
  GetBucketsQuery,
  UpdateBucketDto,
  useCreateBucketMutation,
  usePublicAppConfigQuery,
  useUpdateBucketMutation,
} from "@/generated/gql-operations-generated";
import { useBucket, useRefreshBucket } from "@/hooks/notifications";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/contexts/AppContext";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Icon,
  IconButton,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import ColorPicker, { ColorPickerRef } from "./ColorPicker";
import IconEditor from "./IconEditor";
import IdWithCopyButton from "./IdWithCopyButton";
import SnoozeSchedulesManager from "./SnoozeSchedulesManager";

const defaultColor = "#0a7ea4";

interface CreateBucketFormProps {
  bucketId?: string;
}

export default function CreateBucketForm({ bucketId }: CreateBucketFormProps) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const offline = isOfflineAuth || isBackendUnreachable;
  const [bucketName, setBucketName] = useState("");
  const [bucketColor, setBucketColor] = useState(defaultColor);
  const [bucketIcon, setBucketIcon] = useState("");
  const [isIconEditorVisible, setIsIconEditorVisible] = useState(false);
  const colorPickerRef = useRef<ColorPickerRef>(null);
  const isEditing = !!bucketId;

  const { bucket, canWrite } = useBucket(bucketId);
  const refreshBucket = useRefreshBucket();
  const { data: appConfig } = usePublicAppConfigQuery();

  const [createBucketMutation, { loading: creatingBucket }] =
    useCreateBucketMutation({
      update: (cache, { data }) => {
        if (data?.createBucket) {
          const existingBuckets = cache.readQuery<GetBucketsQuery>({
            query: GetBucketsDocument,
          });
          if (existingBuckets?.buckets) {
            cache.writeQuery({
              query: GetBucketsDocument,
              data: {
                buckets: [...existingBuckets.buckets, data.createBucket],
              },
            });
          }
        }
      },
      onCompleted: async (data) => {
        setBucketName("");
        setBucketColor(defaultColor);
        setBucketIcon("");

        router.back();
      },
      onError: (error) => {
        console.error("Create bucket error:", error);
        Alert.alert(
          t("buckets.form.createErrorTitle"),
          error.message || t("buckets.form.createErrorMessage")
        );
      },
    });

  const [updateBucketMutation, { loading: updatingBucket }] =
    useUpdateBucketMutation({
      onCompleted: async (data) => {
        if (bucketId) {
          await refreshBucket(bucketId).catch(console.error);
        }
        router.back();
      },
      onError: (error) => {
        console.error("Update bucket error:", error);
        Alert.alert(
          t("buckets.form.updateErrorTitle"),
          error.message || t("buckets.form.updateErrorMessage")
        );
      },
    });

  const isLoading = creatingBucket || updatingBucket;

  // Store original values for reset functionality
  const [originalName, setOriginalName] = useState("");
  const [originalColor, setOriginalColor] = useState(defaultColor);
  const [originalIcon, setOriginalIcon] = useState("");
  // Device selection removed

  // Initialize form with bucket data when editing
  useEffect(() => {
    if (bucket && isEditing) {
      setBucketName(bucket.name);
      setBucketColor(bucket.color || defaultColor);
      setBucketIcon(bucket.icon || "");

      // Store original values
      setOriginalName(bucket.name);
      setOriginalColor(bucket.color || defaultColor);
      setOriginalIcon(bucket.icon || "");
    }
  }, [bucket, isEditing]);

  const saveBucket = async () => {
    if (!bucketName.trim() || isLoading || (isEditing && !canWrite) || offline)
      return;

    try {
      const bucketData: CreateBucketDto | UpdateBucketDto = {
        name: bucketName.trim(),
        color: bucketColor,
        icon: bucketIcon.trim() || undefined,
      };

      if (isEditing && bucket) {
        await updateBucketMutation({
          variables: {
            id: bucket.id,
            input: bucketData as UpdateBucketDto,
          },
        });
      } else {
        await createBucketMutation({
          variables: {
            input: bucketData as CreateBucketDto,
          },
        });
      }

      if (!isEditing) {
        // Only reset form for new buckets (handled in mutation callbacks)
        setBucketName("");
        setBucketIcon("");
        setBucketColor(defaultColor);
      }
    } catch (error: any) {
      console.error(
        `Error ${isEditing ? "updating" : "creating"} bucket:`,
        error
      );
    }
  };

  const handleEditIcon = () => {
    setIsIconEditorVisible(true);
  };

  const handleIconChange = (newIconUrl: string) => {
    setBucketIcon(newIconUrl);
    setIsIconEditorVisible(false);
  };

  const handleCloseIconEditor = () => {
    setIsIconEditorVisible(false);
  };

  const resetForm = () => {
    if (isEditing) {
      // Reset to original values when editing
      setBucketName(originalName);
      setBucketIcon(originalIcon);
      setBucketColor(originalColor);
    } else {
      // Reset to defaults when creating
      setBucketName("");
      setBucketIcon("");
      setBucketColor(defaultColor);
    }
  };

  const handleRefresh = async () => {
    if (bucketId) {
      await refreshBucket(bucketId).catch(console.error);
    }
  };

  return (
    <>
      {/* Read-only warning */}
      {isEditing && !canWrite && (
        <Surface
          style={[
            styles.warningContainer,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <Icon
            source="information"
            size={24}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            style={[
              styles.warningText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {t("buckets.form.readOnlyWarning")}
          </Text>
        </Surface>
      )}

      {/* Bucket Name and Color Row */}
      <View style={styles.nameColorRow}>
        <TextInput
          style={styles.bucketNameInput}
          value={bucketName}
          onChangeText={setBucketName}
          placeholder={t("buckets.form.namePlaceholder")}
          maxLength={50}
          editable={!isEditing || canWrite}
          disabled={(isEditing && !canWrite) || offline}
          mode="outlined"
        />
        <Surface
          style={[
            styles.customColorInput,
            { borderColor: bucketColor },
            ((isEditing && !canWrite) || offline) && styles.disabledInput,
          ]}
          onTouchEnd={() => colorPickerRef.current?.openModal()}
        >
          <Text style={[styles.customColorInputText, { color: bucketColor }]}>
            {bucketColor}
          </Text>
        </Surface>
      </View>

      {/* Icon URL Input */}
      <View style={styles.iconInputContainer}>
        <TextInput
          style={styles.iconInput}
          value={bucketIcon}
          onChangeText={setBucketIcon}
          placeholder={t("buckets.form.iconPlaceholder")}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          multiline={true}
          editable={!isEditing || canWrite}
          disabled={(isEditing && !canWrite) || offline}
          mode="outlined"
        />
        {appConfig?.publicAppConfig?.uploadEnabled && (
          <IconButton
            icon="camera"
            size={20}
            onPress={handleEditIcon}
            disabled={(isEditing && !canWrite) || offline}
            style={styles.editIconButton}
          />
        )}
      </View>

      {/* Icon Preview */}
      <View style={styles.previewSection}>
        <Text style={styles.previewLabel}>{t("buckets.form.preview")}</Text>
        <Surface style={styles.previewContainer}>
          {bucketIcon ? (
            <Surface
              style={[
                styles.previewIconContainer,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderWidth: 2,
                  borderColor: bucketColor,
                },
              ]}
            >
              <View style={styles.previewIconContent}>
                <Image
                  source={{ uri: bucketIcon }}
                  style={styles.previewIcon}
                  contentFit="fill"
                />
              </View>
            </Surface>
          ) : (
            <Surface
              style={[
                styles.previewColorIndicator,
                { backgroundColor: bucketColor },
              ]}
            >
              <></>
            </Surface>
          )}
          <Text style={styles.previewText}>
            {bucketIcon
              ? t("buckets.form.iconPreview")
              : t("buckets.form.colorPreview")}
          </Text>
        </Surface>
      </View>

      {/* Color Picker - Hidden but accessible via ref */}
      <ColorPicker
        ref={colorPickerRef}
        selectedColor={bucketColor}
        onColorChange={setBucketColor}
        disabled={(isEditing && !canWrite) || offline}
      />
      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <Button
          mode="contained"
          onPress={saveBucket}
          disabled={
            isLoading ||
            !bucketName.trim() ||
            (isEditing && !canWrite) ||
            offline
          }
          style={styles.createButton}
        >
          {isEditing && !canWrite
            ? t("buckets.form.readOnlyMode")
            : isLoading
            ? isEditing
              ? t("buckets.form.updating")
              : t("buckets.form.creating")
            : isEditing
            ? t("buckets.form.updateButton")
            : t("buckets.form.createButton")}
        </Button>

        <Button
          mode="outlined"
          onPress={resetForm}
          disabled={(isEditing && !canWrite) || offline}
          style={styles.resetButton}
        >
          {t("common.reset")}
        </Button>
      </View>

      {/* Snooze Schedules Manager - Only show in edit mode */}
      {isEditing && (
        <SnoozeSchedulesManager bucketId={bucketId} disabled={offline} />
      )}

      {/* Icon Editor Modal */}
      {isIconEditorVisible && (
        <IconEditor
          currentIcon={bucketIcon || undefined}
          onIconChange={handleIconChange}
          onClose={handleCloseIconEditor}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    marginBottom: 16,
  },
  nameColorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    gap: 10,
  },
  bucketNameInput: {
    flex: 1,
  },
  disabledInput: {
    opacity: 0.5,
  },
  customColorInput: {
    width: 100,
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  customColorInputText: {
    fontSize: 14,
    fontWeight: "600",
  },
  iconInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    gap: 8,
  },
  iconInput: {
    flex: 1,
  },
  editIconButton: {
    margin: 0,
  },
  previewSection: {
    marginBottom: 15,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  previewContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 8,
  },
  previewIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  previewIconContent: {
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  previewIcon: {
    width: "100%",
    height: "100%",
  },
  previewColorIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  previewText: {
    fontSize: 14,
    opacity: 0.7,
    fontStyle: "italic",
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontStyle: "italic",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  createButton: {
    flex: 1,
  },
  resetButton: {
    flex: 1,
  },
});
