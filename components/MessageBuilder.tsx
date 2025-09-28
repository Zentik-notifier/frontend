import {
  CreateMessageDto,
  GetNotificationsDocument,
  NotificationActionDto,
  NotificationAttachmentDto,
  NotificationDeliveryType,
  useCreateMessageMutation,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React, { useCallback, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import ThemedInputSelect from "./ui/ThemedInputSelect";
import ThemedBottomSheet from "./ui/ThemedBottomSheet";

const { height: screenHeight } = Dimensions.get("window");

interface MessageBuilderProps {
  bucketId: string;
}

interface MessageData {
  title: string;
  subtitle: string;
  body: string;
  deliveryType: NotificationDeliveryType;
  actions: NotificationActionDto[];
  attachments: NotificationAttachmentDto[];
}

export default function MessageBuilder({ bucketId }: MessageBuilderProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [messageData, setMessageData] = useState<MessageData>({
    title: "",
    subtitle: "",
    body: "",
    deliveryType: NotificationDeliveryType.Normal,
    actions: [],
    attachments: [],
  });

  const [createMessage, { loading: isCreating }] = useCreateMessageMutation();

  const showModal = useCallback(() => {
    setIsVisible(true);
  }, []);

  const hideModal = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleSaveMessage = useCallback(async () => {
    try {
      const createMessageDto: CreateMessageDto = {
        bucketId,
        title: messageData.title,
        subtitle: messageData.subtitle,
        body: messageData.body,
        deliveryType: messageData.deliveryType,
        actions: messageData.actions,
        attachments: messageData.attachments,
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
    footer: {
      flexDirection: "row",
      gap: 12,
    },
    footerButton: {
      flex: 1,
    },
  });

  const footer = (
    <View style={styles.footer}>
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
        disabled={!messageData.title.trim() || !messageData.body.trim()}
        style={styles.footerButton}
      >
        {t("common.save")}
      </Button>
    </View>
  );

  return (
    <>
      {/* Trigger Button */}
      <Button
        mode="contained"
        onPress={showModal}
        icon="plus"
        style={styles.triggerButton}
      >
        {t("compose.messageBuilder.createMessage")}
      </Button>

      {/* Bottom Sheet Modal */}
      <ThemedBottomSheet
        visible={isVisible}
        onClose={hideModal}
        title={t("compose.messageBuilder.createMessage")}
        maxHeight={screenHeight * 0.95}
        minHeight={screenHeight * 0.6}
        footer={footer}
      >
        <Surface style={styles.formContainer} elevation={1}>
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

          {/* Subtitle */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {t("compose.messageBuilder.subtitle")}
            </Text>
            <TextInput
              mode="outlined"
              value={messageData.subtitle}
              onChangeText={(text) =>
                setMessageData((prev) => ({ ...prev, subtitle: text }))
              }
              placeholder={t("compose.messageBuilder.subtitlePlaceholder")}
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
              value={messageData.body}
              onChangeText={(text) =>
                setMessageData((prev) => ({ ...prev, body: text }))
              }
              placeholder={t("compose.messageBuilder.bodyPlaceholder")}
              multiline
              numberOfLines={4}
              style={[styles.textInput, styles.multilineInput]}
            />
          </View>

          {/* Delivery Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {t("compose.messageBuilder.deliveryType")}
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
        </Surface>

        {/* Actions Section */}
        <Surface style={styles.formContainer} elevation={1}>
          <Text style={styles.sectionTitle}>
            {t("compose.messageBuilder.actions")}
          </Text>
          <Text style={styles.sectionDescription}>
            {t("compose.messageBuilder.actionsDescription")}
          </Text>
          {/* TODO: Implement actions selector */}
        </Surface>

        {/* Attachments Section */}
        <Surface style={styles.formContainer} elevation={1}>
          <Text style={styles.sectionTitle}>
            {t("compose.messageBuilder.attachments")}
          </Text>
          <Text style={styles.sectionDescription}>
            {t("compose.messageBuilder.attachmentsDescription")}
          </Text>
          {/* TODO: Implement attachments selector */}
        </Surface>
      </ThemedBottomSheet>
    </>
  );
}