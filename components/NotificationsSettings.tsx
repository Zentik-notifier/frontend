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
import { useBucket, useBucketsStats } from "@/hooks/notifications";
import { useI18n } from "@/hooks/useI18n";
import {
  getNotificationTestData,
  notificationFormDefaults,
} from "@/utils/notificationFormDefaults";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useState } from "react";
import {
  Alert,
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

export default function NotificationsSettings() {
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
  const [sending, setSending] = useState(false);
  const [createMessageMutation] = useCreateMessageMutation({
    refetchQueries: [GetNotificationsDocument],
  });

  // GraphQL queries for data
  const {
    data: bucketsWithStats = [],
    isLoading: bucketsLoading,
    refreshBucketsStats,
  } = useBucketsStats();
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
  const [addMarkAsReadAction, setAddMarkAsReadAction] = useState(
    notificationFormDefaults.addMarkAsReadAction
  );
  const [addDeleteAction, setAddDeleteAction] = useState(
    notificationFormDefaults.addDeleteAction
  );
  const [addOpenNotificationAction, setAddOpenNotificationAction] = useState(
    notificationFormDefaults.addOpenNotificationAction
  );
  const [snoozeTimes, setSnoozeTimes] = useState<number[]>(
    notificationFormDefaults.snoozeTimes
  );
  const [locale, setLocale] = useState<string>(notificationFormDefaults.locale);
  const [snoozeTimeInput, setSnoozeTimeInput] = useState(
    notificationFormDefaults.snoozeTimeInput
  );
  const [showJsonPreview, setShowJsonPreview] = useState(
    notificationFormDefaults.showJsonPreview
  );
  const [groupId, setGroupId] = useState<string>("");
  const [collapseId, setCollapseId] = useState<string>("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // TapAction state - optional (can be null)
  const [tapAction, setTapAction] = useState<NotificationActionDto | null>(
    notificationFormDefaults.tapAction
  );

  // Get bucket data and shared users
  const { allPermissions } = useBucket(bucketId, { autoFetch: !!bucketId, userId: userId ?? undefined });

  // Set first bucket as default when buckets are loaded
  useEffect(() => {
    if (bucketsWithStats && bucketsWithStats.length > 0) {
      if (!bucketId || !bucketsWithStats.find((b) => b.id === bucketId)) {
        setBucketId(bucketsWithStats[0].id);
      }
    }
  }, [bucketsWithStats, bucketId]);

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

  // Snooze time management functions
  const addSnoozeTime = () => {
    const newTime = parseInt(snoozeTimeInput);
    if (newTime > 0 && !snoozeTimes.includes(newTime)) {
      setSnoozeTimes([...snoozeTimes, newTime].sort((a, b) => a - b));
      setSnoozeTimeInput("");
    }
  };

  const removeSnoozeTime = (time: number) => {
    setSnoozeTimes(snoozeTimes.filter((t) => t !== time));
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
    setAddMarkAsReadAction(testData.addMarkAsReadAction);
    setAddDeleteAction(testData.addDeleteAction);
    setAddOpenNotificationAction(testData.addOpenNotificationAction);
    setSnoozeTimes(testData.snoozeTimes);
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
    setAddMarkAsReadAction(defaults.addMarkAsReadAction);
    setAddDeleteAction(defaults.addDeleteAction);
    setAddOpenNotificationAction(defaults.addOpenNotificationAction);
    setSnoozeTimes(defaults.snoozeTimes);
    setLocale(defaults.locale);
    setSnoozeTimeInput(defaults.snoozeTimeInput);
    setShowJsonPreview(defaults.showJsonPreview);
    setTapAction(defaults.tapAction);
  };

  // Helper function to build the message payload for GraphQL mutation
  const buildMessagePayload = (): CreateMessageDto => {
    const message: CreateMessageDto = {
      title: title.trim(),
      deliveryType: deliveryType,
      bucketId: bucketId.trim(),
    };

    if (subtitle.trim()) message.subtitle = subtitle.trim();
    if (body.trim()) message.body = body.trim();
    if (attachments.length > 0) message.attachments = attachments;
    if (sound.trim()) message.sound = sound.trim();

    // Add automatic actions flags
    if (addMarkAsReadAction) message.addMarkAsReadAction = true;
    if (addDeleteAction) message.addDeleteAction = true;
    if (addOpenNotificationAction) message.addOpenNotificationAction = true;
    if (snoozeTimes.length > 0) message.snoozes = snoozeTimes;
    if (locale) message.locale = locale;

    // Add new optional fields
    if (groupId.trim()) message.groupId = groupId.trim();
    if (collapseId.trim()) message.collapseId = collapseId.trim();
    if (selectedUserIds.length > 0) message.userIds = selectedUserIds;

    if (actions.length > 0) {
      message.actions = actions;
    }

    // Add tapAction to the message
    if (tapAction) {
      message.tapAction = tapAction;
    }

    return message;
  };

  // Copy JSON to clipboard function
  const copyJsonToClipboard = async () => {
    try {
      const jsonString = JSON.stringify(buildMessagePayload(), null, 2);
      await Clipboard.setStringAsync(jsonString);
      Alert.alert(t("common.success"), t("notifications.preview.copied"));
    } catch (error) {
      Alert.alert(t("common.error"), "Failed to copy JSON to clipboard");
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
    await refreshBucketsStats();
    await refetchWebhooks();
  };

  return (
    <PaperScrollView onRefresh={handleRefresh} loading={loading}>
      <View style={styles.section}>
        <View style={styles.loadDataBtnRow}>
          <Button mode="outlined" icon="plus" onPress={loadTestData} compact>
            {t("notifications.loadTestData")}
          </Button>
        </View>

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

            {/* Divisor */}
            <View style={styles.divisor} />

            {/* Media Attachments Section */}
            <MediaAttachmentsSelector
              attachments={attachments}
              onAttachmentsChange={setAttachments}
            />

            {/* Divisor */}
            <View style={styles.divisor} />

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

            {/* Divisor */}
            <View style={styles.divisor} />

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

              {/* Mark As Read Action Checkbox */}
              <View
                style={[
                  styles.switchRow,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                  },
                ]}
              >
                <View style={styles.switchLabelContainer}>
                  <Text
                    style={[
                      styles.switchLabel,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {t("notifications.automaticActions.addMarkAsReadAction")}
                  </Text>
                  <Text
                    style={[
                      styles.switchDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t(
                      "notifications.automaticActions.addMarkAsReadActionDescription"
                    )}
                  </Text>
                </View>
                <Switch
                  value={addMarkAsReadAction}
                  onValueChange={setAddMarkAsReadAction}
                  trackColor={{
                    false: theme.colors.outline,
                    true: theme.colors.primary,
                  }}
                />
              </View>

              {/* Delete Action Checkbox */}
              <View
                style={[
                  styles.switchRow,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                  },
                ]}
              >
                <View style={styles.switchLabelContainer}>
                  <Text
                    style={[
                      styles.switchLabel,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {t("notifications.automaticActions.addDeleteAction")}
                  </Text>
                  <Text
                    style={[
                      styles.switchDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t(
                      "notifications.automaticActions.addDeleteActionDescription"
                    )}
                  </Text>
                </View>
                <Switch
                  value={addDeleteAction}
                  onValueChange={setAddDeleteAction}
                  trackColor={{
                    false: theme.colors.outline,
                    true: theme.colors.primary,
                  }}
                />
              </View>

              {/* Open Notification Action Checkbox */}
              <View
                style={[
                  styles.switchRow,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                  },
                ]}
              >
                <View style={styles.switchLabelContainer}>
                  <Text
                    style={[
                      styles.switchLabel,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {t(
                      "notifications.automaticActions.addOpenNotificationAction"
                    )}
                  </Text>
                  <Text
                    style={[
                      styles.switchDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t(
                      "notifications.automaticActions.addOpenNotificationActionDescription"
                    )}
                  </Text>
                </View>
                <Switch
                  value={addOpenNotificationAction}
                  onValueChange={setAddOpenNotificationAction}
                  trackColor={{
                    false: theme.colors.outline,
                    true: theme.colors.primary,
                  }}
                />
              </View>

              {/* Snooze Times Section */}
              <View style={styles.field}>
                <Text style={styles.label}>
                  {t("notifications.automaticActions.snoozeTimes")}
                </Text>
                <Text
                  style={[
                    styles.inputHint,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {t("notifications.automaticActions.snoozeTimesDescription")}
                </Text>

                {/* Current Snooze Times */}
                {snoozeTimes.length > 0 && (
                  <View style={styles.snoozeTimesContainer}>
                    {snoozeTimes.map((time, index) => (
                      <View
                        key={index}
                        style={[
                          styles.snoozeTimeItem,
                          {
                            backgroundColor: theme.colors.surfaceVariant,
                            borderColor: theme.colors.outline,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.snoozeTimeText,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          {time} min
                        </Text>
                        <TouchableOpacity
                          style={styles.removeSnoozeTimeButton}
                          onPress={() => removeSnoozeTime(time)}
                        >
                          <Icon source="minus" size={16} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Add Snooze Time Input */}
                <View style={styles.snoozeTimeInputContainer}>
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.snoozeTimeInput,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.outline,
                        color: theme.colors.onSurface,
                      },
                    ]}
                    value={snoozeTimeInput}
                    onChangeText={setSnoozeTimeInput}
                    placeholder={t(
                      "notifications.automaticActions.snoozeTimePlaceholder"
                    )}
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                  <Button
                    mode="outlined"
                    icon="plus"
                    onPress={addSnoozeTime}
                    compact
                    disabled={
                      !snoozeTimeInput.trim() || parseInt(snoozeTimeInput) <= 0
                    }
                  >
                    {t("common.add")}
                  </Button>
                </View>
              </View>
            </View>

            {/* Divisor */}
            <View style={styles.divisor} />

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
                <BucketSelector
                  label={t("notifications.targeting.bucket")}
                  selectedBucketId={bucketId}
                  onBucketChange={(id) => setBucketId(id || "")}
                  buckets={bucketsWithStats as any}
                  searchable={true}
                />
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
                {selectedUserIds.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearSelectionButton}
                    onPress={() => setSelectedUserIds([])}
                  >
                    <Text style={styles.clearSelectionText}>
                      {t("notifications.targeting.clearSelection")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Divisor */}
            <View style={styles.divisor} />

            {/* Actions Section */}
            <NotificationActionsSelector
              actions={actions}
              onActionsChange={setActions}
              webhookOptions={webhookOptions}
              hasWebhooks={hasWebhooks}
            />

            {/* Divisor */}
            <View style={styles.divisor} />

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
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {JSON.stringify(buildMessagePayload(), null, 2)}
                  </Text>
                </PaperScrollView>

                <Button
                  mode="outlined"
                  icon="content-copy"
                  onPress={copyJsonToClipboard}
                  compact
                >
                  {t("notifications.preview.copy")}
                </Button>
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
  divisor: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 24,
    marginHorizontal: -16,
    opacity: 0.2,
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
    maxHeight: 300,
    padding: 16,
  },
  jsonPreviewText: {
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 20,
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
  snoozeTimesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
    marginTop: 8,
  },
  snoozeTimeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  snoozeTimeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  removeSnoozeTimeButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  snoozeTimeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  snoozeTimeInput: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    borderWidth: 1,
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
  clearSelectionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignSelf: "flex-start",
    marginTop: 4,
  },
  clearSelectionText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  sendButton: {
    borderRadius: 12,
  },
  resetButton: {
    borderRadius: 12,
  },
});
