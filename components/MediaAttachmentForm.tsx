import { MediaType } from "@/generated/gql-operations-generated";
import { useNotificationUtils } from "@/hooks";
import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Text, Surface, Button, useTheme } from "react-native-paper";
import ThemedInputSelect from "./ui/ThemedInputSelect";

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
  const theme = useTheme();
  const { getMediaTypeFriendlyName, getMediaTypeIcon, getMediaTypeColor } =
    useNotificationUtils();

  const mediaTypeOptions = Object.values(
    MediaType
  ).map((mediaType) => ({
    id: mediaType,
    name: getMediaTypeFriendlyName(mediaType),
  }));

  const isFormValid = () => {
    return attachmentUrl.trim() && attachmentType;
  };

  return (
    <Surface
      style={[
        styles.attachmentForm,
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderColor: theme.colors.outline,
        },
      ]}
    >
      <ThemedInputSelect
        label={t("notifications.attachments.mediaType")}
        placeholder={t("notifications.attachments.selectMediaType")}
        options={mediaTypeOptions}
        optionLabel="name"
        optionValue="id"
        selectedValue={attachmentType!}
        onValueChange={onAttachmentTypeChange}
        isSearchable={false}
      />

      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.colors.onSurface }]}>
          {t("notifications.attachments.mediaUrl")}
        </Text>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
              color: theme.colors.onSurface,
            },
          ]}
          value={attachmentUrl}
          onChangeText={onAttachmentUrlChange}
          placeholder={t("notifications.attachments.mediaUrlPlaceholder")}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          keyboardType="url"
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.colors.onSurface }]}>
          {t("notifications.attachments.mediaName")}
        </Text>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
              color: theme.colors.onSurface,
            },
          ]}
          value={attachmentName}
          onChangeText={onAttachmentNameChange}
          placeholder={t("notifications.attachments.mediaNamePlaceholder")}
          placeholderTextColor={theme.colors.onSurfaceVariant}
        />
      </View>

      <View style={styles.attachmentFormButtons}>
        <Button
          mode="outlined"
          onPress={onCancel}
          compact
          style={styles.button}
        >
          {t("notifications.form.cancel")}
        </Button>
        <Button
          mode="contained"
          onPress={onSave}
          compact
          disabled={!isFormValid()}
          style={styles.button}
        >
          {saveButtonTitle}
        </Button>
      </View>
    </Surface>
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
  button: {
    flex: 1,
  },
});
