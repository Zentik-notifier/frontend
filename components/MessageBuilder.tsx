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
import React, { useState } from "react";
import {
  StyleSheet,
  View,
} from "react-native";
import MediaAttachmentsSelector from "./MediaAttachmentsSelector";
import NotificationActionsSelector from "./NotificationActionsSelector";
import {
  Button,
  Card,
  Dialog,
  Portal,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { IconButton } from "./ui";
import ThemedInputSelect from "./ui/ThemedInputSelect";

interface MessageBuilderProps {
  onMessageSent?: () => void;
  initialBucketId?: string;
  compact?: boolean;
  isOfflineAuth?: boolean;
  isBackendUnreachable?: boolean;
}

export default function MessageBuilder({
  onMessageSent,
  initialBucketId,
  compact = true,
  isOfflineAuth = false,
  isBackendUnreachable = false,
}: MessageBuilderProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const [sending, setSending] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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
      setErrorMessage(t("notifications.titleRequired"));
      setShowErrorDialog(true);
      return;
    }

    if (!initialBucketId?.trim()) {
      setErrorMessage(t("notifications.targeting.bucketRequired"));
      setShowErrorDialog(true);
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
      setErrorMessage(errorMessage);
      setShowErrorDialog(true);
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
  const webhookOptions = (
    webhooksData?.userWebhooks || []
  ).map((webhook) => ({
    id: webhook.id,
    name: webhook.name,
    description: `${webhook.method} ${webhook.url}`,
  }));

  const hasWebhooks = webhookOptions.length > 0;

  // Priority options for the picker
  const priorityOptions = [
    {
      id: NotificationDeliveryType.Normal,
      name: t("compose.messageBuilder.normal"),
    },
    {
      id: NotificationDeliveryType.Critical,
      name: t("compose.messageBuilder.important"),
    },
    {
      id: NotificationDeliveryType.Silent,
      name: t("compose.messageBuilder.low"),
    },
  ];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.formContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        {/* Titolo */}
        <View style={styles.field}>
          <TextInput
            mode="outlined"
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            placeholder={t("notifications.content.titlePlaceholder")}
            label={t("notifications.content.title")}
            maxLength={100}
          />
        </View>

        {/* Sottotitolo */}
        <View style={styles.field}>
          <TextInput
            mode="outlined"
            style={styles.textInput}
            value={subtitle}
            onChangeText={setSubtitle}
            placeholder={t("notifications.content.subtitlePlaceholder")}
            label={t("notifications.content.subtitle")}
            maxLength={100}
          />
        </View>

        {/* Corpo del messaggio */}
        <View style={styles.field}>
          <TextInput
            mode="outlined"
            style={[styles.textInput, styles.textArea]}
            value={body}
            onChangeText={setBody}
            placeholder={t("notifications.content.bodyPlaceholder")}
            label={t("notifications.content.body")}
            multiline
            maxLength={500}
          />
        </View>

        {/* Priority Selector */}
        <View style={styles.field}>
          <ThemedInputSelect
            label={t("compose.messageBuilder.priority")}
            placeholder={t("compose.messageBuilder.normal")}
            options={priorityOptions}
            optionLabel="name"
            optionValue="id"
            selectedValue={priority}
            onValueChange={(value) => setPriority(value as NotificationDeliveryType)}
            isSearchable={false}
          />
        </View>

        {/* Automatic Actions Flags */}
        <View style={styles.field}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t("compose.messageBuilder.flags")}
          </Text>

          <View style={[styles.switchRow, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View style={styles.switchLabelContainer}>
              <Text variant="bodyMedium" style={[styles.switchLabel, { color: theme.colors.onSurface }]}>
                {t("notifications.automaticActions.addMarkAsReadAction")}
              </Text>
            </View>
            <Switch
              value={addMarkAsReadAction}
              onValueChange={setAddMarkAsReadAction}
            />
          </View>

          <View style={[styles.switchRow, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View style={styles.switchLabelContainer}>
              <Text variant="bodyMedium" style={[styles.switchLabel, { color: theme.colors.onSurface }]}>
                {t("notifications.automaticActions.addDeleteAction")}
              </Text>
            </View>
            <Switch
              value={addDeleteAction}
              onValueChange={setAddDeleteAction}
            />
          </View>

          <View style={[styles.switchRow, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View style={styles.switchLabelContainer}>
              <Text variant="bodyMedium" style={[styles.switchLabel, { color: theme.colors.onSurface }]}>
                {t("notifications.automaticActions.addOpenNotificationAction")}
              </Text>
            </View>
            <Switch
              value={addOpenNotificationAction}
              onValueChange={setAddOpenNotificationAction}
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
      </View>

      {/* Error Dialog */}
      <Portal>
        <Dialog
          visible={showErrorDialog}
          onDismiss={() => setShowErrorDialog(false)}
        >
          <Dialog.Title>{t("notifications.sendErrorTitle")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{errorMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowErrorDialog(false)}>
              {t("common.ok")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
