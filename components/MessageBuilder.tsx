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
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Icon,
  List,
  Modal,
  Portal,
  Switch,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import * as DocumentPicker from "expo-document-picker";
import { settingsService } from "@/services/settings-service";
import MediaAttachmentsSelector from "./MediaAttachmentsSelector";
import NotificationActionsSelector from "./NotificationActionsSelector";
import NumberListInput from "./ui/NumberListInput";
import Selector, { SelectorOption } from "./ui/Selector";

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
  const [postponeTimes, setPostponeTimes] = useState<number[]>([]);

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
        postpones: postponeTimes,
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
      // Reset action flags and snooze times
      setAddMarkAsReadAction(false);
      setAddDeleteAction(false);
      setAddOpenNotificationAction(false);
      setSnoozeTimes([]);
      setPostponeTimes([]);

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
    setPostponeTimes([]);
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
                    <Selector
                      options={deliveryTypeOptions}
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
                  <NumberListInput
                    label={t("notifications.automaticActions.snoozeTimes")}
                    values={snoozeTimes}
                    onValuesChange={setSnoozeTimes}
                    placeholder={t(
                      "notifications.automaticActions.snoozeTimePlaceholder"
                    )}
                    unit="m"
                    min={1}
                    max={9999}
                  />

                  {/* Postpones */}
                  <NumberListInput
                    label={t("notifications.automaticActions.postponeTimes")}
                    values={postponeTimes}
                    onValuesChange={setPostponeTimes}
                    placeholder={t(
                      "notifications.automaticActions.postponeTimePlaceholder"
                    )}
                    unit="m"
                    min={1}
                    max={9999}
                  />
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
                  <Button
                    mode="outlined"
                    icon="file-upload"
                    onPress={handleUploadImages}
                    style={{ marginBottom: 8 }}
                  >
                    Upload image(s)
                  </Button>
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
