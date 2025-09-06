import { Colors } from "@/constants/Colors";
import { MediaType } from "@/generated/gql-operations-generated";
import { useNotificationUtils } from "@/hooks";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { ThemedText } from "./ThemedText";
import { IconButton, InlinePicker, InlinePickerOption } from "./ui";

interface MediaAttachmentFormProps {
  attachmentType: MediaType | undefined;
  attachmentUrl: string;
  attachmentName: string;
  onAttachmentTypeChange: (type: MediaType) => void;
  onAttachmentUrlChange: (url: string) => void;
  onAttachmentNameChange: (name: string) => void;
  onCancel: () => void;
  onSave: () => void;
  saveButtonTitle: string;
  isEditing?: boolean;
}

export default function MediaAttachmentForm({
  attachmentType,
  attachmentUrl,
  attachmentName,
  onAttachmentTypeChange,
  onAttachmentUrlChange,
  onAttachmentNameChange,
  onCancel,
  onSave,
  saveButtonTitle,
  isEditing = false,
}: MediaAttachmentFormProps) {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const { getMediaTypeFriendlyName, getMediaTypeIcon, getMediaTypeColor } =
    useNotificationUtils();

  const mediaTypeOptions: InlinePickerOption<MediaType>[] = Object.values(
    MediaType
  ).map((mediaType) => ({
    value: mediaType,
    label: getMediaTypeFriendlyName(mediaType),
    icon: getMediaTypeIcon(mediaType),
    color: getMediaTypeColor(mediaType),
  }));

  const isFormValid = () => {
    return attachmentUrl.trim() && attachmentType;
  };

  return (
    <View
      style={[
        styles.attachmentForm,
        {
          backgroundColor: Colors[colorScheme ?? "light"].backgroundSecondary,
          borderColor: Colors[colorScheme ?? "light"].border,
        },
      ]}
    >
      <InlinePicker
        label={t("notifications.attachments.mediaType")}
        selectedValue={attachmentType!}
        options={mediaTypeOptions}
        onValueChange={onAttachmentTypeChange}
        placeholder={t("notifications.attachments.selectMediaType")}
      />

      <View style={styles.field}>
        <ThemedText style={styles.label}>
          {t("notifications.attachments.mediaUrl")}
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
          value={attachmentUrl}
          onChangeText={onAttachmentUrlChange}
          placeholder={t("notifications.attachments.mediaUrlPlaceholder")}
          placeholderTextColor={Colors[colorScheme ?? "light"].inputPlaceholder}
          keyboardType="url"
        />
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>
          {t("notifications.attachments.mediaName")}
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
          value={attachmentName}
          onChangeText={onAttachmentNameChange}
          placeholder={t("notifications.attachments.mediaNamePlaceholder")}
          placeholderTextColor={Colors[colorScheme ?? "light"].inputPlaceholder}
        />
      </View>

      <View style={styles.attachmentFormButtons}>
        <IconButton
          title={t("notifications.form.cancel")}
          iconName="cancel"
          onPress={onCancel}
          variant="secondary"
          size="sm"
        />
        <IconButton
          title={saveButtonTitle}
          iconName={isEditing ? "confirm" : "add"}
          onPress={onSave}
          variant="success"
          size="sm"
          disabled={!isFormValid()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  attachmentForm: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
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
  attachmentFormButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    gap: 10,
  },
});
