import { settingsService } from "@/services/settings-service";
import PaperScrollView from "@/components/ui/PaperScrollView";
import { useAppContext } from "@/contexts/AppContext";
import {
  CreateMessageDto,
  GetNotificationsDocument,
  NotificationActionDto,
  NotificationAttachmentDto,
  NotificationDeliveryType,
  useCreateMessageMutation,
  useGetUserWebhooksQuery,
} from "@/generated/gql-operations-generated";
import { useLanguageSync, useNotificationUtils } from "@/hooks";
import { useBucket, useAppState } from "@/hooks/notifications";
import { useI18n } from "@/hooks/useI18n";
import { useAuthData } from "@/hooks/useSettings";
import {
  getNotificationTestData,
  notificationFormDefaults,
} from "@/utils/notificationFormDefaults";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Card, Icon, Text, useTheme } from "react-native-paper";
import BucketSelector from "./BucketSelector";
import MediaAttachmentsSelector from "./MediaAttachmentsSelector";
import NotificationActionsSelector from "./NotificationActionsSelector";
import NotificationTapActionSelector from "./NotificationTapActionSelector";
import Selector, { SelectorOption } from "./ui/Selector";
import CopyButton from "./ui/CopyButton";
import NumberListInput from "./ui/NumberListInput";
import ButtonGroup from "./ui/ButtonGroup";

export default function CreateNotification() {
  const {
    userId,
    push,
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const { t } = useI18n();
  const theme = useTheme();
  const {
    getDeliveryTypeFriendlyName,
    getDeliveryTypeIcon,
    getDeliveryTypeColor,
  } = useNotificationUtils();
  const { authData } = useAuthData();
  const accessToken = authData.accessToken;
  const [sending, setSending] = useState(false);
  const [createMessageMutation] = useCreateMessageMutation({
    refetchQueries: [GetNotificationsDocument],
  });

  // GraphQL queries for data
  const {
    data: appState,
    isLoading: bucketsLoading,
    refreshAll,
  } = useAppState();
  const bucketsWithStats = appState?.buckets || [];
  const {
    data: webhooksData,
    loading: webhooksLoading,
    refetch: refetchWebhooks,
  } = useGetUserWebhooksQuery();

  const loading = bucketsLoading || webhooksLoading;

  // State for form fields
  const [title, setTitle] = useState(notificationFormDefaults.title);
  const [subtitle, setSubtitle] = useState(notificationFormDefaults.subtitle);
  const [body, setBody] = useState(notificationFormDefaults.body);
  const [sound, setSound] = useState<string>(notificationFormDefaults.sound);
  const [deliveryType, setDeliveryType] = useState<NotificationDeliveryType>(
    NotificationDeliveryType.Normal
  );
  const [bucketId, setBucketId] = useState<string>(
    notificationFormDefaults.bucketId
  );
  const [actions, setActions] = useState<NotificationActionDto[]>(
    notificationFormDefaults.actions
  );
  const [attachments, setAttachments] = useState<NotificationAttachmentDto[]>(
    notificationFormDefaults.attachments
  );
  const [addMarkAsReadAction, setAddMarkAsReadAction] = useState<
    boolean | null
  >(null);
  const [addDeleteAction, setAddDeleteAction] = useState<boolean | null>(null);
  const [addOpenNotificationAction, setAddOpenNotificationAction] = useState<
    boolean | null
  >(null);
  const [snoozeTimes, setSnoozeTimes] = useState<number[] | null>(null);
  const [locale, setLocale] = useState<string>(notificationFormDefaults.locale);
  const [postponeTimes, setPostponeTimes] = useState<number[] | null>(null);
  const [useDefaultSnoozeTimes, setUseDefaultSnoozeTimes] = useState(true);
  const [useDefaultPostponeTimes, setUseDefaultPostponeTimes] = useState(true);
  const [showJsonPreview, setShowJsonPreview] = useState(
    notificationFormDefaults.showJsonPreview
  );
  const [previewFormat, setPreviewFormat] = useState<"json" | "curl">("curl");
  const [groupId, setGroupId] = useState<string>("");
  const [collapseId, setCollapseId] = useState<string>("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [targetingMode, setTargetingMode] = useState<
    "bucket+token" | "magicCode"
  >("bucket+token");

  // TapAction state - optional (can be null)
  const [tapAction, setTapAction] = useState<NotificationActionDto | null>(
    notificationFormDefaults.tapAction
  );

  // Get bucket data and shared users
  const { allPermissions, bucket: bucketDetail } = useBucket(bucketId, {
    autoFetch: !!bucketId,
    userId: userId ?? undefined,
  });

  // Get magicCode from bucket detail
  const selectedBucketMagicCode = bucketDetail?.userBucket?.magicCode ?? null;
  const hasMagicCode = !!selectedBucketMagicCode;

  // Set first bucket as default when buckets are loaded
  useEffect(() => {
    if (bucketsWithStats && bucketsWithStats.length > 0) {
      if (!bucketId || !bucketsWithStats.find((b) => b.id === bucketId)) {
        setBucketId(bucketsWithStats[0].id);
      }
    }
  }, [bucketsWithStats, bucketId]);

  // Reset targeting mode if magicCode becomes unavailable
  useEffect(() => {
    if (targetingMode === "magicCode" && !hasMagicCode) {
      setTargetingMode("bucket+token");
    }
  }, [hasMagicCode, targetingMode]);

  const sendMessage = async () => {
    if (!title.trim()) {
      Alert.alert(
        t("notifications.sendErrorTitle"),
        t("notifications.titleRequired")
      );
      return;
    }

    if (
      !bucketId.trim() ||
      !bucketsWithStats ||
      bucketsWithStats.length === 0
    ) {
      Alert.alert(
        t("notifications.sendErrorTitle"),
        t("notifications.targeting.bucketRequired")
      );
      return;
    }

    setSending(true);
    try {
      const messagePayload = buildMessagePayload();

      console.debug(
        "Sending message:",
        JSON.stringify(messagePayload, null, 2)
      );

      const result = await createMessageMutation({
        variables: { input: messagePayload },
      });

      if (!result.data?.createMessage) {
        throw new Error("Failed to create message");
      }
    } catch (error: any) {
      console.error("Send message error:", error);
      const errorMessage = error.message || "Failed to send message";
      Alert.alert(t("notifications.sendErrorTitle"), errorMessage);
    } finally {
      setSending(false);
    }
  };

  const loadTestData = () => {
    const testData = getNotificationTestData(t);
    setTitle(testData.title);
    setSubtitle(testData.subtitle);
    setBody(testData.body);
    setSound(testData.sound);
    setDeliveryType(testData.deliveryType);
    setActions(testData.actions);
    setAttachments(testData.attachments);
    setAddMarkAsReadAction(testData.addMarkAsReadAction ?? null);
    setAddDeleteAction(testData.addDeleteAction ?? null);
    setAddOpenNotificationAction(testData.addOpenNotificationAction ?? null);
    setSnoozeTimes(testData.snoozeTimes);
    setPostponeTimes(testData.postponeTimes);
    setUseDefaultSnoozeTimes(false);
    setUseDefaultPostponeTimes(false);
    setTapAction(testData.tapAction);
  };

  const resetForm = () => {
    const defaults = notificationFormDefaults;
    setTitle(defaults.title);
    setSubtitle(defaults.subtitle);
    setBody(defaults.body);
    setSound(defaults.sound);
    setDeliveryType(defaults.deliveryType);
    // Don't reset bucketId if buckets are available - let useEffect handle it
    if (!bucketsWithStats || bucketsWithStats.length === 0) {
      setBucketId(defaults.bucketId);
    }
    setActions(defaults.actions);
    setAttachments(defaults.attachments);
    setAddMarkAsReadAction(null);
    setAddDeleteAction(null);
    setAddOpenNotificationAction(null);
    setSnoozeTimes(null);
    setPostponeTimes(null);
    setUseDefaultSnoozeTimes(true);
    setUseDefaultPostponeTimes(true);
    setTargetingMode("bucket+token");
    setLocale(defaults.locale);
    setShowJsonPreview(defaults.showJsonPreview);
    setTapAction(defaults.tapAction);
  };

  // Helper function to build the message payload for GraphQL mutation
  const buildMessagePayload = (): CreateMessageDto => {
    const message: CreateMessageDto = {
      title: title.trim(),
      deliveryType: deliveryType,
    };

    // Set bucketId or magicCode based on targeting mode
    if (targetingMode === "magicCode" && selectedBucketMagicCode) {
      message.magicCode = selectedBucketMagicCode;
    } else {
      message.bucketId = bucketId.trim();
    }

    if (subtitle.trim()) message.subtitle = subtitle.trim();
    if (body.trim()) message.body = body.trim();
    if (attachments.length > 0) message.attachments = attachments;
    if (sound.trim()) message.sound = sound.trim();

    // Add automatic actions flags - only include if explicitly set (not null)
    if (addMarkAsReadAction !== null)
      message.addMarkAsReadAction = addMarkAsReadAction;
    if (addDeleteAction !== null) message.addDeleteAction = addDeleteAction;
    if (addOpenNotificationAction !== null)
      message.addOpenNotificationAction = addOpenNotificationAction;
    if (snoozeTimes !== null && snoozeTimes.length > 0)
      message.snoozes = snoozeTimes;
    if (postponeTimes !== null && postponeTimes.length > 0)
      message.postpones = postponeTimes;
    if (locale) message.locale = locale;

    // Add new optional fields
    if (groupId.trim()) message.groupId = groupId.trim();
    if (collapseId.trim()) message.collapseId = collapseId.trim();
    if (selectedUserIds.length > 0) {
      const resolvedUserIds = selectedUserIds
        .map((id) => (id === "me" ? userId ?? "me" : id))
        .filter((id) => id !== "me");
      if (resolvedUserIds.length > 0) {
        message.userIds = resolvedUserIds;
      }
    }

    if (actions.length > 0) {
      message.actions = actions;
    }

    // Add tapAction to the message
    if (tapAction) {
      message.tapAction = tapAction;
    }

    return message;
  };

  // Generate cURL command
  const generateCurlCommand = () => {
    const apiUrl = settingsService.getApiBaseWithPrefix();
    const payload = buildMessagePayload();
    const jsonPayload = JSON.stringify(payload, null, 2);

    // Build authorization header based on targeting mode
    let authHeader = "";
    if (targetingMode === "magicCode") {
      // No authorization header needed for magicCode
      authHeader = "";
    } else {
      // Both "bucket" and "bucket+token" require authentication
      const token = accessToken || "YOUR_TOKEN_HERE";
      authHeader = `  -H "Authorization: Bearer ${token}" \\\n`;
    }

    const curlLines = [
      `curl -X POST "${apiUrl}/messages" \\`,
      '  -H "Content-Type: application/json" \\',
      ...(authHeader ? [authHeader.trim()] : []),
      `  -d '${jsonPayload}'`,
    ].filter(Boolean);

    return curlLines.join("\n");
  };

  // Copy cURL to clipboard function
  const copyJsonToClipboard = async () => {
    try {
      const curlCommand = generateCurlCommand();
      await Clipboard.setStringAsync(curlCommand);
      Alert.alert(t("common.success"), t("common.copied"));
    } catch (error) {
      Alert.alert(t("common.error"), "Failed to copy cURL to clipboard");
    }
  };

  // Delivery type options for the picker - generated dynamically from enum
  const deliveryTypeOptions: SelectorOption[] = Object.values(
    NotificationDeliveryType
  ).map((deliveryType) => ({
    id: deliveryType,
    name: getDeliveryTypeFriendlyName(deliveryType),
    iconName: getDeliveryTypeIcon(deliveryType),
    iconColor: getDeliveryTypeColor(deliveryType),
  }));

  // Webhook options for the picker - when action type is ACTION (external webhook)
  const webhookOptions: SelectorOption[] = (
    webhooksData?.userWebhooks || []
  ).map((webhook) => ({
    id: webhook.id,
    name: webhook.name,
  }));

  // Check if webhooks are available
  const hasWebhooks = webhookOptions.length > 0;

  const { availableLocales, getLocaleDisplayName } = useLanguageSync();

  const localeOptions: SelectorOption[] = availableLocales.map((locale) => ({
    id: locale,
    name: getLocaleDisplayName(locale),
    iconName: "translate",
  }));

  const handleRefresh = async () => {
    await refreshAll();
    await refetchWebhooks();
  };

  return (
    <PaperScrollView
      onRefresh={handleRefresh}
      loading={loading}
      customActions={[
        {
          label: t("notifications.loadTestData"),
          icon: "refresh",
          onPress: loadTestData,
        },
      ]}
    >
      <View style={styles.section}>
        {/* Content Section */}
        <Card style={styles.card} elevation={0}>
          <Card.Content>
            <View style={styles.field}>
              <Text style={styles.label}>
                {t("notifications.content.title")}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                    color: theme.colors.onSurface,
                  },
                ]}
                value={title}
                onChangeText={setTitle}
                placeholder={t("notifications.content.titlePlaceholder")}
                placeholderTextColor={theme.colors.onSurfaceVariant}
                maxLength={100}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                {t("notifications.content.subtitle")}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                    color: theme.colors.onSurface,
                  },
                ]}
                value={subtitle}
                onChangeText={setSubtitle}
                placeholder={t("notifications.content.subtitlePlaceholder")}
                placeholderTextColor={theme.colors.onSurfaceVariant}
                maxLength={100}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                {t("notifications.content.body")}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.textArea,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                    color: theme.colors.onSurface,
                  },
                ]}
                value={body}
                onChangeText={setBody}
                placeholder={t("notifications.content.bodyPlaceholder")}
                placeholderTextColor={theme.colors.onSurfaceVariant}
                multiline
                maxLength={500}
              />
            </View>

            {/* Media Attachments Section */}
            <MediaAttachmentsSelector
              attachments={attachments}
              onAttachmentsChange={setAttachments}
            />

            {/* Settings Section */}
            <View style={styles.field}>
              <Selector
                label={t("notifications.settings.deliveryType")}
                placeholder={t("notifications.settings.selectDeliveryType")}
                options={deliveryTypeOptions}
                selectedValue={deliveryType}
                onValueChange={(value) =>
                  setDeliveryType(value as NotificationDeliveryType)
                }
                isSearchable={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                {t("notifications.settings.sound")}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                    color: theme.colors.onSurface,
                  },
                ]}
                value={sound}
                onChangeText={setSound}
                placeholder={t("notifications.settings.soundPlaceholder")}
                placeholderTextColor={theme.colors.onSurfaceVariant}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                {t("notifications.settings.locale")}
              </Text>
              <Text
                style={[
                  styles.inputHint,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {t("notifications.settings.localeDescription")}
              </Text>
              <Selector
                selectedValue={locale}
                placeholder={t("notifications.settings.selectLocale")}
                options={localeOptions}
                onValueChange={(value) => setLocale(value as string)}
                isSearchable={true}
              />
            </View>

            {/* Automatic Actions Section */}
            <View style={styles.field}>
              <Text style={styles.sectionTitle}>
                {t("notifications.automaticActions.title")}
              </Text>
              <Text
                style={[
                  styles.sectionDescription,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {t("notifications.automaticActions.description")}
              </Text>

              {/* Mark As Read Action - Tri-state Selection */}
              <View style={styles.field}>
                <Text
                  style={[
                    styles.switchLabel,
                    { color: theme.colors.onSurface, marginBottom: 8 },
                  ]}
                >
                  {t("notifications.automaticActions.addMarkAsReadAction")}
                </Text>
                <Text
                  style={[
                    styles.switchDescription,
                    { color: theme.colors.onSurfaceVariant, marginBottom: 8 },
                  ]}
                >
                  {t(
                    "notifications.automaticActions.addMarkAsReadActionDescription"
                  )}
                </Text>
                <ButtonGroup variant="segmented">
                  <Button
                    mode={
                      addMarkAsReadAction === null ? "contained" : "outlined"
                    }
                    onPress={() => setAddMarkAsReadAction(null)}
                    compact
                    style={{ flex: 1 }}
                  >
                    {t("common.default")}
                  </Button>
                  <Button
                    mode={
                      addMarkAsReadAction === true ? "contained" : "outlined"
                    }
                    onPress={() => setAddMarkAsReadAction(true)}
                    compact
                    style={{ flex: 1 }}
                  >
                    {t("common.yes")}
                  </Button>
                  <Button
                    mode={
                      addMarkAsReadAction === false ? "contained" : "outlined"
                    }
                    onPress={() => setAddMarkAsReadAction(false)}
                    compact
                    style={{ flex: 1 }}
                  >
                    {t("common.no")}
                  </Button>
                </ButtonGroup>
              </View>

              {/* Delete Action - Tri-state Selection */}
              <View style={styles.field}>
                <Text
                  style={[
                    styles.switchLabel,
                    { color: theme.colors.onSurface, marginBottom: 8 },
                  ]}
                >
                  {t("notifications.automaticActions.addDeleteAction")}
                </Text>
                <Text
                  style={[
                    styles.switchDescription,
                    { color: theme.colors.onSurfaceVariant, marginBottom: 8 },
                  ]}
                >
                  {t(
                    "notifications.automaticActions.addDeleteActionDescription"
                  )}
                </Text>
                <ButtonGroup variant="segmented">
                  <Button
                    mode={addDeleteAction === null ? "contained" : "outlined"}
                    onPress={() => setAddDeleteAction(null)}
                    compact
                    style={{ flex: 1 }}
                  >
                    {t("common.default")}
                  </Button>
                  <Button
                    mode={addDeleteAction === true ? "contained" : "outlined"}
                    onPress={() => setAddDeleteAction(true)}
                    compact
                    style={{ flex: 1 }}
                  >
                    {t("common.yes")}
                  </Button>
                  <Button
                    mode={addDeleteAction === false ? "contained" : "outlined"}
                    onPress={() => setAddDeleteAction(false)}
                    compact
                    style={{ flex: 1 }}
                  >
                    {t("common.no")}
                  </Button>
                </ButtonGroup>
              </View>

              {/* Open Notification Action - Tri-state Selection */}
              <View style={styles.field}>
                <Text
                  style={[
                    styles.switchLabel,
                    { color: theme.colors.onSurface, marginBottom: 8 },
                  ]}
                >
                  {t(
                    "notifications.automaticActions.addOpenNotificationAction"
                  )}
                </Text>
                <Text
                  style={[
                    styles.switchDescription,
                    { color: theme.colors.onSurfaceVariant, marginBottom: 8 },
                  ]}
                >
                  {t(
                    "notifications.automaticActions.addOpenNotificationActionDescription"
                  )}
                </Text>
                <ButtonGroup variant="segmented">
                  <Button
                    mode={
                      addOpenNotificationAction === null
                        ? "contained"
                        : "outlined"
                    }
                    onPress={() => setAddOpenNotificationAction(null)}
                    compact
                    style={{ flex: 1 }}
                  >
                    {t("common.default")}
                  </Button>
                  <Button
                    mode={
                      addOpenNotificationAction === true
                        ? "contained"
                        : "outlined"
                    }
                    onPress={() => setAddOpenNotificationAction(true)}
                    compact
                    style={{ flex: 1 }}
                  >
                    {t("common.yes")}
                  </Button>
                  <Button
                    mode={
                      addOpenNotificationAction === false
                        ? "contained"
                        : "outlined"
                    }
                    onPress={() => setAddOpenNotificationAction(false)}
                    compact
                    style={{ flex: 1 }}
                  >
                    {t("common.no")}
                  </Button>
                </ButtonGroup>
              </View>

              {/* Snooze Times Section */}
              <View style={styles.field}>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabelContainer}>
                    <Text
                      style={[
                        styles.switchLabel,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {t("notifications.automaticActions.snoozeTimes")}
                    </Text>
                    <Text
                      style={[
                        styles.switchDescription,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {useDefaultSnoozeTimes
                        ? t(
                            "notifications.automaticActions.useDefaultSnoozeTimesDescription"
                          )
                        : t(
                            "notifications.automaticActions.customSnoozeTimesDescription"
                          )}
                    </Text>
                  </View>
                  <Switch
                    value={useDefaultSnoozeTimes}
                    onValueChange={(value) => {
                      setUseDefaultSnoozeTimes(value);
                      if (value) {
                        setSnoozeTimes(null);
                      } else {
                        setSnoozeTimes([]);
                      }
                    }}
                    trackColor={{
                      false: theme.colors.outline,
                      true: theme.colors.primary,
                    }}
                  />
                </View>
                {!useDefaultSnoozeTimes && (
                  <NumberListInput
                    label=""
                    values={snoozeTimes || []}
                    onValuesChange={(values) => setSnoozeTimes(values)}
                    placeholder={t(
                      "notifications.automaticActions.snoozeTimePlaceholder"
                    )}
                    unit="m"
                    min={1}
                    max={9999}
                    compact
                  />
                )}
              </View>

              {/* Postpone Times Section */}
              <View style={styles.field}>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabelContainer}>
                    <Text
                      style={[
                        styles.switchLabel,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {t("notifications.automaticActions.postponeTimes")}
                    </Text>
                    <Text
                      style={[
                        styles.switchDescription,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {useDefaultPostponeTimes
                        ? t(
                            "notifications.automaticActions.useDefaultPostponeTimesDescription"
                          )
                        : t(
                            "notifications.automaticActions.customPostponeTimesDescription"
                          )}
                    </Text>
                  </View>
                  <Switch
                    value={useDefaultPostponeTimes}
                    onValueChange={(value) => {
                      setUseDefaultPostponeTimes(value);
                      if (value) {
                        setPostponeTimes(null);
                      } else {
                        setPostponeTimes([]);
                      }
                    }}
                    trackColor={{
                      false: theme.colors.outline,
                      true: theme.colors.primary,
                    }}
                  />
                </View>
                {!useDefaultPostponeTimes && (
                  <NumberListInput
                    label=""
                    values={postponeTimes || []}
                    onValuesChange={(values) => setPostponeTimes(values)}
                    placeholder={t(
                      "notifications.automaticActions.postponeTimePlaceholder"
                    )}
                    unit="m"
                    min={1}
                    max={9999}
                    compact
                  />
                )}
              </View>
            </View>

            {/* Targeting Section */}
            <View style={styles.field}>
              {bucketsLoading ? (
                <Text
                  style={[
                    styles.loadingText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {t("notifications.targeting.loadingBuckets")}
                </Text>
              ) : bucketsWithStats && bucketsWithStats.length > 0 ? (
                <>
                  <BucketSelector
                    label={t("notifications.targeting.bucket")}
                    selectedBucketId={bucketId}
                    onBucketChange={(id) => {
                      setBucketId(id || "");
                      // Reset targeting mode if bucket changes and magicCode not available
                      if (
                        id &&
                        !hasMagicCode &&
                        targetingMode === "magicCode"
                      ) {
                        setTargetingMode("bucket+token");
                      }
                    }}
                    searchable
                  />
                  {bucketId && hasMagicCode && (
                    <View style={styles.field}>
                      <Selector
                        mode="inline"
                        label={t("notifications.targeting.targetingMode")}
                        placeholder={t(
                          "notifications.targeting.selectTargetingMode"
                        )}
                        options={[
                          {
                            id: "bucket+token",
                            name: t("notifications.targeting.modeBucketToken"),
                            iconName: "key",
                          },
                          {
                            id: "magicCode",
                            name: t(
                              "notifications.targeting.modeMagicCode"
                            ),
                            iconName: "star",
                          },
                        ]}
                        selectedValue={targetingMode}
                        onValueChange={(value) =>
                          setTargetingMode(
                            value as "bucket+token" | "magicCode"
                          )
                        }
                        isSearchable={false}
                      />
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.field}>
                  <Text style={styles.label}>
                    {t("notifications.targeting.bucket")}
                  </Text>
                  <Text
                    style={[styles.errorText, { color: theme.colors.error }]}
                  >
                    {t("notifications.targeting.bucketRequired")}
                  </Text>
                </View>
              )}
            </View>

            {/* New Fields Section */}
            <View style={styles.field}>
              <Text style={styles.label}>
                {t("notifications.targeting.groupId")}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                    color: theme.colors.onSurface,
                  },
                ]}
                value={groupId}
                onChangeText={setGroupId}
                placeholder={t("notifications.targeting.groupIdPlaceholder")}
                placeholderTextColor={theme.colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.description,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {t("notifications.targeting.groupIdDefault")}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                {t("notifications.targeting.collapseId")}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                    color: theme.colors.onSurface,
                  },
                ]}
                value={collapseId}
                onChangeText={setCollapseId}
                placeholder={t("notifications.targeting.collapseIdPlaceholder")}
                placeholderTextColor={theme.colors.onSurfaceVariant}
              />
            </View>

            {/* User Selection Section */}
            {allPermissions && allPermissions.length > 0 && (
              <View style={styles.field}>
                <Text style={styles.label}>
                  {t("notifications.targeting.userIds")}
                </Text>
                <Text
                  style={[
                    styles.description,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {t("notifications.targeting.userIdsDescription")}
                </Text>
                <View style={styles.userSelectionContainer}>
                  {/* "Me" option */}
                  <TouchableOpacity
                    style={[
                      styles.userChip,
                      selectedUserIds.includes("me") && {
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => {
                      if (selectedUserIds.includes("me")) {
                        setSelectedUserIds(
                          selectedUserIds.filter((id) => id !== "me")
                        );
                      } else {
                        setSelectedUserIds([...selectedUserIds, "me"]);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.userChipText,
                        selectedUserIds.includes("me") && {
                          color: "#fff",
                        },
                      ]}
                    >
                      Me
                    </Text>
                  </TouchableOpacity>
                  {/* Other users */}
                  {allPermissions.map((permission) => (
                    <TouchableOpacity
                      key={permission.user.id}
                      style={[
                        styles.userChip,
                        selectedUserIds.includes(permission.user.id) && {
                          backgroundColor: theme.colors.primary,
                        },
                      ]}
                      onPress={() => {
                        if (selectedUserIds.includes(permission.user.id)) {
                          setSelectedUserIds(
                            selectedUserIds.filter(
                              (id) => id !== permission.user.id
                            )
                          );
                        } else {
                          setSelectedUserIds([
                            ...selectedUserIds,
                            permission.user.id,
                          ]);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.userChipText,
                          selectedUserIds.includes(permission.user.id) && {
                            color: "#fff",
                          },
                        ]}
                      >
                        {permission.user.username ||
                          permission.user.email ||
                          permission.user.id}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text
                  style={[
                    styles.description,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {t("notifications.targeting.userIdsDefault")}
                </Text>
              </View>
            )}

            {/* Actions Section */}
            <NotificationActionsSelector
              actions={actions}
              onActionsChange={setActions}
              webhookOptions={webhookOptions}
              hasWebhooks={hasWebhooks}
            />

            {/* TapAction Section */}
            <NotificationTapActionSelector
              tapAction={tapAction}
              onTapActionChange={(a) => {
                setTapAction(a);
              }}
              webhookOptions={webhookOptions}
              hasWebhooks={hasWebhooks}
            />
          </Card.Content>
        </Card>

        {/* JSON Preview Section - Collapsible */}
        <Card style={styles.card} elevation={0}>
          <Card.Content>
            <TouchableOpacity
              style={styles.previewHeader}
              onPress={() => setShowJsonPreview(!showJsonPreview)}
            >
              <View style={styles.previewHeaderContent}>
                <Icon source="eye" size={20} color={theme.colors.primary} />
                <Text style={styles.previewHeaderTitle}>
                  {t("notifications.preview.title")}
                </Text>
              </View>
              <Icon
                source={showJsonPreview ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.colors.onSurface}
              />
            </TouchableOpacity>

            {showJsonPreview && (
              <>
                <Text
                  style={[
                    styles.previewDescription,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {t("notifications.preview.description")}
                </Text>

                {/* Format Selector */}
                <View style={styles.formatSelector}>
                  <Button
                    mode={previewFormat === "json" ? "contained" : "outlined"}
                    onPress={() => setPreviewFormat("json")}
                    compact
                    style={styles.formatButton}
                  >
                    {t("notifications.preview.formatJson")}
                  </Button>
                  <Button
                    mode={previewFormat === "curl" ? "contained" : "outlined"}
                    onPress={() => setPreviewFormat("curl")}
                    compact
                    style={styles.formatButton}
                  >
                    {t("notifications.preview.formatCurl")}
                  </Button>
                </View>

                <Text
                  style={[
                    styles.previewDescription,
                    { color: theme.colors.onSurfaceVariant, marginTop: 8 },
                  ]}
                >
                  {previewFormat === "json"
                    ? t("notifications.preview.jsonDescription")
                    : t("notifications.preview.curlDescription")}
                </Text>

                <PaperScrollView
                  style={{
                    ...styles.jsonPreviewContainer,
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.outline,
                  }}
                >
                  <Text
                    style={[
                      styles.jsonPreviewText,
                      {
                        color: theme.colors.onSurface,
                      },
                    ]}
                  >
                    {(() => {
                      try {
                        const content = previewFormat === "json"
                          ? JSON.stringify(buildMessagePayload(), null, 2)
                          : generateCurlCommand();
                        return content || "No content available";
                      } catch (error) {
                        return "Error generating preview content";
                      }
                    })()}
                  </Text>
                </PaperScrollView>

                <CopyButton
                  text={(() => {
                    try {
                      const content = previewFormat === "json"
                        ? JSON.stringify(buildMessagePayload(), null, 2)
                        : generateCurlCommand();
                      return content || "";
                    } catch (error) {
                      return "";
                    }
                  })()}
                  label={
                    previewFormat === "json"
                      ? t("notifications.preview.copyJson")
                      : t("notifications.preview.copyCurl")
                  }
                  successLabel={
                    previewFormat === "json"
                      ? t("notifications.preview.copiedJson")
                      : t("notifications.preview.copiedCurl")
                  }
                  style={styles.copyButton}
                />
              </>
            )}
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          {!push.isReady() && (
            <Text style={[styles.warningText, { color: theme.colors.error }]}>
              {t("notifications.warningNotRegistered")}
            </Text>
          )}

          <Button
            mode="contained"
            icon="send"
            onPress={sendMessage}
            disabled={sending || isOfflineAuth || isBackendUnreachable}
            loading={sending}
            style={styles.sendButton}
          >
            {sending
              ? t("notifications.sending")
              : t("notifications.sendButton")}
          </Button>

          <Button
            mode="outlined"
            icon="refresh"
            onPress={resetForm}
            compact
            style={styles.resetButton}
          >
            {t("notifications.resetForm")}
          </Button>
        </View>
      </View>
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  loadDataBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    opacity: 0.8,
  },
  textInput: {
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    paddingTop: 14,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  buttonContainer: {
    gap: 12,
    marginTop: 8,
  },
  warningText: {
    fontSize: 13,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 12,
    opacity: 0.9,
  },
  loadingText: {
    fontSize: 14,
    textAlign: "center",
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    padding: 16,
    fontStyle: "italic",
  },

  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  switchDescription: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 13,
    marginBottom: 10,
    fontStyle: "italic",
    lineHeight: 18,
    opacity: 0.8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 4,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 21,
    opacity: 0.8,
  },
  jsonPreviewContainer: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    minHeight: 150,
    maxHeight: Platform.select({
      web: 400,
      ios: 300,
      android: 300,
      default: 300
    }),
    height: Platform.select({
      web: 300,
      ios: 250,
      android: 250,
      default: 250
    }),
    padding: 16,
    flex: 0,
  },
  jsonPreviewText: {
    fontFamily: Platform.select({
      ios: 'Courier',
      android: 'monospace',
      web: 'Consolas, Monaco, "Liberation Mono", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Courier New", monospace',
      default: 'monospace'
    }),
    fontSize: Platform.OS === 'web' ? 12 : 13,
    lineHeight: Platform.OS === 'web' ? 20 : 18,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 12,
  },
  previewHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewHeaderTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  previewDescription: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 21,
    opacity: 0.8,
  },
  noWebhooksContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    marginBottom: 8,
    alignItems: "center",
  },
  noWebhooksText: {
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
  },
  description: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 20,
    opacity: 0.8,
  },
  userSelectionContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
    marginTop: 8,
  },
  userChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  userChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  sendButton: {
    borderRadius: 12,
  },
  resetButton: {
    borderRadius: 12,
  },
  copyButton: {
    marginTop: 16,
  },
  formatSelector: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  formatButton: {
    flex: 1,
  },
});
