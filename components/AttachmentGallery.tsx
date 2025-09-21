import { Colors } from "@/constants/Colors";
import {
  MediaType,
  NotificationAttachmentDto,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import React, { useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { CachedMedia } from "./CachedMedia";
import { MediaTypeIcon } from "./MediaTypeIcon";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface AttachmentGalleryProps {
  attachments: NotificationAttachmentDto[];
  onMediaPress?: (
    imageUri: string,
    mediaType: MediaType,
    fileName?: string
  ) => void;
  notificationDate: number;
}

interface AttachmentItemProps {
  attachment: NotificationAttachmentDto;
  onPress?: () => void;
  isSingle?: boolean;
  isSelected?: boolean;
  notificationDate: number;
  containerWidth?: number;
}

const AttachmentItem: React.FC<AttachmentItemProps> = ({
  attachment,
  onPress,
  isSingle,
  isSelected,
  notificationDate,
  containerWidth = 0,
}) => {
  const getDynamicItemStyles = (containerWidth: number) => {
    if (containerWidth === 0) return {};
    
    return {
      attachmentContainer: {
        width: "100%",
        height: containerWidth * 0.4,
        borderRadius: 12,
        overflow: "hidden" as const,
        position: "relative" as const,
      },
      singleAttachmentContainer: {
        height: containerWidth * 0.6, // Larger height for single attachment
      },
    };
  };

  const dynamicItemStyles = getDynamicItemStyles(containerWidth);
  const containerStyle = [styles.attachmentContainer, dynamicItemStyles.attachmentContainer];
  const singleAttachmentStyle = isSingle
    ? [styles.singleAttachmentContainer, dynamicItemStyles.singleAttachmentContainer]
    : [];
  const finalContainerStyle = [...containerStyle, ...singleAttachmentStyle];

  const renderContent = () => {
    const url = attachment.url!;

    return (
      <View style={finalContainerStyle}>
        <CachedMedia
          url={url}
          mediaType={attachment.mediaType}
          style={styles.image}
          originalFileName={attachment.name || undefined}
          onPress={onPress}
          notificationDate={notificationDate}
          videoProps={{
            autoPlay: isSelected,
            isMuted: true,
            isLooping: true,
            showControls: false,
          }}
          audioProps={{
            shouldPlay: false,
            isLooping: false,
            showControls: true,
          }}
        />
      </View>
    );
  };

  const itemContainerStyle = isSingle
    ? [styles.itemContainer, styles.singleItemContainer]
    : [styles.itemContainer];

  return (
    <View style={itemContainerStyle}>
      {renderContent()}
      {attachment.name && (
        <ThemedText style={styles.attachmentName} numberOfLines={2}>
          {attachment.name}
        </ThemedText>
      )}
    </View>
  );
};

const AttachmentGallery: React.FC<AttachmentGalleryProps> = ({
  attachments,
  onMediaPress,
  notificationDate,
}) => {
  const colorScheme = useColorScheme() ?? "light";
  const { t } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const flatListRef = useRef<FlatList<NotificationAttachmentDto>>(null);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const handleSelectorPress = (index: number) => {
    setCurrentIndex(index);
    // Scroll to the selected attachment
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
  };

  const handleAttachmentPress = (attachment: NotificationAttachmentDto) => {
    onMediaPress?.(
      attachment.url!,
      attachment.mediaType,
      attachment.name || undefined
    );
  };

  const getDynamicStyles = (containerWidth: number) => {
    if (containerWidth === 0) return {};
    
    return {
      itemContainer: {
        width: containerWidth * 0.4,
      },
      singleItemContainer: {
        width: containerWidth - 32, // Account for container padding
        paddingHorizontal: 16, // Internal padding for content
      },
      attachmentContainer: {
        width: "100%",
        height: containerWidth * 0.4,
        borderRadius: 12,
        overflow: "hidden" as const,
        position: "relative" as const,
      },
      singleAttachmentContainer: {
        height: containerWidth * 0.6, // Larger height for single attachment
      },
    };
  };

  const dynamicStyles = getDynamicStyles(containerWidth);

  const renderAttachment = ({
    item,
    index,
  }: {
    item: NotificationAttachmentDto;
    index: number;
  }) => (
    <View style={[styles.singleItemContainer, dynamicStyles.singleItemContainer]}>
      <AttachmentItem
        attachment={item}
        onPress={() => handleAttachmentPress(item)}
        isSingle
        isSelected={currentIndex === index}
        notificationDate={notificationDate}
        containerWidth={containerWidth}
      />
    </View>
  );

  return (
    <ThemedView 
      style={styles.container}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
      }}
    >
      <View style={styles.headerContainer}>
        <ThemedText style={styles.sectionTitle}>
          {t("attachmentGallery.attachments", { count: attachments.length })}
        </ThemedText>
      </View>

      {/* Attachment Selector */}
      {attachments.length > 1 && (
        <View style={styles.selectorContainer}>
          <View style={styles.selectorScrollView}>
            {attachments.map((attachment, index) => {
              const isActive = currentIndex !== -1 && index === currentIndex;

              return (
                <TouchableOpacity
                  key={`${attachment.url}-${index}`}
                  style={[
                    styles.selectorButton,
                    {
                      backgroundColor: Colors[colorScheme].backgroundSecondary,
                      borderWidth: isActive ? 1.5 : 0,
                      borderColor: isActive
                        ? Colors[colorScheme].tint
                        : "transparent",
                    },
                  ]}
                  onPress={() => handleSelectorPress(index)}
                >
                  <MediaTypeIcon
                    mediaType={attachment.mediaType}
                    size={16}
                    base
                    showLabel
                    label={attachment.name}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={attachments}
        renderItem={renderAttachment}
        keyExtractor={(item, index) => `${item.url}-${index}`}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => {
          // Pause all media when user starts scrolling
          setCurrentIndex(-1);
        }}
        onMomentumScrollEnd={(event) => {
          if (containerWidth > 0) {
            const newIndex = Math.round(
              event.nativeEvent.contentOffset.x / (containerWidth - 32)
            );
            setCurrentIndex(newIndex);
          }
        }}
        pagingEnabled={true}
        scrollEnabled={true}
        decelerationRate="fast"
        snapToInterval={containerWidth > 0 ? containerWidth - 32 : undefined}
        snapToAlignment="start"
      />

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
                      ? Colors[colorScheme].tint
                      : Colors[colorScheme].iconSecondary,
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
    </ThemedView>
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
    paddingHorizontal: 16,
    marginBottom: 12,
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
  selectorButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  selectorButtonTextActive: {
    color: "#FFFFFF",
  },
  swipeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    opacity: 0.6,
  },
  swipeText: {
    fontSize: 12,
    marginHorizontal: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  singleListContainer: {
    paddingHorizontal: 0, // Padding for all items
    flex: 1,
  },
  separator: {
    width: 12,
  },
  itemContainer: {
    // Dynamic width will be set via getDynamicStyles
  },
  singleItemContainer: {
    // Dynamic width and padding will be set via getDynamicStyles
    paddingHorizontal: 0, // Will be overridden by dynamic styles
  },
  attachmentContainer: {
    width: "100%",
    // Dynamic height will be set via getDynamicItemStyles
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  singleAttachmentContainer: {
    // Dynamic height will be set via getDynamicItemStyles
  },
  image: {
    width: "100%",
    height: "100%",
  },
  videoPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  audioPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  filePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  errorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    textAlign: "center",
  },
  typeIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  typeIndicatorText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },
  videoText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  audioText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  fileText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  attachmentName: {
    marginTop: 8,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  audio: {
    width: "100%",
    height: "100%",
  },
  audioControls: {
    justifyContent: "center",
    alignItems: "center",
  },
  audioStatus: {
    marginTop: 4,
    fontSize: 10,
    textAlign: "center",
    opacity: 0.7,
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
