import { Colors } from "@/constants/Colors";
import {
  MediaType,
  NotificationAttachmentDto,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import MediaAttachmentForm from "./MediaAttachmentForm";
import { ThemedText } from "./ThemedText";
import { Icon, IconButton } from "./ui";

interface MediaAttachmentsSelectorProps {
  attachments: NotificationAttachmentDto[];
  onAttachmentsChange: (attachments: NotificationAttachmentDto[]) => void;
  label?: string;
}

export default function MediaAttachmentsSelector({
  attachments,
  onAttachmentsChange,
  label,
}: MediaAttachmentsSelectorProps) {
  const { t } = useI18n();
  const colorScheme = useColorScheme();

  const [showAttachmentForm, setShowAttachmentForm] = useState(false);
  const [attachmentType, setAttachmentType] = useState<MediaType>();
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");

  const addAttachment = () => {
    if (attachmentUrl.trim() && attachmentType) {
      const newAttachment: NotificationAttachmentDto = {
        mediaType: attachmentType,
        url: attachmentUrl.trim(),
        name: attachmentName.trim() || undefined,
      };
      onAttachmentsChange([...attachments, newAttachment]);
      setAttachmentUrl("");
      setAttachmentName("");
      setAttachmentType(undefined);
      setShowAttachmentForm(false);
    }
  };

  const removeAttachment = (index: number) => {
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };



  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>
        {label || t("notifications.attachments.title")}
      </ThemedText>

      {attachments.map((attachment, index) => (
        <View
          key={index}
          style={[
            styles.attachmentItem,
            {
              backgroundColor: Colors[colorScheme ?? "light"].backgroundSecondary,
              borderColor: Colors[colorScheme ?? "light"].border,
            },
          ]}
        >
          <View style={styles.attachmentInfo}>
            <Icon
              name={
                attachment.mediaType === MediaType.Video
                  ? "video"
                  : attachment.mediaType === MediaType.Audio
                    ? "sound"
                    : "image"
              }
              size="sm"
              color={Colors[colorScheme ?? "light"].tint}
            />
            <View style={styles.attachmentDetails}>
              <ThemedText
                style={[
                  styles.attachmentUrl,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                {attachment.name || attachment.url}
              </ThemedText>
              <ThemedText
                style={[
                  styles.attachmentMeta,
                  { color: Colors[colorScheme ?? "light"].textSecondary },
                ]}
              >
                {attachment.mediaType}{" "}
                {attachment.name && `• ${attachment.url}`}
              </ThemedText>
            </View>
          </View>
          <TouchableOpacity
            style={styles.removeAttachmentButton}
            onPress={() => removeAttachment(index)}
          >
            <Icon name="remove" size="xs" color="white" />
          </TouchableOpacity>
        </View>
      ))}

      {showAttachmentForm && (
        <MediaAttachmentForm
          attachmentType={attachmentType}
          attachmentUrl={attachmentUrl}
          attachmentName={attachmentName}
          onAttachmentTypeChange={setAttachmentType}
          onAttachmentUrlChange={setAttachmentUrl}
          onAttachmentNameChange={setAttachmentName}
          onCancel={() => setShowAttachmentForm(false)}
          onSave={addAttachment}
          saveButtonTitle={t("notifications.attachments.addMedia")}
          isEditing={false}
        />
      )}

      {!showAttachmentForm && (
        <IconButton
          title={t("notifications.attachments.addMedia")}
          iconName="add"
          onPress={() => setShowAttachmentForm(true)}
          variant="secondary"
          size="md"
        />
      )}

      {attachments.length === 0 && (
        <ThemedText
          style={[
            styles.attachmentHint,
            { color: Colors[colorScheme ?? "light"].textSecondary },
          ]}
        >
          {t("notifications.attachments.hint")}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  attachmentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  attachmentInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  attachmentDetails: {
    flex: 1,
    marginLeft: 10,
  },
  attachmentUrl: {
    fontSize: 16,
    fontWeight: "500",
  },
  attachmentMeta: {
    fontSize: 14,
    marginTop: 2,
  },
  removeAttachmentButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },

  attachmentHint: {
    fontSize: 14,
    textAlign: "center",
    padding: 16,
    fontStyle: "italic",
  },
});
