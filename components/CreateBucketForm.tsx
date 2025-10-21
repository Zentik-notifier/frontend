import { useAppContext } from "@/contexts/AppContext";
import {
  CreateBucketDto,
  UpdateBucketDto,
  useCreateBucketMutation,
  useCreateAccessTokenForBucketMutation,
  usePublicAppConfigQuery,
  useUpdateBucketMutation,
} from "@/generated/gql-operations-generated";
import { useBucket, useRefreshBucket, useRefreshBucketsStatsFromDB } from "@/hooks/notifications";
import { notificationKeys } from "@/hooks/notifications/useNotificationQueries";
import { useI18n } from "@/hooks/useI18n";
import { useSettings } from "@/hooks/useSettings";
import { useQueryClient } from "@tanstack/react-query";
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
  useTheme
} from "react-native-paper";
import ColorPicker, { ColorPickerRef } from "./ColorPicker";
import IconEditor from "./IconEditor";
import SnoozeSchedulesManager from "./SnoozeSchedulesManager";

const defaultColor = "#0a7ea4";

interface CreateBucketFormProps {
  bucketId?: string;
}

export default function CreateBucketForm({ bucketId }: CreateBucketFormProps) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const {
    userId,
    userSettings,
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const offline = isOfflineAuth || isBackendUnreachable;
  const [bucketName, setBucketName] = useState("");
  const [bucketColor, setBucketColor] = useState(defaultColor);
  const [bucketIcon, setBucketIcon] = useState("");
  const [isIconEditorVisible, setIsIconEditorVisible] = useState(false);
  const [createAccessToken, setCreateAccessToken] = useState(true);
  const colorPickerRef = useRef<ColorPickerRef>(null);
  const isEditing = !!bucketId;

  const { bucket, canWrite } = useBucket(bucketId, { autoFetch: isEditing, userId: userId ?? undefined });
  const refreshBucket = useRefreshBucket();
  const { refreshBucketsStatsFromDB } = useRefreshBucketsStatsFromDB();
  const { data: appConfig } = usePublicAppConfigQuery();

  const isProtectedBucket = bucket?.isProtected;

  const [createAccessTokenForBucketMutation] = useCreateAccessTokenForBucketMutation({
    refetchQueries: ["GetUserAccessTokens", "GetAccessTokensForBucket"],
  });

  const [createBucketMutation, { loading: creatingBucket }] =
    useCreateBucketMutation({
      onCompleted: async (data) => {
        if (data?.createBucket) {
          // Update React Query cache with the new bucket
          const newBucket = data.createBucket;
          console.log('[CreateBucketForm] Adding new bucket to React Query cache:', newBucket.id);

          // Add to bucketsStats cache immediately with initial stats
          queryClient.setQueryData<any[]>(notificationKeys.bucketsStats(), (old) => {
            if (!old) {
              console.log('[CreateBucketForm] No bucketsStats cache found, creating new');
              return [{
                ...newBucket,
                unreadCount: 0,
                totalCount: 0,
                isSnoozed: false,
              }];
            }

            // Check if bucket already exists (shouldn't happen but be safe)
            const exists = old.some(b => b.id === newBucket.id);
            if (exists) {
              console.log('[CreateBucketForm] Bucket already exists in cache');
              return old;
            }

            console.log('[CreateBucketForm] Adding new bucket to existing cache');
            return [...old, {
              ...newBucket,
              unreadCount: 0,
              totalCount: 0,
              isSnoozed: false,
            }];
          });

          console.log('[CreateBucketForm] Bucket added to cache successfully');

          // Create access token if checkbox was checked
          if (createAccessToken) {
            try {
              console.log('[CreateBucketForm] Creating access token for bucket...');
              await createAccessTokenForBucketMutation({
                variables: {
                  bucketId: newBucket.id,
                  name: `${newBucket.name} Token`,
                },
              });
              console.log('[CreateBucketForm] Access token created successfully');
            } catch (tokenError) {
              console.error('[CreateBucketForm] Error creating access token:', tokenError);
              // Don't block bucket creation if token fails
            }
          }

          // Refresh bucket stats from DB to get real statistics (in case there are notifications)
          console.log('[CreateBucketForm] Refreshing bucket stats from DB...');
          await refreshBucketsStatsFromDB();
          console.log('[CreateBucketForm] Bucket stats refreshed from DB');
        }

        setBucketName("");
        setBucketColor(defaultColor);
        setBucketIcon("");
        setCreateAccessToken(true); // Reset to default true

        router.back();
      },
      onError: (error) => {
        console.error("[CreateBucketForm] Create bucket error:", error);
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
      const uploadEnabled = appConfig?.publicAppConfig?.uploadEnabled ?? true;
      const bucketData: CreateBucketDto | UpdateBucketDto = {
        name: bucketName.trim(),
        color: bucketColor,
        // Only include icon if it's being created or if it changed during edit
        ...(!isEditing || bucketIcon !== originalIcon ? { icon: bucketIcon.trim() || undefined } : {}),
        // Only send generateIconWithInitials if attachments are enabled
        ...(uploadEnabled && {
          generateIconWithInitials: userSettings.settings.notificationsPreferences?.generateBucketIconWithInitials ?? true,
        }),
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

  // Helper to generate initials from bucket name
  const getInitials = (name: string): string => {
    const words = name.split(' ').filter(w => w.length > 0);
    
    if (words.length >= 2) {
      return words[0][0] + words[1][0];
    } else if (words.length === 1 && words[0].length >= 2) {
      return words[0].substring(0, 2);
    } else if (words.length === 1) {
      return words[0][0];
    }
    
    return '?';
  };

  return (
    <>
      {/* Read-only warning */}
      {isEditing && !canWrite && !isProtectedBucket && (
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
          editable={!isEditing || (canWrite && !isProtectedBucket)}
          disabled={(isEditing && !canWrite) || offline}
          mode="outlined"
        />
        {!isProtectedBucket && (
          <Surface
            style={[
              styles.customColorInput,
              { borderColor: theme.colors.outline },
              ((isEditing && !canWrite) || offline) && styles.disabledInput,
            ]}
            onTouchEnd={() => colorPickerRef.current?.openModal()}
          >
            <View
              style={[
                styles.colorPreview,
                { backgroundColor: bucketColor }
              ]}
            />
            <Text style={[
              styles.customColorInputText,
              { color: theme.colors.onSurface }
            ]}>
              {bucketColor}
            </Text>
          </Surface>
        )}
      </View>

      {/* Icon URL Input */}
      {!isProtectedBucket && (
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
      )}

      {/* Icon Preview */}
      {!isProtectedBucket && (
        <View style={styles.previewSection}>
          <Text style={styles.previewLabel}>{t("buckets.form.preview")}</Text>
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
                {userSettings.settings.notificationsPreferences?.generateBucketIconWithInitials && bucketName ? (
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
                : userSettings.settings.notificationsPreferences?.generateBucketIconWithInitials && bucketName
                ? t("buckets.form.initialsPreview")
                : t("buckets.form.colorPreview")}
            </Text>
          </Surface>
        </View>
      )}

      {/* Color Picker - Hidden but accessible via ref */}
      {!isProtectedBucket && (
        <ColorPicker
          ref={colorPickerRef}
          selectedColor={bucketColor}
          onColorChange={setBucketColor}
          disabled={(isEditing && !canWrite) || offline}
        />
      )}

      {/* Access Token Creation - Only show in create mode */}
      {!isEditing && !isProtectedBucket && (
        <View
          style={[
            styles.accessTokenSection,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <View style={styles.switchLabelContainer}>
            <Text
              style={[styles.switchLabel, { color: theme.colors.onSurface }]}
            >
              {t("buckets.form.createAccessToken" as any)}
            </Text>
            <Text
              style={[
                styles.switchDescription,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {t("buckets.form.createAccessTokenHint" as any)}
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
      {!isProtectedBucket && (
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
      )}

      {/* Snooze Schedules Manager - Only show in edit mode */}
      {isEditing && (
        <SnoozeSchedulesManager bucketId={bucketId} disabled={offline} />
      )}

      {/* Icon Editor Modal */}
      {isIconEditorVisible && (
        <IconEditor
          currentIcon={bucketIcon || undefined}
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
    overflow: "hidden",
    backgroundColor: "transparent",
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
