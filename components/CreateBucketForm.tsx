import { Colors } from "@/constants/Colors";
import {
  CreateBucketDto,
  UpdateBucketDto,
  useCreateBucketMutation,
  useUpdateBucketMutation,
  usePublicAppConfigQuery,
} from "@/generated/gql-operations-generated";
import { useGetBucketData } from "@/hooks";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ColorPicker, { ColorPickerRef } from "./ColorPicker";
import IconEditor from "./IconEditor";
import IdWithCopyButton from "./IdWithCopyButton";
import SnoozeSchedulesManager from "./SnoozeSchedulesManager";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

const defaultColor = "#0a7ea4";

interface CreateBucketFormProps {
  bucketId?: string;
  withHeader?: boolean;
}

export default function CreateBucketForm({
  bucketId,
  withHeader,
}: CreateBucketFormProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { formatDate } = useDateFormat();
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

  const { bucket, refetch, canWrite } = useGetBucketData(bucketId);
  const { data: appConfig } = usePublicAppConfigQuery();

  const [createBucketMutation, { loading: creatingBucket }] =
    useCreateBucketMutation({
      refetchQueries: ["GetBuckets"],
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
        await refetch?.();
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

  return (
    <ThemedView style={styles.container}>
      {withHeader && (
        <View style={styles.header}>
          <Ionicons
            name={isEditing ? "create-outline" : "folder-outline"}
            size={48}
            color={Colors[colorScheme ?? "light"].tint}
          />
          <ThemedText style={styles.title}>
            {isEditing
              ? t("buckets.form.editTitle")
              : t("buckets.form.createTitle")}
          </ThemedText>
          <ThemedText style={styles.description}>
            {isEditing
              ? t("buckets.form.editDescription")
              : t("buckets.form.createDescription")}
          </ThemedText>
        </View>
      )}

      <ThemedView
        style={[
          styles.formContainer,
          { backgroundColor: Colors[colorScheme ?? "light"].backgroundCard },
        ]}
      >
        {/* Read-only warning */}
        {isEditing && !canWrite && (
          <View
            style={[
              styles.warningContainer,
              {
                backgroundColor:
                  Colors[colorScheme ?? "light"].backgroundSecondary,
              },
            ]}
          >
            <Ionicons
              name="information-circle"
              size={24}
              color={Colors[colorScheme ?? "light"].textSecondary}
            />
            <ThemedText
              style={[
                styles.warningText,
                { color: Colors[colorScheme ?? "light"].textSecondary },
              ]}
            >
              {t("buckets.form.readOnlyWarning")}
            </ThemedText>
          </View>
        )}

        {/* Bucket Name and Color Row */}
        <View style={styles.nameColorRow}>
          <TextInput
            style={[
              styles.bucketNameInput,
              {
                backgroundColor: Colors[colorScheme ?? "light"].background,
                borderColor: Colors[colorScheme ?? "light"].border,
                color: Colors[colorScheme ?? "light"].text,
              },
              ((isEditing && !canWrite) || offline) && styles.disabledInput,
            ]}
            value={bucketName}
            onChangeText={setBucketName}
            placeholder={t("buckets.form.namePlaceholder")}
            placeholderTextColor={Colors[colorScheme ?? "light"].tabIconDefault}
            maxLength={50}
            editable={!isEditing || canWrite}
          />
          <TouchableOpacity
            style={[
              styles.customColorInput,
              {
                borderColor: bucketColor,
                backgroundColor: Colors[colorScheme ?? "light"].background,
              },
              ((isEditing && !canWrite) || offline) && styles.disabledInput,
            ]}
            onPress={() => colorPickerRef.current?.openModal()}
            disabled={(isEditing && !canWrite) || offline}
          >
            <ThemedText
              style={[styles.customColorInputText, { color: bucketColor }]}
            >
              {bucketColor}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Icon URL Input */}
        <View style={styles.iconInputContainer}>
          <TextInput
            style={[
              styles.iconInput,
              {
                backgroundColor: Colors[colorScheme ?? "light"].background,
                borderColor: Colors[colorScheme ?? "light"].border,
                color: Colors[colorScheme ?? "light"].text,
              },
              ((isEditing && !canWrite) || offline) && styles.disabledInput,
            ]}
            value={bucketIcon}
            onChangeText={setBucketIcon}
            placeholder={t("buckets.form.iconPlaceholder")}
            placeholderTextColor={Colors[colorScheme ?? "light"].tabIconDefault}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!isEditing || canWrite}
          />
          {appConfig?.publicAppConfig?.uploadEnabled && (
            <TouchableOpacity
              style={[
                styles.editIconButton,
                {
                  backgroundColor: Colors[colorScheme ?? "light"].tint,
                },
                ((isEditing && !canWrite) || offline) && styles.disabledButton,
              ]}
              onPress={handleEditIcon}
              disabled={(isEditing && !canWrite) || offline}
            >
              <Ionicons name="camera" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>

        {/* Icon Preview */}
        <View style={styles.previewSection}>
          <ThemedText style={styles.previewLabel}>
            {t("buckets.form.preview")}
          </ThemedText>
          <View
            style={[
              styles.previewContainer,
              {
                backgroundColor: Colors[colorScheme ?? "light"].background,
                borderColor: Colors[colorScheme ?? "light"].border,
              },
            ]}
          >
            {bucketIcon ? (
              <View
                style={[
                  styles.previewIconContainer,
                  {
                    backgroundColor:
                      Colors[colorScheme ?? "light"].backgroundSecondary,
                    borderWidth: 2,
                    borderColor: bucketColor,
                  },
                ]}
              >
                <Image
                  source={{ uri: bucketIcon }}
                  style={styles.previewIcon}
                  contentFit="contain"
                  onError={() => {
                    // If image fails to load, it will show the color indicator as fallback
                  }}
                />
              </View>
            ) : (
              <View
                style={[
                  styles.previewColorIndicator,
                  { backgroundColor: bucketColor },
                ]}
              />
            )}
            <ThemedText style={styles.previewText}>
              {bucketIcon
                ? t("buckets.form.iconPreview")
                : t("buckets.form.colorPreview")}
            </ThemedText>
          </View>
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
          <TouchableOpacity
            style={[
              styles.button,
              styles.createButton,
              { backgroundColor: Colors[colorScheme ?? "light"].tint },
              (isLoading ||
                !bucketName.trim() ||
                (isEditing && !canWrite) ||
                offline) &&
                styles.buttonDisabled,
            ]}
            onPress={saveBucket}
            disabled={
              isLoading ||
              !bucketName.trim() ||
              (isEditing && !canWrite) ||
              offline
            }
          >
            <ThemedText style={styles.createButtonText}>
              {isEditing && !canWrite
                ? t("buckets.form.readOnlyMode")
                : isLoading
                ? isEditing
                  ? t("buckets.form.updating")
                  : t("buckets.form.creating")
                : isEditing
                ? t("buckets.form.updateButton")
                : t("buckets.form.createButton")}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.resetButton,
              ((isEditing && !canWrite) || offline) && styles.buttonDisabled,
            ]}
            onPress={resetForm}
            disabled={(isEditing && !canWrite) || offline}
          >
            <ThemedText style={styles.resetButtonText}>
              {t("common.reset")}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Snooze Schedules Manager - Only show in edit mode */}
        {isEditing && (
          <SnoozeSchedulesManager bucketId={bucketId} disabled={offline} />
        )}
      </ThemedView>

      {/* Readonly fields for editing mode - moved to bottom */}
      {isEditing && bucket && (
        <ThemedView
          style={[
            styles.readonlyContainer,
            {
              backgroundColor: Colors[colorScheme ?? "light"].backgroundCard,
              borderColor: Colors[colorScheme ?? "light"].border,
            },
          ]}
        >
          <IdWithCopyButton
            id={bucket.id}
            label={t("buckets.form.bucketId")}
            copyMessage={t("buckets.form.bucketIdCopied")}
            valueStyle={styles.readonlyValue}
          />
          <View style={styles.readonlyField}>
            <ThemedText style={styles.readonlyLabel}>
              {t("buckets.item.created")}:
            </ThemedText>
            <ThemedText style={styles.readonlyValue}>
              {formatDate(bucket.createdAt)}
            </ThemedText>
          </View>
        </ThemedView>
      )}

      {/* Icon Editor Modal */}
      {isIconEditorVisible && (
        <IconEditor
          currentIcon={bucketIcon || undefined}
          onIconChange={handleIconChange}
          onClose={handleCloseIconEditor}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 8,
    textAlign: "center",
  },
  formContainer: {
    padding: 20,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  disabledInput: {
    opacity: 0.5,
    backgroundColor: "#f5f5f5",
  },
  customColorInput: {
    width: 100,
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
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
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  editIconButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.5,
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
    borderWidth: 1,
  },
  previewIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  previewIcon: {
    width: 44,
    height: 44,
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
  checkmark: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  createButton: {
    // backgroundColor set dynamically
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resetButton: {
    backgroundColor: "#6c757d",
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  readonlyContainer: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  readonlyField: {
    marginBottom: 10,
  },
  readonlyLabel: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.7,
    marginBottom: 4,
  },
  readonlyValue: {
    fontSize: 14,
    fontFamily: "monospace",
  },
});
