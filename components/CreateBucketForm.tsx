import { useAppContext } from "@/contexts/AppContext";
import {
  CreateBucketDto,
  UpdateBucketDto,
  useCreateAccessTokenForBucketMutation,
  usePublicAppConfigQuery,
  useUpdateUserBucketCustomNameMutation,
} from "@/generated/gql-operations-generated";
import {
  useBucket,
  useCreateBucket,
  useUpdateBucket,
  useRefreshBucket,
} from "@/hooks/notifications";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Switch, View } from "react-native";
import {
  Button,
  Icon,
  IconButton,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import ColorPicker, { ColorPickerRef } from "./ColorPicker";
import IconEditor from "./IconEditor";
import DetailSectionCard from "./ui/DetailSectionCard";

const defaultColor = "#0a7ea4";

interface CreateBucketFormProps {
  bucketId?: string;
}

export default function CreateBucketForm({ bucketId }: CreateBucketFormProps) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const {
    userId,
    userSettings,
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const offline = isOfflineAuth || isBackendUnreachable;
  const [bucketName, setBucketName] = useState("");
  const [bucketColor, setBucketColor] = useState(defaultColor);
  const [bucketIcon, setBucketIcon] = useState("");
  const [bucketIconSourceUrl, setBucketIconSourceUrl] = useState(""); // Original source URL
  const [bucketIconError, setBucketIconError] = useState("");
  const [isIconEditorVisible, setIsIconEditorVisible] = useState(false);
  const [createAccessToken, setCreateAccessToken] = useState(false);
  const [generateMagicCode, setGenerateMagicCode] = useState(true);
  const colorPickerRef = useRef<ColorPickerRef>(null);
  const isEditing = !!bucketId;
  const { navigateToBucketDetail } = useNavigationUtils();

  const { bucket, canWrite, isSharedWithMe } = useBucket(bucketId, {
    autoFetch: isEditing,
    userId: userId ?? undefined,
  });
  const refreshBucket = useRefreshBucket();
  const { data: appConfig } = usePublicAppConfigQuery();
  const { uploadEnabled, iconUploaderEnabled } =
    appConfig?.publicAppConfig ?? {};

  const isProtectedBucket = bucket?.isProtected;
  const isSharedBucket = isSharedWithMe && !bucket?.isPublic && !bucket?.isAdmin;

  const [createAccessTokenForBucketMutation] =
    useCreateAccessTokenForBucketMutation({});

  const [updateUserBucketCustomNameMutation] =
    useUpdateUserBucketCustomNameMutation({});

  const { createBucket, isLoading: creatingBucket } = useCreateBucket({
    onSuccess: async (data) => {
      if (data?.id) {
        console.log("[CreateBucketForm] Bucket created successfully:", data.id);

        // Create access token if checkbox was checked
        if (createAccessToken) {
          try {
            console.log(
              "[CreateBucketForm] Creating access token for bucket..."
            );
            await createAccessTokenForBucketMutation({
              variables: {
                bucketId: data.id,
                name: `${data.name} Token`,
              },
            });
            console.log("[CreateBucketForm] Access token created successfully");
          } catch (tokenError) {
            console.error(
              "[CreateBucketForm] Error creating access token:",
              tokenError
            );
            // Don't block bucket creation if token fails
          }
        }

        // Navigate to bucket detail for new buckets
        navigateToBucketDetail(data.id);
      }
    },
    onError: (error) => {
      console.error("[CreateBucketForm] Create bucket error:", error);
      Alert.alert(
        t("buckets.form.createErrorTitle"),
        error.message || t("buckets.form.createErrorMessage")
      );
    },
  });

  const { updateBucket, isLoading: updatingBucket } = useUpdateBucket({
    onSuccess: async (bucketId) => {
      await refreshBucket(bucketId).catch(console.error);
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
  const [originalIconSourceUrl, setOriginalIconSourceUrl] = useState("");
  // Device selection removed

  // Initialize form with bucket data when editing
  useEffect(() => {
    if (bucket && isEditing) {
      // For shared buckets, use customName if available, otherwise use bucket name
      const displayName = isSharedBucket 
        ? (bucket.userBucket?.customName || bucket.name)
        : bucket.name;
      
      setBucketName(displayName);
      setBucketColor(bucket.color || defaultColor);
      setBucketIcon(bucket.icon || "");
      setBucketIconSourceUrl(bucket.icon || ""); // Use icon as source URL

      // Store original values
      setOriginalName(displayName);
      setOriginalColor(bucket.color || defaultColor);
      setOriginalIcon(bucket.icon || "");
      setOriginalIconSourceUrl(bucket.icon || "");
    }
  }, [bucket, isEditing, isSharedBucket]);

  const saveBucket = async () => {
    if (!bucketName.trim() || isLoading || offline)
      return;

    // For shared buckets, only name can be changed (customName)
    if (isEditing && isSharedBucket) {
      if (!bucket?.id) return;
      
      try {
        const trimmedName = bucketName.trim();
        // If name matches original bucket name, set customName to null (remove override)
        // Otherwise, set it to the new name
        const customNameValue = trimmedName === bucket.name ? null : trimmedName;
        
        await updateUserBucketCustomNameMutation({
          variables: {
            bucketId: bucket.id,
            customName: customNameValue,
          },
        });
        
        await refreshBucket(bucket.id).catch(console.error);
        router.back();
      } catch (error: any) {
        console.error("Error updating bucket custom name:", error);
        Alert.alert(
          t("buckets.form.updateErrorTitle"),
          error.message || t("buckets.form.updateErrorMessage")
        );
      }
      return;
    }

    // Regular bucket update/create logic (owner buckets only)
    if (isEditing && !canWrite) return;

    // Validate icon URL if provided
    if (bucketIcon.trim() && !validateIconUrl(bucketIcon)) {
      return;
    }

    try {
      const uploadEnabled = appConfig?.publicAppConfig?.uploadEnabled ?? true;
      const bucketData: CreateBucketDto | UpdateBucketDto = {
        name: bucketName.trim(),
        color: bucketColor,
        // Use iconSourceUrl (original) for the icon field
        // Only include icon if it's being created or if it changed during edit
        ...(!isEditing || bucketIconSourceUrl !== originalIconSourceUrl
          ? { icon: bucketIconSourceUrl.trim() || undefined }
          : {}),
        // Only send generateIconWithInitials if attachments are enabled
        ...(uploadEnabled && {
          generateIconWithInitials:
            userSettings.settings.notificationsPreferences
              ?.generateBucketIconWithInitials ?? true,
        }),
      };

      if (isEditing && bucket) {
        await updateBucket({
          bucketId: bucket.id,
          data: {
            name: bucketData.name,
            description: bucketData.description,
            color: bucketData.color,
            icon: bucketData.icon,
            generateIconWithInitials: bucketData.generateIconWithInitials,
          },
        });
      } else {
        await createBucket({
          name: bucketData.name || "",
          description: bucketData.description || undefined,
          color: bucketData.color || undefined,
          icon: bucketData.icon || undefined,
          isProtected: bucketData.isProtected || undefined,
          isPublic: bucketData.isPublic || undefined,
          generateMagicCode: generateMagicCode,
        });
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

  const handleIconChange = (iconUrl: string, originalSourceUrl?: string) => {
    setBucketIcon(iconUrl); // Uploaded/processed icon URL
    setBucketIconSourceUrl(originalSourceUrl || iconUrl); // Original source URL
    setIsIconEditorVisible(false);
  };

  const validateIconUrl = (url: string): boolean => {
    if (!url.trim()) {
      setBucketIconError("");
      return true;
    }

    try {
      new URL(url);
      setBucketIconError("");
      return true;
    } catch {
      setBucketIconError(t("buckets.form.iconUrlInvalid"));
      return false;
    }
  };

  const handleIconUrlChange = (text: string) => {
    setBucketIcon(text);
    setBucketIconSourceUrl(text); // Reset source URL to match manual input
    if (text.trim()) {
      validateIconUrl(text);
    } else {
      setBucketIconError("");
    }
  };

  const handleCloseIconEditor = () => {
    setIsIconEditorVisible(false);
  };

  const resetForm = () => {
    if (isEditing) {
      // Reset to original values when editing
      setBucketName(originalName);
      setBucketIcon(originalIcon);
      setBucketIconSourceUrl(originalIconSourceUrl);
      setBucketColor(originalColor);
    } else {
      // Reset to defaults when creating
      setBucketName("");
      setBucketIcon("");
      setBucketIconSourceUrl("");
      setBucketColor(defaultColor);
      setCreateAccessToken(false);
      setGenerateMagicCode(true);
    }
    setBucketIconError("");
  };

  // Helper to generate initials from bucket name
  const getInitials = (name: string): string => {
    const words = name.split(" ").filter((w) => w.length > 0);

    if (words.length >= 2) {
      return words[0][0] + words[1][0];
    } else if (words.length === 1 && words[0].length >= 2) {
      return words[0].substring(0, 2);
    } else if (words.length === 1) {
      return words[0][0];
    }

    return "?";
  };

  return (
    <>
      {/* Read-only warning */}
      {isEditing && !canWrite && !isProtectedBucket && !isSharedBucket && (
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

      {/* Shared bucket info */}
      {isEditing && isSharedBucket && (
        <Surface
          style={[
            styles.warningContainer,
            { backgroundColor: theme.colors.primaryContainer },
          ]}
        >
          <Icon
            source="account-multiple"
            size={24}
            color={theme.colors.onPrimaryContainer}
          />
          <Text
            style={[
              styles.warningText,
              { color: theme.colors.onPrimaryContainer },
            ]}
          >
            {t("buckets.form.sharedBucketInfo")}
          </Text>
        </Surface>
      )}

      <DetailSectionCard
        // title={
        //   isEditing
        //     ? t("buckets.form.editTitle")
        //     : t("buckets.form.createTitle")
        // }
        // description={
        //   isEditing
        //     ? t("buckets.form.editDescription")
        //     : t("buckets.form.createDescription")
        // }
        items={[{ key: "form" }]}
        renderItem={() => (
          <>
            {/* Bucket Name and Color Row */}
            <View style={styles.nameColorRow}>
              <TextInput
                style={styles.bucketNameInput}
                value={bucketName}
                onChangeText={setBucketName}
                placeholder={
                  isSharedBucket 
                    ? t("buckets.form.customNamePlaceholder")
                    : t("buckets.form.namePlaceholder")
                }
                maxLength={50}
                editable={!offline && (!isEditing || isSharedBucket || (canWrite && !isProtectedBucket))}
                disabled={offline || (isEditing && !isSharedBucket && (!canWrite || !!isProtectedBucket))}
                mode="outlined"
                label={
                  isSharedBucket && bucket?.name !== bucketName
                    ? t("buckets.form.customNameLabel")
                    : undefined
                }
              />
              {!isProtectedBucket && !isSharedBucket && (
                <Surface
                  style={[
                    styles.customColorInput,
                    { borderColor: theme.colors.outline },
                    ((isEditing && !canWrite) || offline) &&
                      styles.disabledInput,
                  ]}
                  onTouchEnd={() => colorPickerRef.current?.openModal()}
                >
                  <View
                    style={[
                      styles.colorPreview,
                      { backgroundColor: bucketColor },
                    ]}
                  />
                  <Text
                    style={[
                      styles.customColorInputText,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {bucketColor}
                  </Text>
                </Surface>
              )}
            </View>

            {/* Original bucket name display for shared buckets */}
            {isSharedBucket && bucket?.name !== bucketName && (
              <Text
                style={[
                  styles.originalNameText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {t("buckets.form.originalName")}: {bucket?.name}
              </Text>
            )}

            {/* Icon URL Input - Hidden for shared buckets */}
            {!isProtectedBucket && !isSharedBucket && (
              <View style={styles.iconInputContainer}>
                <TextInput
                  style={styles.iconInput}
                  value={bucketIcon}
                  onChangeText={handleIconUrlChange}
                  placeholder={t("buckets.form.iconPlaceholder")}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  multiline
                  editable={!isEditing || canWrite}
                  disabled={(isEditing && !canWrite) || offline}
                  mode="outlined"
                  error={!!bucketIconError}
                />
                {uploadEnabled && iconUploaderEnabled && (
                  <IconButton
                    icon="camera"
                    size={20}
                    onPress={handleEditIcon}
                    disabled={(isEditing && !canWrite) || offline}
                    style={styles.editIconButton}
                  />
                )}
              </View>
            )}
            {bucketIconError ? (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {bucketIconError}
              </Text>
            ) : null}

            {/* Icon Preview - Hidden for shared buckets */}
            {!isProtectedBucket && !isSharedBucket && (
              <View style={styles.previewSection}>
                {/* <Text style={styles.previewLabel}>
                  {t("buckets.form.preview")}
                </Text> */}
                <Surface style={styles.previewContainer} elevation={0}>
                  {bucketIcon ? (
                    <View style={styles.previewIconContainer}>
                      {/* Background circle with bucket color */}
                      <View
                        style={[
                          styles.previewIconBackground,
                          { backgroundColor: bucketColor },
                        ]}
                      />
                      {/* Image clipped to circle */}
                      <View style={styles.previewIconContent}>
                        <Image
                          source={{ uri: bucketIcon }}
                          style={styles.previewIcon}
                          contentFit="cover"
                        />
                      </View>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.previewColorIndicator,
                        { backgroundColor: bucketColor },
                      ]}
                    >
                      {/* Show initials if enabled in settings and bucket name exists */}
                      {userSettings.settings.notificationsPreferences
                        ?.generateBucketIconWithInitials && bucketName ? (
                        <Text
                          style={[
                            styles.previewInitials,
                            { color: theme.colors.onPrimary },
                          ]}
                        >
                          {getInitials(bucketName).toUpperCase()}
                        </Text>
                      ) : null}
                    </View>
                  )}
                  <Text style={styles.previewText}>
                    {bucketIcon
                      ? t("buckets.form.iconPreview")
                      : userSettings.settings.notificationsPreferences
                          ?.generateBucketIconWithInitials && bucketName
                      ? t("buckets.form.initialsPreview")
                      : t("buckets.form.colorPreview")}
                  </Text>
                </Surface>
              </View>
            )}

            {/* Magic Code Generation - Only show in create mode */}
            {!isEditing && (
              <View
                style={[
                  styles.accessTokenSection,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                <View style={styles.switchLabelContainer}>
                  <Text
                    style={[
                      styles.switchLabel,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {t("buckets.form.magicCodeLabel")}
                  </Text>
                  <Text
                    style={[
                      styles.switchDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t("buckets.form.magicCodeDescription")}
                  </Text>
                </View>
                <Switch
                  value={generateMagicCode}
                  onValueChange={setGenerateMagicCode}
                  disabled={offline}
                  trackColor={{
                    false: theme.colors.outline,
                    true: theme.colors.primary,
                  }}
                />
              </View>
            )}

            {/* Access Token Creation - Only show in create mode */}
            {!isEditing && (
              <View
                style={[
                  styles.accessTokenSection,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                <View style={styles.switchLabelContainer}>
                  <Text
                    style={[
                      styles.switchLabel,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {t("buckets.form.createAccessToken")}
                  </Text>
                  <Text
                    style={[
                      styles.switchDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t("buckets.form.createAccessTokenHint")}
                  </Text>
                </View>
                <Switch
                  value={createAccessToken}
                  onValueChange={setCreateAccessToken}
                  disabled={offline}
                  trackColor={{
                    false: theme.colors.outline,
                    true: theme.colors.primary,
                  }}
                />
              </View>
            )}

            {/* Action Buttons */}
            {(!isProtectedBucket || isSharedBucket) && (
              <View style={styles.buttonRow}>
                <Button
                  mode="contained"
                  onPress={saveBucket}
                  disabled={
                    isLoading ||
                    !bucketName.trim() ||
                    (isEditing && !isSharedBucket && !canWrite) ||
                    offline
                  }
                  style={styles.createButton}
                >
                  {isEditing && !isSharedBucket && !canWrite
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
                  disabled={(isEditing && !isSharedBucket && !canWrite) || offline}
                  style={styles.resetButton}
                >
                  {t("common.reset")}
                </Button>
              </View>
            )}
          </>
        )}
      />

      {/* Color Picker - Hidden but accessible via ref */}
      {!isProtectedBucket && (
        <ColorPicker
          ref={colorPickerRef}
          selectedColor={bucketColor}
          onColorChange={setBucketColor}
          disabled={(isEditing && !canWrite) || offline}
        />
      )}

      {/* Icon Editor Modal */}
      {isIconEditorVisible && uploadEnabled && iconUploaderEnabled && (
        <IconEditor
          currentIcon={bucketIconSourceUrl || bucketIcon || undefined}
          bucketColor={bucketColor}
          bucketName={bucketName}
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
    width: 120,
    minHeight: 56, // Same height as outlined TextInput
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  customColorInputText: {
    fontSize: 12,
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
    marginRight: 12,
    position: "relative",
  },
  previewIconBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    zIndex: 0,
  },
  previewIconContent: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "transparent",
    overflow: "hidden", // Clip image to circular shape
    zIndex: 1,
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
    justifyContent: "center",
    alignItems: "center",
  },
  previewInitials: {
    fontSize: 18,
    fontWeight: "600",
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
  originalNameText: {
    fontSize: 13,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 12,
    fontStyle: "italic",
  },
  errorText: {
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 12,
  },
  accessTokenSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 8,
    marginBottom: 15,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
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
