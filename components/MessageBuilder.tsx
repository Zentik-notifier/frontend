import {
  CreateMessageDto,
  GetNotificationsDocument,
  MessageFragment,
  NotificationDeliveryType,
  NotificationActionDto,
  NotificationAttachmentDto,
  useCreateMessageMutation,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React, { useCallback, useRef, useState } from "react";
import { StyleSheet, View, Alert, ScrollView, Dimensions } from "react-native";
import {
  Button,
  Text,
  TextInput,
  useTheme,
  Switch,
  Modal,
  Portal,
  Icon,
  TouchableRipple,
  List,
} from "react-native-paper";
import ThemedInputSelect from "./ui/ThemedInputSelect";
import NotificationActionsSelector from "./NotificationActionsSelector";
import MediaAttachmentsSelector from "./MediaAttachmentsSelector";

interface MessageBuilderProps {
  bucketId: string;
  trigger: (show: () => void) => React.ReactNode;
}

export default function MessageBuilder({
  bucketId,
  trigger,
}: MessageBuilderProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const deviceHeight = Dimensions.get("window").height;
  const [visible, setVisible] = useState(false);
  const showModal = useCallback(() => setVisible(true), []);
  const hideModal = useCallback(() => setVisible(false), []);
  const [messageData, setMessageData] = useState<Partial<MessageFragment>>({
    title: "",
    subtitle: "",
    body: "",
    deliveryType: NotificationDeliveryType.Normal,
    actions: [],
    attachments: [],
  });
  // Using local modal, no sheet ref

  // Additional state for action flags and snooze times
  const [addMarkAsReadAction, setAddMarkAsReadAction] = useState(false);
  const [addDeleteAction, setAddDeleteAction] = useState(false);
  const [addOpenNotificationAction, setAddOpenNotificationAction] =
    useState(false);
  const [snoozeTimes, setSnoozeTimes] = useState<number[]>([]);
  const [snoozeTimeInput, setSnoozeTimeInput] = useState<string>("");

  const [createMessage, { loading: isCreating }] = useCreateMessageMutation();

  // Snooze time management
  const addSnoozeTime = useCallback(() => {
    const newTime = parseInt(snoozeTimeInput, 10);
    if (!isNaN(newTime) && newTime > 0 && !snoozeTimes.includes(newTime)) {
      setSnoozeTimes((prev) => [...prev, newTime].sort((a, b) => a - b));
      setSnoozeTimeInput("");
    }
  }, [snoozeTimeInput, snoozeTimes]);

  const removeSnoozeTime = useCallback((time: number) => {
    setSnoozeTimes((prev) => prev.filter((t) => t !== time));
  }, []);

  const handleSaveMessage = useCallback(async () => {
    try {
      const createMessageDto: CreateMessageDto = {
        bucketId,
        title: messageData.title!,
        subtitle: messageData.subtitle,
        body: messageData.body,
        deliveryType:
          messageData.deliveryType ?? NotificationDeliveryType.Normal,
        actions: messageData.actions,
        attachments: messageData.attachments,
        // Add automatic actions flags
        addMarkAsReadAction,
        addDeleteAction,
        addOpenNotificationAction,
        snoozes: snoozeTimes,
      };

      await createMessage({
        variables: { input: createMessageDto },
        refetchQueries: [GetNotificationsDocument],
      });

      // Reset form
      setMessageData({
        title: "",
        subtitle: "",
        body: "",
        deliveryType: NotificationDeliveryType.Normal,
        actions: [],
        attachments: [],
      });
      // Reset action flags and snooze times
      setAddMarkAsReadAction(false);
      setAddDeleteAction(false);
      setAddOpenNotificationAction(false);
      setSnoozeTimes([]);

      hideModal();
    } catch (error) {
      console.error("Error creating message:", error);
    }
  }, [bucketId, messageData, createMessage, hideModal]);

  const handleResetForm = useCallback(() => {
    setMessageData({
      title: "",
      subtitle: "",
      body: "",
      deliveryType: NotificationDeliveryType.Normal,
      actions: [],
      attachments: [],
    });
    // Reset action flags and snooze times
    setAddMarkAsReadAction(false);
    setAddDeleteAction(false);
    setAddOpenNotificationAction(false);
    setSnoozeTimes([]);
  }, []);

  const deliveryTypeOptions = [
    {
      value: NotificationDeliveryType.Normal,
      label: t("compose.messageBuilder.deliveryType.normal" as any),
    },
    {
      value: NotificationDeliveryType.Critical,
      label: t("compose.messageBuilder.deliveryType.critical" as any),
    },
    {
      value: NotificationDeliveryType.Silent,
      label: t("compose.messageBuilder.deliveryType.silent" as any),
    },
  ];

  const styles = StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      height: 60,
      borderBottomWidth: 1,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "600",
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    triggerButton: {
      margin: 16,
    },
    formContainer: {
      padding: 16,
      marginBottom: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceVariant,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      marginBottom: 8,
      fontWeight: "600",
      color: theme.colors.onSurface,
    },
    textInput: {
      backgroundColor: theme.colors.surface,
    },
    multilineInput: {
      minHeight: 100,
    },
    sectionTitle: {
      marginBottom: 8,
      fontWeight: "600",
      color: theme.colors.onSurface,
    },
    sectionDescription: {
      marginBottom: 16,
      opacity: 0.7,
      color: theme.colors.onSurface,
    },
    switchContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
    },
    switchLabel: {
      flex: 1,
      fontWeight: "500",
      color: theme.colors.onSurface,
    },
    footer: {
      borderTopWidth: 1,
      paddingHorizontal: 20,
      paddingVertical: 12,
      flexDirection: "row",
      gap: 12,
    },
    footerButton: {
      flex: 1,
    },
  });

  return (
    <>
      {trigger(showModal)}
      <Portal>
        <Modal
          visible={visible}
          onDismiss={hideModal}
          contentContainerStyle={{
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            marginHorizontal: 16,
            marginVertical: 24,
            maxHeight: deviceHeight * 0.8,
          }}
          dismissable={false}
          dismissableBackButton
        >
          <View
            style={[
              styles.header,
              {
                borderBottomColor: theme.colors.outline,
                backgroundColor: "transparent",
              },
            ]}
          >
            <View style={styles.headerLeft}>
              <Icon source="message" size={24} color={theme.colors.primary} />
              <Text style={styles.headerTitle}>
                {t("compose.messageBuilder.createMessage")}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableRipple
                style={styles.closeButton}
                onPress={hideModal}
                borderless
              >
                <Icon source="close" size={20} color={theme.colors.onSurface} />
              </TouchableRipple>
            </View>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.formContainer}>
              {/* Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("compose.messageBuilder.title")} *
                </Text>
                <TextInput
                  mode="outlined"
                  value={messageData.title}
                  onChangeText={(text) =>
                    setMessageData((prev) => ({ ...prev, title: text }))
                  }
                  placeholder={t("compose.messageBuilder.titlePlaceholder")}
                  style={styles.textInput}
                />
              </View>

              {/* Body */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("compose.messageBuilder.body")} *
                </Text>
                <TextInput
                  mode="outlined"
                  value={messageData.body ?? ""}
                  onChangeText={(text) =>
                    setMessageData((prev) => ({ ...prev, body: text }))
                  }
                  placeholder={t("compose.messageBuilder.bodyPlaceholder")}
                  multiline
                  numberOfLines={4}
                  style={[styles.textInput, styles.multilineInput]}
                />
              </View>
            </View>

            {/* More - Collapsible */}
            <List.Section>
              <List.Accordion
                title={t("compose.messageBuilder.more" as any)}
                description={t("compose.messageBuilder.moreDescription" as any)}
                left={(props) => (
                  <List.Icon {...props} icon="dots-horizontal" />
                )}
              >
                <View style={styles.formContainer}>
                  {/* Subtitle */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      {t("compose.messageBuilder.subtitle")}
                    </Text>
                    <TextInput
                      mode="outlined"
                      value={messageData.subtitle ?? ""}
                      onChangeText={(text) =>
                        setMessageData((prev) => ({ ...prev, subtitle: text }))
                      }
                      placeholder={t(
                        "compose.messageBuilder.subtitlePlaceholder"
                      )}
                      style={styles.textInput}
                    />
                  </View>

                  {/* Delivery Type */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      {t("notifications.settings.deliveryType")}
                    </Text>
                    <ThemedInputSelect
                      options={deliveryTypeOptions}
                      optionLabel="label"
                      optionValue="value"
                      selectedValue={messageData.deliveryType}
                      onValueChange={(value) =>
                        setMessageData((prev) => ({
                          ...prev,
                          deliveryType: value as NotificationDeliveryType,
                        }))
                      }
                      placeholder={t(
                        "compose.messageBuilder.deliveryTypePlaceholder"
                      )}
                      isSearchable={false}
                      disabled={false}
                    />
                  </View>

                  {/* Snoozes */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      {t("notifications.automaticActions.snoozeTimes")}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <TextInput
                        mode="outlined"
                        value={snoozeTimeInput}
                        onChangeText={setSnoozeTimeInput}
                        placeholder={t(
                          "notifications.automaticActions.snoozeTimePlaceholder"
                        )}
                        keyboardType="numeric"
                        style={[styles.textInput, { flex: 1 }]}
                      />
                      <Button mode="contained" onPress={addSnoozeTime}>
                        {t("common.add")}
                      </Button>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      {snoozeTimes.map((m) => (
                        <TouchableRipple
                          key={m}
                          onPress={() => removeSnoozeTime(m)}
                          borderless
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 16,
                            backgroundColor: theme.colors.secondaryContainer,
                          }}
                        >
                          <Text
                            style={{ color: theme.colors.onSecondaryContainer }}
                          >
                            {m}m ✕
                          </Text>
                        </TouchableRipple>
                      ))}
                    </View>
                  </View>
                </View>
              </List.Accordion>
            </List.Section>

            {/* Attachments - Collapsible */}
            <List.Section>
              <List.Accordion
                title={t("compose.messageBuilder.attachments")}
                description={t("compose.messageBuilder.attachmentsDescription")}
                left={(props) => <List.Icon {...props} icon="paperclip" />}
              >
                <View style={styles.formContainer}>
                  <MediaAttachmentsSelector
                    attachments={messageData.attachments || []}
                    onAttachmentsChange={(attachments) =>
                      setMessageData((prev) => ({
                        ...prev,
                        attachments: attachments as any,
                      }))
                    }
                    label={t("notifications.attachments.title")}
                  />
                </View>
              </List.Accordion>
            </List.Section>

            {/* Actions - Collapsible */}
            <List.Section>
              <List.Accordion
                title={t("compose.messageBuilder.actions")}
                description={t("compose.messageBuilder.actionsDescription")}
                left={(props) => <List.Icon {...props} icon="cog" />}
              >
                <View style={styles.formContainer}>
                  <View style={styles.switchContainer}>
                    <Text style={styles.switchLabel}>
                      {t("notifications.automaticActions.addMarkAsReadAction")}
                    </Text>
                    <Switch
                      value={addMarkAsReadAction}
                      onValueChange={setAddMarkAsReadAction}
                    />
                  </View>

                  <View style={styles.switchContainer}>
                    <Text style={styles.switchLabel}>
                      {t("notifications.automaticActions.addDeleteAction")}
                    </Text>
                    <Switch
                      value={addDeleteAction}
                      onValueChange={setAddDeleteAction}
                    />
                  </View>

                  <View style={styles.switchContainer}>
                    <Text style={styles.switchLabel}>
                      {t(
                        "notifications.automaticActions.addOpenNotificationAction"
                      )}
                    </Text>
                    <Switch
                      value={addOpenNotificationAction}
                      onValueChange={setAddOpenNotificationAction}
                    />
                  </View>

                  <NotificationActionsSelector
                    actions={messageData.actions || []}
                    onActionsChange={(actions) =>
                      setMessageData((prev) => ({
                        ...prev,
                        actions: actions as any,
                      }))
                    }
                    label={t("notifications.actions.title")}
                  />
                </View>
              </List.Accordion>
            </List.Section>
          </ScrollView>

          <View
            style={[styles.footer, { borderTopColor: theme.colors.outline }]}
          >
            <Button
              mode="outlined"
              onPress={handleResetForm}
              style={styles.footerButton}
            >
              {t("common.reset")}
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveMessage}
              loading={isCreating}
              disabled={!messageData.title?.trim()}
              style={styles.footerButton}
            >
              {t("common.save")}
            </Button>
          </View>
        </Modal>
      </Portal>
    </>
  );
}
