import {
  MediaType,
  NotificationAttachmentDto,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import MediaAttachmentForm from "./MediaAttachmentForm";
import {
  Text,
  Icon,
  Button,
  useTheme,
} from "react-native-paper";

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
  const theme = useTheme();

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
      <Text style={styles.label}>
        {label || t("notifications.attachments.title")}
      </Text>

      {attachments.map((attachment, index) => (
        <View
          key={index}
          style={[
            styles.attachmentItem,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <View style={styles.attachmentInfo}>
            <Icon
              source={
                attachment.mediaType === MediaType.Video
                  ? "video"
                  : attachment.mediaType === MediaType.Audio
                    ? "music"
                    : "image"
              }
              size={20}
              color={theme.colors.primary}
            />
            <View style={styles.attachmentDetails}>
              <Text
                style={[
                  styles.attachmentUrl,
                  { color: theme.colors.onSurface },
                ]}
              >
                {attachment.name || attachment.url}
              </Text>
              <Text
                style={[
                  styles.attachmentMeta,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {attachment.mediaType}{" "}
                {attachment.name && `• ${attachment.url}`}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.removeAttachmentButton}
            onPress={() => removeAttachment(index)}
          >
            <Icon source="minus" size={16} />
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
        <Button
          mode="outlined"
          icon="plus"
          onPress={() => setShowAttachmentForm(true)}
          compact
        >
          {t("notifications.attachments.addMedia")}
        </Button>
      )}

      {attachments.length === 0 && (
        <Text
          style={[
            styles.attachmentHint,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {t("notifications.attachments.hint")}
        </Text>
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
