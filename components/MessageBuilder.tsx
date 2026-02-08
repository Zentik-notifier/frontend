import {
  CreateMessageDto,
  GetNotificationsDocument,
  MessageFragment,
  NotificationDeliveryType,
  MediaType,
  useCreateMessageMutation,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  Button,
  Icon,
  IconButton,
  Switch,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { Portal } from "react-native-paper";
import * as DocumentPicker from "expo-document-picker";
import { settingsService } from "@/services/settings-service";
import MediaAttachmentsSelector from "./MediaAttachmentsSelector";
import NotificationActionsSelector from "./NotificationActionsSelector";
import NumberListInput from "./ui/NumberListInput";
import Selector, { SelectorOption } from "./ui/Selector";

interface MessageBuilderProps {
  bucketId: string;
}

export default function MessageBuilder({ bucketId }: MessageBuilderProps) {
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
  const [postponeTimes, setPostponeTimes] = useState<number[]>([]);
  const [scheduleSendEnabled, setScheduleSendEnabled] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState("");
  const [remindEveryMinutes, setRemindEveryMinutes] = useState("");
  const [maxReminders, setMaxReminders] = useState("");
  const [optionsExpanded, setOptionsExpanded] = useState(false);

  const [createMessage, { loading: isCreating }] = useCreateMessageMutation();

  const handleUploadImages = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: "image/*",
        multiple: true,
      } as any);

      if ((result as any).canceled) {
        return;
      }

      const apiUrl = settingsService.getApiUrl();
      const token = settingsService.getAuthData().accessToken;

      if (!apiUrl || !token) {
        Alert.alert(
          t("common.error"),
          t("notifications.attachments.unableToUpload" as any)
        );
        return;
      }

      const assets = (result as any).assets || [result];

      const uploadPromises = assets
        .filter((asset: any) => asset?.uri)
        .map(async (asset: any) => {
          const formData: any = new FormData();

          if (Platform.OS === "web") {
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            formData.append("file", blob, asset.name || "image.jpg");
          } else {
            formData.append("file", {
              uri: asset.uri,
              name: asset.name || "image.jpg",
              type: asset.mimeType || "image/jpeg",
            });
          }

          const filename = asset.name || `image-${Date.now()}.jpg`;
          formData.append("filename", filename);
          formData.append("mediaType", MediaType.Image);

          const response = await fetch(`${apiUrl}/api/v1/attachments/upload`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          if (!response.ok) {
            throw new Error(
              `Upload failed: ${response.status} ${response.statusText}`
            );
          }

          const attachment = await response.json();
          return attachment;
        });

      const uploaded = (await Promise.all(uploadPromises)).filter(
        Boolean
      ) as any[];

      if (!uploaded.length) {
        return;
      }

      setMessageData((prev) => ({
        ...prev,
        attachments: [
          ...(prev.attachments || []),
          ...uploaded.map((attachment) => ({
            attachmentUuid: attachment.id,
            mediaType: attachment.mediaType || MediaType.Image,
            name: attachment.filename || attachment.name,
          })),
        ] as any,
      }));
    } catch (error) {
      console.error("Error uploading images:", error);
      Alert.alert(
        t("common.error"),
        t("notifications.attachments.uploadError" as any)
      );
    }
  }, [t]);

  const handleSaveMessage = useCallback(async () => {
    try {
      const minutes = scheduleSendEnabled && delayMinutes.trim() ? parseInt(delayMinutes, 10) : 0;
      const scheduledSendAt =
        minutes > 0
          ? new Date(Date.now() + minutes * 60 * 1000).toISOString()
          : undefined;

      const remindEvery =
        remindEveryMinutes.trim() !== ""
          ? parseInt(remindEveryMinutes, 10)
          : undefined;
      const maxRemindersNum =
        maxReminders.trim() !== "" ? parseInt(maxReminders, 10) : undefined;

      const createMessageDto: CreateMessageDto = {
        bucketId,
        title: messageData.title!,
        subtitle: messageData.subtitle,
        body: messageData.body,
        deliveryType:
          messageData.deliveryType ?? NotificationDeliveryType.Normal,
        actions: messageData.actions,
        attachments: messageData.attachments,
        addMarkAsReadAction,
        addDeleteAction,
        addOpenNotificationAction,
        snoozes: snoozeTimes,
        postpones: postponeTimes,
        ...(scheduledSendAt && { scheduledSendAt }),
        ...(remindEvery != null && remindEvery >= 1 && { remindEveryMinutes: remindEvery }),
        ...(maxRemindersNum != null && maxRemindersNum >= 1 && { maxReminders: maxRemindersNum }),
      };

      console.log(`Creating new message: ${JSON.stringify(createMessageDto)}`);

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
      setAddMarkAsReadAction(false);
      setAddDeleteAction(false);
      setAddOpenNotificationAction(false);
      setSnoozeTimes([]);
      setPostponeTimes([]);
      setScheduleSendEnabled(false);
      setDelayMinutes("");
      setRemindEveryMinutes("");
      setMaxReminders("");

      hideModal();
    } catch (error) {
      console.error("Error creating message:", error);
    }
  }, [
    bucketId,
    messageData,
    addMarkAsReadAction,
    addDeleteAction,
    addOpenNotificationAction,
    snoozeTimes,
    postponeTimes,
    scheduleSendEnabled,
    delayMinutes,
    remindEveryMinutes,
    maxReminders,
    createMessage,
    hideModal,
  ]);

  const handleQuickSend = useCallback(async () => {
    const title = messageData.title?.trim();
    if (!title) return;
    try {
      await createMessage({
        variables: {
          input: {
            bucketId,
            title,
            deliveryType: NotificationDeliveryType.Normal,
          },
        },
        refetchQueries: [GetNotificationsDocument],
      });
      setMessageData((prev) => ({ ...prev, title: "" }));
    } catch (error) {
      console.error("Error creating message:", error);
    }
  }, [bucketId, messageData.title, createMessage]);

  const handleResetForm = useCallback(() => {
    setMessageData({
      title: "",
      subtitle: "",
      body: "",
      deliveryType: NotificationDeliveryType.Normal,
      actions: [],
      attachments: [],
    });
    setAddMarkAsReadAction(false);
    setAddDeleteAction(false);
    setAddOpenNotificationAction(false);
    setSnoozeTimes([]);
    setPostponeTimes([]);
    setScheduleSendEnabled(false);
    setDelayMinutes("");
    setRemindEveryMinutes("");
    setMaxReminders("");
  }, []);

  const deliveryTypeOptions: SelectorOption[] = [
    {
      id: NotificationDeliveryType.Normal,
      name: t("compose.messageBuilder.deliveryType.normal" as any),
    },
    {
      id: NotificationDeliveryType.Critical,
      name: t("compose.messageBuilder.deliveryType.critical" as any),
    },
    {
      id: NotificationDeliveryType.Silent,
      name: t("compose.messageBuilder.deliveryType.silent" as any),
    },
  ];

  const styles = StyleSheet.create({
    drawerOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    drawerBackdrop: {
      flex: 1,
    },
    drawer: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: deviceHeight * 0.88,
    },
    drawerHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      alignSelf: "center",
      marginTop: 12,
      marginBottom: 8,
    },
    drawerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    drawerTitle: {
      fontSize: 18,
      fontWeight: "600",
    },
    closeButton: {
      padding: 4,
    },
    drawerScroll: {
      maxHeight: deviceHeight * 0.75,
    },
    composer: {
      padding: 16,
      paddingBottom: 8,
    },
    composerTitle: {
      marginBottom: 12,
      backgroundColor: theme.colors.surface,
    },
    composerBody: {
      marginBottom: 12,
      minHeight: 80,
      backgroundColor: theme.colors.surface,
    },
    sendButton: {
      marginTop: 4,
    },
    optionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderTopWidth: 1,
    },
    optionsRowInner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
    },
    optionsRowText: {
      flex: 1,
      fontSize: 15,
      fontWeight: "500",
    },
    optionsContent: {
      padding: 16,
      paddingTop: 8,
      paddingBottom: 24,
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
    sectionDescription: {
      marginBottom: 8,
      opacity: 0.7,
      color: theme.colors.onSurface,
      fontSize: 13,
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
    uploadButton: {
      marginBottom: 8,
    },
    resetButton: {
      marginTop: 8,
    },
    inlineComposeBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
      borderTopWidth: 1,
      elevation: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    inlineComposeInput: {
      flex: 1,
      minHeight: 44,
      fontSize: 16,
    },
    inlineComposeButton: {
      margin: 0,
    },
  });

  return (
    <>
      <View
        style={[
          styles.inlineComposeBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.outline,
          },
        ]}
      >
        <TextInput
          mode="outlined"
          value={messageData.title ?? ""}
          onChangeText={(text) =>
            setMessageData((prev) => ({ ...prev, title: text }))
          }
          placeholder={t("compose.messageBuilder.titlePlaceholder")}
          style={[styles.inlineComposeInput, { backgroundColor: theme.colors.surfaceVariant }]}
          outlineStyle={{ borderRadius: 22 }}
          dense
        />
        <IconButton
          icon="dots-horizontal"
          size={24}
          onPress={showModal}
          iconColor={theme.colors.primary}
          style={styles.inlineComposeButton}
        />
        <IconButton
          icon="send"
          size={24}
          onPress={handleQuickSend}
          disabled={!messageData.title?.trim() || isCreating}
          loading={isCreating}
          iconColor={theme.colors.primary}
          style={styles.inlineComposeButton}
        />
      </View>
      <Portal>
        <Modal
          visible={visible}
          onRequestClose={hideModal}
          transparent
          animationType="slide"
        >
          <View style={styles.drawerOverlay}>
            <TouchableWithoutFeedback onPress={hideModal}>
              <View style={styles.drawerBackdrop} />
            </TouchableWithoutFeedback>
            <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "padding" : undefined}
                  style={[styles.drawer, { backgroundColor: theme.colors.surface }]}
                >
                  <View style={[styles.drawerHandle, { backgroundColor: theme.colors.outlineVariant }]} />
                  <View style={[styles.drawerHeader, { borderBottomColor: theme.colors.outline }]}>
                    <Text style={[styles.drawerTitle, { color: theme.colors.onSurface }]}>
                      {t("compose.messageBuilder.createMessage")}
                    </Text>
                    <TouchableRipple onPress={hideModal} borderless style={styles.closeButton}>
                      <Icon source="close" size={24} color={theme.colors.onSurface} />
                    </TouchableRipple>
                  </View>

                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    style={styles.drawerScroll}
                  >
                    <View style={styles.composer}>
                      <TextInput
                        mode="outlined"
                        value={messageData.title}
                        onChangeText={(text) =>
                          setMessageData((prev) => ({ ...prev, title: text }))
                        }
                        placeholder={t("compose.messageBuilder.titlePlaceholder")}
                        style={styles.composerTitle}
                      />
                      <TextInput
                        mode="outlined"
                        value={messageData.body ?? ""}
                        onChangeText={(text) =>
                          setMessageData((prev) => ({ ...prev, body: text }))
                        }
                        placeholder={t("compose.messageBuilder.bodyPlaceholder")}
                        multiline
                        numberOfLines={3}
                        style={styles.composerBody}
                      />
                      <Button
                        mode="contained"
                        onPress={handleSaveMessage}
                        loading={isCreating}
                        disabled={!messageData.title?.trim()}
                        icon="send"
                        style={styles.sendButton}
                      >
                        {t("compose.messageBuilder.createMessage")}
                      </Button>
                    </View>

                    <TouchableRipple
                      onPress={() => setOptionsExpanded((e) => !e)}
                      style={[styles.optionsRow, { borderTopColor: theme.colors.outline }]}
                    >
                      <View style={styles.optionsRowInner}>
                        <Icon source="dots-horizontal" size={20} color={theme.colors.primary} />
                        <Text style={[styles.optionsRowText, { color: theme.colors.onSurface }]}>
                          {t("compose.messageBuilder.more" as any)}
                        </Text>
                        <Icon
                          source={optionsExpanded ? "chevron-up" : "chevron-down"}
                          size={24}
                          color={theme.colors.onSurfaceVariant}
                        />
                      </View>
                    </TouchableRipple>

                    {optionsExpanded && (
                      <View style={styles.optionsContent}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>{t("compose.messageBuilder.subtitle")}</Text>
                          <TextInput
                            mode="outlined"
                            value={messageData.subtitle ?? ""}
                            onChangeText={(text) => setMessageData((prev) => ({ ...prev, subtitle: text }))}
                            placeholder={t("compose.messageBuilder.subtitlePlaceholder")}
                            style={styles.textInput}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>{t("notifications.settings.deliveryType")}</Text>
                          <Selector
                            options={deliveryTypeOptions}
                            selectedValue={messageData.deliveryType}
                            onValueChange={(value) =>
                              setMessageData((prev) => ({ ...prev, deliveryType: value as NotificationDeliveryType }))
                            }
                            placeholder={t("compose.messageBuilder.deliveryTypePlaceholder")}
                            isSearchable={false}
                            disabled={false}
                          />
                        </View>
                        <NumberListInput
                          label={t("notifications.automaticActions.snoozeTimes")}
                          values={snoozeTimes}
                          onValuesChange={setSnoozeTimes}
                          placeholder={t("notifications.automaticActions.snoozeTimePlaceholder")}
                          unit="m"
                          min={1}
                          max={9999}
                        />
                        <NumberListInput
                          label={t("notifications.automaticActions.postponeTimes")}
                          values={postponeTimes}
                          onValuesChange={setPostponeTimes}
                          placeholder={t("notifications.automaticActions.postponeTimePlaceholder")}
                          unit="m"
                          min={1}
                          max={9999}
                        />
                        <View style={styles.inputGroup}>
                          <View style={styles.switchContainer}>
                            <Text style={styles.switchLabel}>{t("compose.messageBuilder.scheduleSend")}</Text>
                            <Switch value={scheduleSendEnabled} onValueChange={setScheduleSendEnabled} />
                          </View>
                          {scheduleSendEnabled && (
                            <>
                              <Text style={styles.sectionDescription}>
                                {t("compose.messageBuilder.scheduleSendDescription")}
                              </Text>
                              <TextInput
                                mode="outlined"
                                value={delayMinutes}
                                onChangeText={setDelayMinutes}
                                placeholder={t("compose.messageBuilder.delayMinutesPlaceholder")}
                                keyboardType="number-pad"
                                style={styles.textInput}
                              />
                            </>
                          )}
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.switchLabel}>{t("compose.messageBuilder.remindEveryMinutes")}</Text>
                          <Text style={styles.sectionDescription}>
                            {t("compose.messageBuilder.remindEveryMinutesDescription")}
                          </Text>
                          <TextInput
                            mode="outlined"
                            value={remindEveryMinutes}
                            onChangeText={setRemindEveryMinutes}
                            placeholder={t("compose.messageBuilder.remindEveryMinutesPlaceholder")}
                            keyboardType="number-pad"
                            style={styles.textInput}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.switchLabel}>{t("compose.messageBuilder.maxReminders")}</Text>
                          <Text style={styles.sectionDescription}>
                            {t("compose.messageBuilder.maxRemindersDescription")}
                          </Text>
                          <TextInput
                            mode="outlined"
                            value={maxReminders}
                            onChangeText={setMaxReminders}
                            placeholder={t("compose.messageBuilder.maxRemindersPlaceholder")}
                            keyboardType="number-pad"
                            style={styles.textInput}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>{t("compose.messageBuilder.attachments")}</Text>
                          <Button mode="outlined" icon="file-upload" onPress={handleUploadImages} style={styles.uploadButton}>
                            Upload image(s)
                          </Button>
                          <MediaAttachmentsSelector
                            attachments={messageData.attachments || []}
                            onAttachmentsChange={(attachments) =>
                              setMessageData((prev) => ({ ...prev, attachments: attachments as any }))
                            }
                            label={t("notifications.attachments.title")}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <View style={styles.switchContainer}>
                            <Text style={styles.switchLabel}>
                              {t("notifications.automaticActions.addMarkAsReadAction")}
                            </Text>
                            <Switch value={addMarkAsReadAction} onValueChange={setAddMarkAsReadAction} />
                          </View>
                          <View style={styles.switchContainer}>
                            <Text style={styles.switchLabel}>
                              {t("notifications.automaticActions.addDeleteAction")}
                            </Text>
                            <Switch value={addDeleteAction} onValueChange={setAddDeleteAction} />
                          </View>
                          <View style={styles.switchContainer}>
                            <Text style={styles.switchLabel}>
                              {t("notifications.automaticActions.addOpenNotificationAction")}
                            </Text>
                            <Switch value={addOpenNotificationAction} onValueChange={setAddOpenNotificationAction} />
                          </View>
                          <NotificationActionsSelector
                            actions={messageData.actions || []}
                            onActionsChange={(actions) =>
                              setMessageData((prev) => ({ ...prev, actions: actions as any }))
                            }
                            label={t("notifications.actions.title")}
                          />
                        </View>
                        <Button mode="outlined" onPress={handleResetForm} style={styles.resetButton}>
                          {t("common.reset")}
                        </Button>
                      </View>
                    )}
                  </ScrollView>
                </KeyboardAvoidingView>
          </View>
        </Modal>
      </Portal>
    </>
  );
}
