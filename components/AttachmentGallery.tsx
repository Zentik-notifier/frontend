import {
  MediaType,
  NotificationAttachmentDto,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React, { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Surface, Text, TouchableRipple, useTheme } from "react-native-paper";
import { CachedMedia } from "./CachedMedia";
import { MediaTypeIcon } from "./MediaTypeIcon";

interface AttachmentGalleryProps {
  attachments: NotificationAttachmentDto[];
  onMediaPress?: (
    imageUri: string,
    mediaType: MediaType,
    fileName?: string
  ) => void;
  notificationDate: number;
}

const AttachmentGallery: React.FC<AttachmentGalleryProps> = ({
  attachments,
  onMediaPress,
  notificationDate,
}) => {
  const theme = useTheme();
  const { t } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const currentAttachment = attachments[currentIndex];

  const handleSelectorPress = (index: number) => {
    setCurrentIndex(index);
  };

  const handleAttachmentPress = () => {
    onMediaPress?.(
      currentAttachment.url!,
      currentAttachment.mediaType,
      currentAttachment.name || undefined
    );
  };

  const mediaHeight = containerWidth > 0 ? containerWidth * 0.6 : 200;

  return (
    <View
      style={[styles.container]}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
      }}
    >
      <View style={styles.headerContainer}>
        <Text
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          {t("attachmentGallery.attachments", { count: attachments.length })}
        </Text>
      </View>

      {/* Attachment Selector */}
      {attachments.length > 1 && (
        <Surface
          style={[
            styles.selectorContainer,
            { backgroundColor: theme.colors.surface },
          ]}
          elevation={0}
        >
          <View style={styles.selectorScrollView}>
            {attachments.map((attachment, index) => {
              const isActive = currentIndex !== -1 && index === currentIndex;

              return (
                <TouchableRipple
                  key={`${attachment.url}-${index}`}
                  style={[
                    styles.selectorButton,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderWidth: isActive ? 1.5 : 0,
                      borderColor: isActive
                        ? theme.colors.primary
                        : "transparent",
                    },
                  ]}
                  onPress={() => handleSelectorPress(index)}
                >
                  <View>
                    <MediaTypeIcon
                      mediaType={attachment.mediaType}
                      size={14}
                      base
                      showLabel
                      label={attachment.name}
                    />
                  </View>
                </TouchableRipple>
              );
            })}
          </View>
        </Surface>
      )}

      {/* Media selezionato */}
      <Surface
        style={[styles.mediaSurface, { backgroundColor: theme.colors.surface }]}
        elevation={0}
      >
        <View style={[styles.mediaContainer, { height: mediaHeight }]}>
          <CachedMedia
            key={`${currentAttachment.url}-${currentIndex}`}
            url={currentAttachment.url!}
            mediaType={currentAttachment.mediaType}
            style={[styles.media, { height: mediaHeight }]}
            originalFileName={currentAttachment.name || undefined}
            onPress={handleAttachmentPress}
            notificationDate={notificationDate}
            videoProps={{
              autoPlay: true,
              isMuted: true,
              isLooping: true,
              showControls: Platform.OS === "web"
            }}
            audioProps={{
              shouldPlay: false,
              isLooping: false,
              showControls: true,
            }}
          />
        </View>
        {currentAttachment.name && (
          <Text style={styles.attachmentName} numberOfLines={2}>
            {currentAttachment.name}
          </Text>
        )}
      </Surface>

      {attachments.length > 1 && (
        <View style={styles.paginationContainer}>
          {attachments.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                {
                  backgroundColor:
                    index === currentIndex
                      ? theme.colors.primary
                      : theme.colors.outline,
                  opacity:
                    currentIndex === -1
                      ? 0.3
                      : index === currentIndex
                      ? 1
                      : 0.3,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  selectorContainer: {
    paddingVertical: 8,
    marginBottom: 12,
    borderRadius: 12,
  },
  selectorScrollView: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "transparent",
    gap: 6,
  },
  mediaSurface: {
    borderRadius: 12,
    padding: 12,
  },
  mediaContainer: {
    width: "100%",
    borderRadius: 12,
  },
  media: {
    width: "100%",
    borderRadius: 12,
  },
  attachmentName: {
    marginTop: 8,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    marginHorizontal: 16,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
});

export default AttachmentGallery;
