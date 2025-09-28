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
import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Dimensions,
  Modal,
  TouchableOpacity,
} from "react-native";
import MediaAttachmentsSelector from "./MediaAttachmentsSelector";
import NotificationActionsSelector from "./NotificationActionsSelector";
import {
  Button,
  Card,
  Switch,
  Text,
  TextInput,
  useTheme,
  Icon,
  Chip,
  Divider,
  Surface,
} from "react-native-paper";
import ThemedInputSelect from "./ui/ThemedInputSelect";

const { height: screenHeight } = Dimensions.get("window");

interface MessageBuilderProps {
  bucketId: string;
}

interface MessageStep {
  id: string;
  title: string;
  completed: boolean;
  optional: boolean;
}

export default function MessageBuilder({ bucketId }: MessageBuilderProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [createMessageMutation] = useCreateMessageMutation({
    refetchQueries: [GetNotificationsDocument],
  });

  // GraphQL queries for data
  const { data: webhooksData } = useGetUserWebhooksQuery();

  // Functions for visibility management
  const handleOpen = () => setVisible(true);

  // State for form fields
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [actions, setActions] = useState<NotificationActionDto[]>([]);
  const [attachments, setAttachments] = useState<NotificationAttachmentDto[]>(
    []
  );

  // Priority state
  const [priority, setPriority] = useState<NotificationDeliveryType>(
    NotificationDeliveryType.Normal
  );

  // Automatic actions flags
  const [addMarkAsReadAction, setAddMarkAsReadAction] = useState(false);
  const [addDeleteAction, setAddDeleteAction] = useState(false);
  const [addOpenNotificationAction, setAddOpenNotificationAction] =
    useState(false);

  // Steps tracking
  const [steps, setSteps] = useState<MessageStep[]>([
    {
      id: "basic",
      title: t("compose.messageBuilder.steps.basic"),
      completed: false,
      optional: false,
    },
    {
      id: "priority",
      title: t("compose.messageBuilder.steps.priority"),
      completed: false,
      optional: false,
    },
    {
      id: "actions",
      title: t("compose.messageBuilder.steps.actions"),
      completed: false,
      optional: true,
    },
    {
      id: "attachments",
      title: t("compose.messageBuilder.steps.attachments"),
      completed: false,
      optional: true,
    },
    {
      id: "flags",
      title: t("compose.messageBuilder.steps.flags"),
      completed: false,
      optional: true,
    },
  ]);

  // Update steps completion
  const updateSteps = useCallback(() => {
    setSteps((prev) =>
      prev.map((step) => {
        switch (step.id) {
          case "basic":
            return { ...step, completed: title.trim().length > 0 };
          case "priority":
            return { ...step, completed: true }; // Always completed as it has a default
          case "actions":
            return { ...step, completed: actions.length > 0 };
          case "attachments":
            return { ...step, completed: attachments.length > 0 };
          case "flags":
            return {
              ...step,
              completed:
                addMarkAsReadAction ||
                addDeleteAction ||
                addOpenNotificationAction,
            };
          default:
            return step;
        }
      })
    );
  }, [
    title,
    actions,
    attachments,
    addMarkAsReadAction,
    addDeleteAction,
    addOpenNotificationAction,
  ]);

  // Update steps when dependencies change
  React.useEffect(() => {
    updateSteps();
  }, [updateSteps]);

  const sendMessage = async () => {
    if (!title.trim()) {
      setErrorMessage(t("notifications.titleRequired"));
      setShowErrorDialog(true);
      return;
    }

    if (!bucketId?.trim()) {
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
      handleDismiss();
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

  const handleDismiss = () => {
    resetForm();
    setVisible(false);
  };

  // Helper function to build the message payload for GraphQL mutation
  const buildMessagePayload = (): CreateMessageDto => {
    const message: CreateMessageDto = {
      title: title.trim(),
      deliveryType: priority,
      bucketId: bucketId,
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
  const webhookOptions = (webhooksData?.userWebhooks || []).map((webhook) => ({
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

  const completedSteps = steps.filter((s) => s.completed).length;
  const totalRequiredSteps = steps.filter((s) => !s.optional).length;

  return (
    <>
      {/* Open Button */}
      <Button
        mode="contained"
        onPress={handleOpen}
        icon="plus-circle-outline"
        style={styles.openButton}
      >
        {t("buckets.composeMessage")}
      </Button>

      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleDismiss}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleDismiss}
                accessibilityLabel={t("common.close")}
              >
                <Icon source="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
              <View style={styles.titleContainer}>
                <Text variant="headlineSmall" style={styles.title}>
                  {t("compose.messageBuilder.title")}
                </Text>
                <Text variant="bodyMedium" style={styles.progress}>
                  {completedSteps}/{steps.length}{" "}
                  {t("compose.messageBuilder.stepsCompleted")}
                </Text>
              </View>
            </View>

            {/* Progress indicator */}
            <View style={styles.stepsContainer}>
              {steps.map((step, index) => (
                <View key={step.id} style={styles.stepContainer}>
                  <Chip
                    mode={step.completed ? "flat" : "outlined"}
                    compact
                    style={[
                      styles.stepChip,
                      step.completed && {
                        backgroundColor: theme.colors.primaryContainer,
                      },
                    ]}
                    textStyle={[
                      styles.stepChipText,
                      step.completed && {
                        color: theme.colors.onPrimaryContainer,
                      },
                    ]}
                  >
                    {step.title}
                  </Chip>
                  {index < steps.length - 1 && (
                    <Icon
                      source="chevron-right"
                      size={16}
                      color={theme.colors.onSurfaceVariant}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Basic Information */}
            <Card style={styles.sectionCard} mode="outlined">
              <Card.Content>
                <View style={styles.sectionHeader}>
                  <Icon source="text" size={20} color={theme.colors.primary} />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    {t("compose.messageBuilder.sections.basic")}
                  </Text>
                  {steps.find((s) => s.id === "basic")?.completed && (
                    <Icon
                      source="check-circle"
                      size={20}
                      color={theme.colors.primary}
                    />
                  )}
                </View>

                {/* Titolo */}
                <TextInput
                  mode="outlined"
                  style={styles.textInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t("notifications.content.titlePlaceholder")}
                  label={t("notifications.content.title")}
                  maxLength={100}
                />

                {/* Sottotitolo */}
                <TextInput
                  mode="outlined"
                  style={styles.textInput}
                  value={subtitle}
                  onChangeText={setSubtitle}
                  placeholder={t("notifications.content.subtitlePlaceholder")}
                  label={t("notifications.content.subtitle")}
                  maxLength={100}
                />

                {/* Corpo del messaggio */}
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
              </Card.Content>
            </Card>

            {/* Priority */}
            <Card style={styles.sectionCard} mode="outlined">
              <Card.Content>
                <View style={styles.sectionHeader}>
                  <Icon source="flag" size={20} color={theme.colors.primary} />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    {t("compose.messageBuilder.sections.priority")}
                  </Text>
                  {steps.find((s) => s.id === "priority")?.completed && (
                    <Icon
                      source="check-circle"
                      size={20}
                      color={theme.colors.primary}
                    />
                  )}
                </View>

                <ThemedInputSelect
                  label={t("compose.messageBuilder.priority")}
                  placeholder={t("compose.messageBuilder.normal")}
                  options={priorityOptions}
                  optionLabel="name"
                  optionValue="id"
                  selectedValue={priority}
                  onValueChange={(value) =>
                    setPriority(value as NotificationDeliveryType)
                  }
                  isSearchable={false}
                />
              </Card.Content>
            </Card>

            {/* Actions */}
            <Card style={styles.sectionCard} mode="outlined">
              <Card.Content>
                <View style={styles.sectionHeader}>
                  <Icon
                    source="gesture-tap"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    {t("compose.messageBuilder.sections.actions")}
                  </Text>
                  {steps.find((s) => s.id === "actions")?.completed && (
                    <Icon
                      source="check-circle"
                      size={20}
                      color={theme.colors.primary}
                    />
                  )}
                </View>

                <NotificationActionsSelector
                  actions={actions}
                  onActionsChange={setActions}
                  webhookOptions={webhookOptions}
                  hasWebhooks={hasWebhooks}
                />
              </Card.Content>
            </Card>

            {/* Attachments */}
            <Card style={styles.sectionCard} mode="outlined">
              <Card.Content>
                <View style={styles.sectionHeader}>
                  <Icon
                    source="attachment"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    {t("compose.messageBuilder.sections.attachments")}
                  </Text>
                  {steps.find((s) => s.id === "attachments")?.completed && (
                    <Icon
                      source="check-circle"
                      size={20}
                      color={theme.colors.primary}
                    />
                  )}
                </View>

                <MediaAttachmentsSelector
                  attachments={attachments}
                  onAttachmentsChange={setAttachments}
                />
              </Card.Content>
            </Card>

            {/* Flags */}
            <Card style={styles.sectionCard} mode="outlined">
              <Card.Content>
                <View style={styles.sectionHeader}>
                  <Icon source="cog" size={20} color={theme.colors.primary} />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    {t("compose.messageBuilder.sections.flags")}
                  </Text>
                  {steps.find((s) => s.id === "flags")?.completed && (
                    <Icon
                      source="check-circle"
                      size={20}
                      color={theme.colors.primary}
                    />
                  )}
                </View>

                <Surface
                  style={[
                    styles.switchRow,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                >
                  <View style={styles.switchLabelContainer}>
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.switchLabel,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {t("notifications.automaticActions.addMarkAsReadAction")}
                    </Text>
                  </View>
                  <Switch
                    value={addMarkAsReadAction}
                    onValueChange={setAddMarkAsReadAction}
                  />
                </Surface>

                <Surface
                  style={[
                    styles.switchRow,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                >
                  <View style={styles.switchLabelContainer}>
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.switchLabel,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {t("notifications.automaticActions.addDeleteAction")}
                    </Text>
                  </View>
                  <Switch
                    value={addDeleteAction}
                    onValueChange={setAddDeleteAction}
                  />
                </Surface>

                <Surface
                  style={[
                    styles.switchRow,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                >
                  <View style={styles.switchLabelContainer}>
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.switchLabel,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {t(
                        "notifications.automaticActions.addOpenNotificationAction"
                      )}
                    </Text>
                  </View>
                  <Switch
                    value={addOpenNotificationAction}
                    onValueChange={setAddOpenNotificationAction}
                  />
                </Surface>
              </Card.Content>
            </Card>
          </ScrollView>

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={handleDismiss}
              style={styles.actionButton}
            >
              {t("common.cancel")}
            </Button>
            <Button
              mode="outlined"
              onPress={resetForm}
              style={styles.actionButton}
            >
              {t("notifications.resetForm")}
            </Button>
            <Button
              mode="contained"
              onPress={sendMessage}
              disabled={
              sending || !title.trim()
              }
              loading={sending}
              style={styles.actionButton}
            >
              {t("notifications.sendButton")}
            </Button>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  openButton: {
    margin: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    maxHeight: screenHeight * 0.9,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  closeButton: {
    padding: 8,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontWeight: "600",
  },
  progress: {
    opacity: 0.7,
  },
  stepsContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepChip: {
    height: 28,
  },
  stepChipText: {
    fontSize: 12,
  },
  stepSeparator: {
    marginHorizontal: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  errorModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  errorModalContainer: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    maxWidth: 300,
  },
  errorTitle: {
    marginBottom: 16,
    textAlign: "center",
  },
  errorMessage: {
    marginBottom: 20,
    textAlign: "center",
  },
  errorButton: {
    alignSelf: "center",
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    flex: 1,
    fontWeight: "600",
  },
  textInput: {
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
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
