import {
  CreateMessageDto,
  GetNotificationsDocument,
  MessageFragment,
  NotificationDeliveryType,
  useCreateMessageMutation,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React, { useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Surface, Text, TextInput, useTheme } from "react-native-paper";
import ThemedBottomSheet, {
  ThemedBottomSheetRef,
  ThemedBottomSheetTrigger,
} from "./ui/ThemedBottomSheet";
import ThemedInputSelect from "./ui/ThemedInputSelect";

interface MessageBuilderProps {
  bucketId: string;
  trigger: ThemedBottomSheetTrigger;
}

export default function MessageBuilder({
  bucketId,
  trigger,
}: MessageBuilderProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const [messageData, setMessageData] = useState<Partial<MessageFragment>>({
    title: "",
    subtitle: "",
    body: "",
    deliveryType: NotificationDeliveryType.Normal,
    actions: [],
    attachments: [],
  });
  const sheetRef = useRef<ThemedBottomSheetRef>(null);

  const [createMessage, { loading: isCreating }] = useCreateMessageMutation();

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

      sheetRef.current?.hide();
    } catch (error) {
      console.error("Error creating message:", error);
    }
  }, [bucketId, messageData, createMessage]);

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
        disabled={!messageData.title?.trim()}
        style={styles.footerButton}
      >
        {t("common.save")}
      </Button>
    </View>
  );

  return (
    <ThemedBottomSheet
      title={t("compose.messageBuilder.createMessage")}
      trigger={trigger}
      ref={sheetRef}
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
            value={messageData.subtitle ?? ""}
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
            placeholder={t("compose.messageBuilder.deliveryTypePlaceholder")}
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
  );
}
