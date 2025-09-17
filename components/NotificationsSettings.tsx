import { Colors } from "@/constants/Colors";
import { AppIcons } from "@/constants/Icons";
import {
  CreateMessageDto,
  GetNotificationsDocument,
  NotificationActionDto,
  NotificationAttachmentDto,
  NotificationDeliveryType,
  useCreateMessageMutation,
  useGetBucketsQuery,
  useGetUserWebhooksQuery,
} from "@/generated/gql-operations-generated";
import { useLocaleOptions, useNotificationUtils } from "@/hooks";
import { useGetBucketData } from "@/hooks/useGetBucketData";
import { useI18n } from "@/hooks/useI18n";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import {
  getNotificationTestData,
  notificationFormDefaults,
} from "@/utils/notificationFormDefaults";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BucketSelector from "./BucketSelector";
import MediaAttachmentsSelector from "./MediaAttachmentsSelector";
import NotificationActionsSelector from "./NotificationActionsSelector";
import NotificationTapActionSelector from "./NotificationTapActionSelector";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { Icon, IconButton, InlinePicker, InlinePickerOption } from "./ui";
import { AppLoader } from "./ui/AppLoader";

export default function NotificationsSettings() {
  const push = usePushNotifications();
  const {
    setMainLoading,
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const { getDeliveryTypeFriendlyName, getDeliveryTypeIcon } =
    useNotificationUtils();
  const [sending, setSending] = useState(false);
  const [createMessageMutation] = useCreateMessageMutation({
    refetchQueries: [GetNotificationsDocument],
  });

  // GraphQL queries for data
  const { data: bucketsData, loading: bucketsLoading } = useGetBucketsQuery();
  const { data: webhooksData, loading: webhooksLoading } =
    useGetUserWebhooksQuery();

  const loading = bucketsLoading || webhooksLoading;

  useEffect(() => setMainLoading(loading), [loading]);

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
  const { allPermissions } = useGetBucketData(bucketId);

  // Set first bucket as default when buckets are loaded
  useEffect(() => {
    if (bucketsData?.buckets && bucketsData.buckets.length > 0) {
      if (!bucketId || !bucketsData.buckets.find((b) => b.id === bucketId)) {
        setBucketId(bucketsData.buckets[0].id);
      }
    }
  }, [bucketsData, bucketId]);

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
      !bucketsData?.buckets ||
      bucketsData.buckets.length === 0
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
    if (!bucketsData?.buckets || bucketsData.buckets.length === 0) {
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
  const deliveryTypeOptions: InlinePickerOption<NotificationDeliveryType>[] =
    Object.values(NotificationDeliveryType).map((deliveryType) => ({
      value: deliveryType,
      label: getDeliveryTypeFriendlyName(deliveryType),
      icon: getDeliveryTypeIcon(deliveryType),
    }));

  // Webhook options for the picker - when action type is ACTION (external webhook)
  const webhookOptions: InlinePickerOption<string>[] = (
    webhooksData?.userWebhooks || []
  ).map((webhook) => ({
    value: webhook.id,
    label: webhook.name,
    subtitle: `${webhook.method} ${webhook.url}`,
    icon: "webhook" as keyof typeof AppIcons,
  }));

  // Check if webhooks are available
  const hasWebhooks = webhookOptions.length > 0;

  // Locale options for the picker - use the same locales supported by the i18n system
  const localeOptions: InlinePickerOption<string>[] = useLocaleOptions();

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>{t("notifications.title")}</ThemedText>
        <IconButton
          title={t("notifications.loadTestData")}
          iconName="add"
          onPress={loadTestData}
          variant="secondary"
          size="sm"
        />
      </View>

      {/* Content Section */}
      <ThemedView
        style={[
          styles.profileContainer,
          { backgroundColor: Colors[colorScheme ?? "light"].backgroundCard },
        ]}
      >
        <View style={styles.field}>
          <ThemedText style={styles.label}>
            {t("notifications.content.title")}
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: Colors[colorScheme ?? "light"].inputBackground,
                borderColor: Colors[colorScheme ?? "light"].inputBorder,
                color: Colors[colorScheme ?? "light"].text,
              },
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder={t("notifications.content.titlePlaceholder")}
            placeholderTextColor={
              Colors[colorScheme ?? "light"].inputPlaceholder
            }
            maxLength={100}
          />
        </View>

        <View style={styles.field}>
          <ThemedText style={styles.label}>
            {t("notifications.content.subtitle")}
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: Colors[colorScheme ?? "light"].inputBackground,
                borderColor: Colors[colorScheme ?? "light"].inputBorder,
                color: Colors[colorScheme ?? "light"].text,
              },
            ]}
            value={subtitle}
            onChangeText={setSubtitle}
            placeholder={t("notifications.content.subtitlePlaceholder")}
            placeholderTextColor={
              Colors[colorScheme ?? "light"].inputPlaceholder
            }
            maxLength={100}
          />
        </View>

        <View style={styles.field}>
          <ThemedText style={styles.label}>
            {t("notifications.content.body")}
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              styles.textArea,
              {
                backgroundColor: Colors[colorScheme ?? "light"].inputBackground,
                borderColor: Colors[colorScheme ?? "light"].inputBorder,
                color: Colors[colorScheme ?? "light"].text,
              },
            ]}
            value={body}
            onChangeText={setBody}
            placeholder={t("notifications.content.bodyPlaceholder")}
            placeholderTextColor={
              Colors[colorScheme ?? "light"].inputPlaceholder
            }
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
          <InlinePicker
            label={t("notifications.settings.deliveryType")}
            selectedValue={deliveryType}
            options={deliveryTypeOptions}
            onValueChange={setDeliveryType}
            placeholder={t("notifications.settings.selectDeliveryType")}
          />
        </View>

        <View style={styles.field}>
          <ThemedText style={styles.label}>
            {t("notifications.settings.sound")}
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: Colors[colorScheme ?? "light"].inputBackground,
                borderColor: Colors[colorScheme ?? "light"].inputBorder,
                color: Colors[colorScheme ?? "light"].text,
              },
            ]}
            value={sound}
            onChangeText={setSound}
            placeholder={t("notifications.settings.soundPlaceholder")}
            placeholderTextColor={
              Colors[colorScheme ?? "light"].inputPlaceholder
            }
          />
        </View>

        <View style={styles.field}>
          <ThemedText style={styles.label}>
            {t("notifications.settings.locale")}
          </ThemedText>
          <ThemedText
            style={[
              styles.inputHint,
              { color: Colors[colorScheme ?? "light"].textSecondary },
            ]}
          >
            {t("notifications.settings.localeDescription")}
          </ThemedText>
          <InlinePicker
            selectedValue={locale}
            options={localeOptions}
            onValueChange={setLocale}
            placeholder={t("notifications.settings.selectLocale")}
          />
        </View>

        {/* Divisor */}
        <View style={styles.divisor} />

        {/* Automatic Actions Section */}
        <View style={styles.field}>
          <ThemedText style={styles.sectionTitle}>
            {t("notifications.automaticActions.title")}
          </ThemedText>
          <ThemedText
            style={[
              styles.sectionDescription,
              { color: Colors[colorScheme ?? "light"].textSecondary },
            ]}
          >
            {t("notifications.automaticActions.description")}
          </ThemedText>

          {/* Mark As Read Action Checkbox */}
          <View
            style={[
              styles.switchRow,
              {
                backgroundColor:
                  Colors[colorScheme ?? "light"].backgroundSecondary,
              },
            ]}
          >
            <View style={styles.switchLabelContainer}>
              <ThemedText
                style={[
                  styles.switchLabel,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                {t("notifications.automaticActions.addMarkAsReadAction")}
              </ThemedText>
              <ThemedText
                style={[
                  styles.switchDescription,
                  { color: Colors[colorScheme ?? "light"].textSecondary },
                ]}
              >
                {t(
                  "notifications.automaticActions.addMarkAsReadActionDescription"
                )}
              </ThemedText>
            </View>
            <Switch
              value={addMarkAsReadAction}
              onValueChange={setAddMarkAsReadAction}
              trackColor={{
                false: Colors[colorScheme ?? "light"].border,
                true: Colors[colorScheme ?? "light"].tint,
              }}
            />
          </View>

          {/* Delete Action Checkbox */}
          <View
            style={[
              styles.switchRow,
              {
                backgroundColor:
                  Colors[colorScheme ?? "light"].backgroundSecondary,
              },
            ]}
          >
            <View style={styles.switchLabelContainer}>
              <ThemedText
                style={[
                  styles.switchLabel,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                {t("notifications.automaticActions.addDeleteAction")}
              </ThemedText>
              <ThemedText
                style={[
                  styles.switchDescription,
                  { color: Colors[colorScheme ?? "light"].textSecondary },
                ]}
              >
                {t("notifications.automaticActions.addDeleteActionDescription")}
              </ThemedText>
            </View>
            <Switch
              value={addDeleteAction}
              onValueChange={setAddDeleteAction}
              trackColor={{
                false: Colors[colorScheme ?? "light"].border,
                true: Colors[colorScheme ?? "light"].tint,
              }}
            />
          </View>

          {/* Open Notification Action Checkbox */}
          <View
            style={[
              styles.switchRow,
              {
                backgroundColor:
                  Colors[colorScheme ?? "light"].backgroundSecondary,
              },
            ]}
          >
            <View style={styles.switchLabelContainer}>
              <ThemedText
                style={[
                  styles.switchLabel,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                {t("notifications.automaticActions.addOpenNotificationAction")}
              </ThemedText>
              <ThemedText
                style={[
                  styles.switchDescription,
                  { color: Colors[colorScheme ?? "light"].textSecondary },
                ]}
              >
                {t(
                  "notifications.automaticActions.addOpenNotificationActionDescription"
                )}
              </ThemedText>
            </View>
            <Switch
              value={addOpenNotificationAction}
              onValueChange={setAddOpenNotificationAction}
              trackColor={{
                false: Colors[colorScheme ?? "light"].border,
                true: Colors[colorScheme ?? "light"].tint,
              }}
            />
          </View>

          {/* Snooze Times Section */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>
              {t("notifications.automaticActions.snoozeTimes")}
            </ThemedText>
            <ThemedText
              style={[
                styles.inputHint,
                { color: Colors[colorScheme ?? "light"].textSecondary },
              ]}
            >
              {t("notifications.automaticActions.snoozeTimesDescription")}
            </ThemedText>

            {/* Current Snooze Times */}
            {snoozeTimes.length > 0 && (
              <View style={styles.snoozeTimesContainer}>
                {snoozeTimes.map((time, index) => (
                  <View
                    key={index}
                    style={[
                      styles.snoozeTimeItem,
                      {
                        backgroundColor:
                          Colors[colorScheme ?? "light"].backgroundSecondary,
                        borderColor: Colors[colorScheme ?? "light"].border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.snoozeTimeText,
                        { color: Colors[colorScheme ?? "light"].text },
                      ]}
                    >
                      {time} min
                    </ThemedText>
                    <TouchableOpacity
                      style={styles.removeSnoozeTimeButton}
                      onPress={() => removeSnoozeTime(time)}
                    >
                      <Icon name="remove" size="xs" color="white" />
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
                    backgroundColor:
                      Colors[colorScheme ?? "light"].inputBackground,
                    borderColor: Colors[colorScheme ?? "light"].inputBorder,
                    color: Colors[colorScheme ?? "light"].text,
                  },
                ]}
                value={snoozeTimeInput}
                onChangeText={setSnoozeTimeInput}
                placeholder={t(
                  "notifications.automaticActions.snoozeTimePlaceholder"
                )}
                placeholderTextColor={
                  Colors[colorScheme ?? "light"].inputPlaceholder
                }
                keyboardType="numeric"
                maxLength={4}
              />
              <IconButton
                title="Add"
                iconName="add"
                onPress={addSnoozeTime}
                variant="secondary"
                size="sm"
                disabled={
                  !snoozeTimeInput.trim() || parseInt(snoozeTimeInput) <= 0
                }
              />
            </View>
          </View>
        </View>

        {/* Divisor */}
        <View style={styles.divisor} />

        {/* Targeting Section */}
        <View style={styles.field}>
          {bucketsLoading ? (
            <ThemedText
              style={[
                styles.loadingText,
                { color: Colors[colorScheme ?? "light"].textSecondary },
              ]}
            >
              {t("notifications.targeting.loadingBuckets")}
            </ThemedText>
          ) : bucketsData?.buckets && bucketsData.buckets.length > 0 ? (
            <BucketSelector
              label={t("notifications.targeting.bucket")}
              selectedBucketId={bucketId || null}
              onBucketChange={(id) => setBucketId(id || "")}
              buckets={bucketsData.buckets}
              placeholder={t("notifications.targeting.selectBucket")}
              includeAllOption={false}
              searchable={true}
              searchPlaceholder="Search buckets..."
            />
          ) : (
            <View style={styles.field}>
              <ThemedText style={styles.label}>
                {t("notifications.targeting.bucket")}
              </ThemedText>
              <ThemedText
                style={[
                  styles.errorText,
                  { color: Colors[colorScheme ?? "light"].error },
                ]}
              >
                {t("notifications.targeting.bucketRequired")}
              </ThemedText>
            </View>
          )}
        </View>

        {/* New Fields Section */}
        <View style={styles.field}>
          <ThemedText style={styles.label}>
            {t("notifications.targeting.groupId")}
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: Colors[colorScheme ?? "light"].inputBackground,
                borderColor: Colors[colorScheme ?? "light"].inputBorder,
                color: Colors[colorScheme ?? "light"].text,
              },
            ]}
            value={groupId}
            onChangeText={setGroupId}
            placeholder={t("notifications.targeting.groupIdPlaceholder")}
            placeholderTextColor={
              Colors[colorScheme ?? "light"].inputPlaceholder
            }
          />
          <ThemedText
            style={[
              styles.description,
              { color: Colors[colorScheme ?? "light"].textSecondary },
            ]}
          >
            {t("notifications.targeting.groupIdDefault")}
          </ThemedText>
        </View>

        <View style={styles.field}>
          <ThemedText style={styles.label}>
            {t("notifications.targeting.collapseId")}
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: Colors[colorScheme ?? "light"].inputBackground,
                borderColor: Colors[colorScheme ?? "light"].inputBorder,
                color: Colors[colorScheme ?? "light"].text,
              },
            ]}
            value={collapseId}
            onChangeText={setCollapseId}
            placeholder={t("notifications.targeting.collapseIdPlaceholder")}
            placeholderTextColor={
              Colors[colorScheme ?? "light"].inputPlaceholder
            }
          />
        </View>

        {/* User Selection Section */}
        {allPermissions && allPermissions.length > 0 && (
          <View style={styles.field}>
            <ThemedText style={styles.label}>
              {t("notifications.targeting.userIds")}
            </ThemedText>
            <ThemedText
              style={[
                styles.description,
                { color: Colors[colorScheme ?? "light"].textSecondary },
              ]}
            >
              {t("notifications.targeting.userIdsDescription")}
            </ThemedText>
            <View style={styles.userSelectionContainer}>
              {/* "Me" option */}
              <TouchableOpacity
                style={[
                  styles.userChip,
                  selectedUserIds.includes("me") && {
                    backgroundColor: Colors[colorScheme ?? "light"].tint,
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
                <ThemedText
                  style={[
                    styles.userChipText,
                    selectedUserIds.includes("me") && {
                      color: "#fff",
                    },
                  ]}
                >
                  Me
                </ThemedText>
              </TouchableOpacity>
              {/* Other users */}
              {allPermissions.map((permission) => (
                <TouchableOpacity
                  key={permission.user.id}
                  style={[
                    styles.userChip,
                    selectedUserIds.includes(permission.user.id) && {
                      backgroundColor: Colors[colorScheme ?? "light"].tint,
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
                  <ThemedText
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
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            <ThemedText
              style={[
                styles.description,
                { color: Colors[colorScheme ?? "light"].textSecondary },
              ]}
            >
              {t("notifications.targeting.userIdsDefault")}
            </ThemedText>
            {selectedUserIds.length > 0 && (
              <TouchableOpacity
                style={styles.clearSelectionButton}
                onPress={() => setSelectedUserIds([])}
              >
                <ThemedText style={styles.clearSelectionText}>
                  {t("notifications.targeting.clearSelection")}
                </ThemedText>
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
      </ThemedView>

      {/* JSON Preview Section - Collapsible */}
      <ThemedView
        style={[
          styles.profileContainer,
          { backgroundColor: Colors[colorScheme ?? "light"].backgroundCard },
        ]}
      >
        <TouchableOpacity
          style={styles.previewHeader}
          onPress={() => setShowJsonPreview(!showJsonPreview)}
        >
          <View style={styles.previewHeaderContent}>
            <Icon
              name="view"
              size="sm"
              color={Colors[colorScheme ?? "light"].tint}
            />
            <ThemedText style={styles.previewHeaderTitle}>
              {t("notifications.preview.title")}
            </ThemedText>
          </View>
          <Icon
            name={showJsonPreview ? "collapse" : "dropdown"}
            size="sm"
            color={Colors[colorScheme ?? "light"].text}
          />
        </TouchableOpacity>

        {showJsonPreview && (
          <>
            <ThemedText
              style={[
                styles.previewDescription,
                { color: Colors[colorScheme ?? "light"].textSecondary },
              ]}
            >
              {t("notifications.preview.description")}
            </ThemedText>

            <ScrollView
              style={[
                styles.jsonPreviewContainer,
                {
                  backgroundColor:
                    Colors[colorScheme ?? "light"].backgroundSecondary,
                  borderColor: Colors[colorScheme ?? "light"].border,
                },
              ]}
            >
              <Text
                style={[
                  styles.jsonPreviewText,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                {JSON.stringify(buildMessagePayload(), null, 2)}
              </Text>
            </ScrollView>

            <IconButton
              title={t("notifications.preview.copy")}
              iconName="copy"
              onPress={copyJsonToClipboard}
              variant="secondary"
              size="md"
            />
          </>
        )}
      </ThemedView>

      <View style={styles.buttonContainer}>
        {!push.isReady() && (
          <ThemedText
            style={[
              styles.warningText,
              { color: Colors[colorScheme ?? "light"].warning },
            ]}
          >
            {t("notifications.warningNotRegistered")}
          </ThemedText>
        )}

        <IconButton
          title={t("notifications.sendButton")}
          iconName="send"
          onPress={sendMessage}
          disabled={sending || isOfflineAuth || isBackendUnreachable}
          loading={sending}
          loadingText={t("notifications.sending")}
          variant="primary"
          size="lg"
        />

        <IconButton
          title={t("notifications.resetForm")}
          iconName="reset"
          onPress={resetForm}
          variant="secondary"
          size="md"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  profileContainer: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  field: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.7,
    marginBottom: 5,
  },
  textInput: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  buttonContainer: {
    gap: 10,
  },
  warningText: {
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 10,
  },
  divisor: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 20,
    opacity: 0.3,
  },
  loadingText: {
    fontSize: 14,
    textAlign: "center",
    padding: 10,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    padding: 10,
    fontStyle: "italic",
  },

  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    padding: 16,
    borderRadius: 8,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  switchLabelContainer: {
    flex: 1,
  },
  switchDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 5,
  },
  inputHint: {
    fontSize: 12,
    marginBottom: 8,
    fontStyle: "italic",
  },
  inputContainer: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  jsonPreviewContainer: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    maxHeight: 300,
  },
  jsonPreviewText: {
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    marginBottom: 8,
  },
  previewHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewHeaderTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  previewDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  noWebhooksContainer: {
    padding: 16,
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
    gap: 8,
    marginBottom: 15,
  },
  snoozeTimeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  snoozeTimeText: {
    fontSize: 14,
    fontWeight: "500",
  },
  removeSnoozeTimeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  snoozeTimeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  snoozeTimeInput: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  description: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  userSelectionContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  userChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  userChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  clearSelectionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignSelf: "flex-start",
  },
  clearSelectionText: {
    fontSize: 14,
    color: "#6b7280",
  },
});
