import { Colors } from "@/constants/Colors";
import { AppIcons } from "@/constants/Icons";
import {
  CreateMessageDto,
  GetNotificationsDocument,
  NotificationActionDto,
  NotificationAttachmentDto,
  NotificationDeliveryType,
  useCreateMessageMutation,
  useGetUserWebhooksQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/contexts/AppContext";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import MediaAttachmentsSelector from "./MediaAttachmentsSelector";
import NotificationActionsSelector from "./NotificationActionsSelector";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { IconButton, InlinePicker, InlinePickerOption } from "./ui";

interface MessageBuilderProps {
  onMessageSent?: () => void;
  initialBucketId?: string;
  compact?: boolean;
}

export default function MessageBuilder({
  onMessageSent,
  initialBucketId,
  compact = true,
}: MessageBuilderProps) {
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const [sending, setSending] = useState(false);
  const [createMessageMutation] = useCreateMessageMutation({
    refetchQueries: [GetNotificationsDocument],
  });

  // GraphQL queries for data
  const { data: webhooksData } = useGetUserWebhooksQuery();

  // State for form fields
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [actions, setActions] = useState<NotificationActionDto[]>([]);
  const [attachments, setAttachments] = useState<NotificationAttachmentDto[]>([]);
  
  // Priority state
  const [priority, setPriority] = useState<NotificationDeliveryType>(NotificationDeliveryType.Normal);
  
  // Automatic actions flags
  const [addMarkAsReadAction, setAddMarkAsReadAction] = useState(false);
  const [addDeleteAction, setAddDeleteAction] = useState(false);
  const [addOpenNotificationAction, setAddOpenNotificationAction] = useState(false);

  const sendMessage = async () => {
    if (!title.trim()) {
      Alert.alert(
        t("notifications.sendErrorTitle"),
        t("notifications.titleRequired")
      );
      return;
    }

    if (!initialBucketId?.trim()) {
      Alert.alert(
        t("notifications.sendErrorTitle"),
        t("notifications.targeting.bucketRequired")
      );
      return;
    }

    setSending(true);
    try {
      const messagePayload = buildMessagePayload();

      const result = await createMessageMutation({
        variables: { input: messagePayload },
      });

      if (!result.data?.createMessage) {
        throw new Error("Failed to create message");
      }

      // Reset form after successful send
      resetForm();
      onMessageSent?.();
    } catch (error: any) {
      console.error("Send message error:", error);
      const errorMessage = error.message || "Failed to send message";
      Alert.alert(t("notifications.sendErrorTitle"), errorMessage);
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setSubtitle("");
    setBody("");
    setActions([]);
    setAttachments([]);
    setPriority(NotificationDeliveryType.Normal);
    setAddMarkAsReadAction(false);
    setAddDeleteAction(false);
    setAddOpenNotificationAction(false);
  };

  // Helper function to build the message payload for GraphQL mutation
  const buildMessagePayload = (): CreateMessageDto => {
    const message: CreateMessageDto = {
      title: title.trim(),
      deliveryType: priority,
      bucketId: initialBucketId!,
    };

    if (subtitle.trim()) message.subtitle = subtitle.trim();
    if (body.trim()) message.body = body.trim();
    if (attachments.length > 0) message.attachments = attachments;
    if (actions.length > 0) message.actions = actions;

    // Add automatic actions flags
    if (addMarkAsReadAction) message.addMarkAsReadAction = true;
    if (addDeleteAction) message.addDeleteAction = true;
    if (addOpenNotificationAction) message.addOpenNotificationAction = true;

    return message;
  };

  // Webhook options for the picker
  const webhookOptions: InlinePickerOption<string>[] = (
    webhooksData?.userWebhooks || []
  ).map((webhook) => ({
    value: webhook.id,
    label: webhook.name,
    subtitle: `${webhook.method} ${webhook.url}`,
    icon: "webhook" as keyof typeof AppIcons,
  }));

  const hasWebhooks = webhookOptions.length > 0;

  // Priority options for the picker
  const priorityOptions: InlinePickerOption<NotificationDeliveryType>[] = [
    {
      value: NotificationDeliveryType.Normal,
      label: t("compose.messageBuilder.normal"),
      icon: "notifications" as keyof typeof AppIcons,
    },
    {
      value: NotificationDeliveryType.Critical,
      label: t("compose.messageBuilder.important"),
      icon: "warning" as keyof typeof AppIcons,
    },
    {
      value: NotificationDeliveryType.Silent,
      label: t("compose.messageBuilder.low"),
      icon: "notification-off" as keyof typeof AppIcons,
    },
  ];

  return (
    <View style={styles.container}>
      <ThemedView
        style={[
          styles.formContainer,
          { backgroundColor: Colors[colorScheme ?? "light"].backgroundCard },
        ]}
      >
        {/* Titolo */}
        <View style={styles.field}>
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

        {/* Sottotitolo */}
        <View style={styles.field}>
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

        {/* Corpo del messaggio */}
        <View style={styles.field}>
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

        {/* Priority Selector */}
        <View style={styles.field}>
          <InlinePicker
            label={t("compose.messageBuilder.priority")}
            selectedValue={priority}
            options={priorityOptions}
            onValueChange={setPriority}
            placeholder={t("compose.messageBuilder.normal")}
          />
        </View>

        {/* Automatic Actions Flags */}
        <View style={styles.field}>
          <ThemedText style={styles.sectionTitle}>
            {t("compose.messageBuilder.flags")}
          </ThemedText>

          <View style={[styles.switchRow, { backgroundColor: Colors[colorScheme ?? "light"].backgroundSecondary }]}>
            <View style={styles.switchLabelContainer}>
              <ThemedText style={[styles.switchLabel, { color: Colors[colorScheme ?? "light"].text }]}>
                {t("notifications.automaticActions.addMarkAsReadAction")}
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

          <View style={[styles.switchRow, { backgroundColor: Colors[colorScheme ?? "light"].backgroundSecondary }]}>
            <View style={styles.switchLabelContainer}>
              <ThemedText style={[styles.switchLabel, { color: Colors[colorScheme ?? "light"].text }]}>
                {t("notifications.automaticActions.addDeleteAction")}
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

          <View style={[styles.switchRow, { backgroundColor: Colors[colorScheme ?? "light"].backgroundSecondary }]}>
            <View style={styles.switchLabelContainer}>
              <ThemedText style={[styles.switchLabel, { color: Colors[colorScheme ?? "light"].text }]}>
                {t("notifications.automaticActions.addOpenNotificationAction")}
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
        </View>

        {/* Actions Selector - Prima riga */}
        <View style={styles.field}>
          <NotificationActionsSelector
            actions={actions}
            onActionsChange={setActions}
            webhookOptions={webhookOptions}
            hasWebhooks={hasWebhooks}
          />
        </View>

        {/* Media Selector - Seconda riga */}
        <View style={styles.field}>
          <MediaAttachmentsSelector
            attachments={attachments}
            onAttachmentsChange={setAttachments}
          />
        </View>

        {/* Pulsanti di azione */}
        <View style={styles.buttonContainer}>
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
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  field: {
    marginBottom: 12,
  },
  textInput: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  loadingText: {
    fontSize: 14,
    textAlign: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    padding: 10,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  switchLabelContainer: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});
