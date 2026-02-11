import {
  MediaType,
  NotificationAttachmentDto,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import SimpleMediaGallery, {
  SimpleMediaGalleryRef,
} from "@/components/ui/SimpleMediaGallery";
import {
  Icon,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { CachedMedia } from "./CachedMedia";
import FullScreenMediaViewer from "./FullScreenMediaViewer";
import { MediaTypeIcon } from "./MediaTypeIcon";

const galleryKeyExtractor = (_: any, index: number) => index.toString();

interface AttachmentGalleryProps {
  attachments: NotificationAttachmentDto[];
  onMediaPress?: (
    imageUri: string,
    mediaType: MediaType,
    fileName?: string
  ) => void;
  notificationDate: number;
  showTitle?: boolean;
  autoPlay?: boolean;
  showMediaName?: boolean;
  zoomEnabled?: boolean;
  useThumbnail?: boolean;
  swipeToChange?: boolean;
  selectorPosition?: "top" | "bottom";
  maxHeight?: number;
  itemsToRender?: number;
  enableFullScreen?: boolean;
  fullScreenTrigger?: "tap" | "button";
  onSwipeToClose?: () => void;
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  /** When true, touch events pass through so the parent (e.g. list) can scroll */
  eventsDisabled?: boolean;
}

const AttachmentGallery: React.FC<AttachmentGalleryProps> = ({
  attachments,
  onMediaPress,
  notificationDate,
  showTitle,
  showMediaName,
  selectorPosition,
  zoomEnabled = false,
  useThumbnail = false,
  swipeToChange = true,
  maxHeight,
  itemsToRender,
  autoPlay = true,
  onSwipeToClose,
  enableFullScreen,
  fullScreenTrigger = "tap",
  initialIndex,
  onIndexChange,
  eventsDisabled = false,
}) => {
  const theme = useTheme();
  const { t } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(initialIndex ?? 0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const galleryRef = useRef<SimpleMediaGalleryRef>(null);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const currentAttachment = attachments[currentIndex];

  const handleSelectorPress = (index: number) => {
    setCurrentIndex(index);

    onIndexChange?.(index);

    if (galleryRef.current) {
      galleryRef.current.setIndex(index, true);
    }
  };

  const handleAttachmentPress = useCallback(() => {
    if (enableFullScreen && fullScreenTrigger === "tap") {
      setFullScreenVisible(true);
    }

    onMediaPress?.(
      currentAttachment.url!,
      currentAttachment.mediaType,
      currentAttachment.name || undefined
    );
  }, [
    enableFullScreen,
    fullScreenTrigger,
    currentAttachment?.url,
    currentAttachment?.mediaType,
    currentAttachment?.name,
    onMediaPress,
  ]);

  const effectiveWidth = containerWidth > 0 ? containerWidth : Dimensions.get("window").width;
  const mediaHeight =
    maxHeight ?? (containerWidth > 0 ? containerWidth * 0.6 : effectiveWidth * 0.6);

  const containerDimensions = useMemo(() => ({
    width: effectiveWidth,
    height: mediaHeight,
  }), [effectiveWidth, mediaHeight]);

  const renderGalleryItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <CachedMedia
      key={`${item.url}-${index}`}
      url={item.url!}
      mediaType={item.mediaType}
      style={[{ width: effectiveWidth, height: mediaHeight }]}
      originalFileName={item.name || undefined}
      onPress={handleAttachmentPress}
      notificationDate={notificationDate}
      autoPlay={autoPlay && currentIndex === index}
      showControls={!enableFullScreen}
      disableLongPress={zoomEnabled}
      useThumbnail={useThumbnail && item.mediaType === MediaType.Image}
    />
  ), [effectiveWidth, mediaHeight, handleAttachmentPress, notificationDate, autoPlay, currentIndex, enableFullScreen, zoomEnabled, maxHeight]);

  const renderSelector = () => {
    if (!attachments || attachments.length <= 1) return null;

    return (
      <Surface
        style={[
          styles.selectorContainer,
          { backgroundColor: theme.colors.surfaceVariant },
        ]}
        elevation={0}
      >
        <View style={styles.selectorRow}>
          {attachments.map((attachment, index) => {
            const isActive = currentIndex === index;

            return (
              <TouchableRipple
                key={`${attachment.url}-${index}`}
                style={[
                  styles.selectorSegment,
                  isActive && {
                    backgroundColor: theme.colors.primaryContainer,
                    borderColor: theme.colors.primary,
                    borderWidth: 1.5,
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
                  />
                </View>
              </TouchableRipple>
            );
          })}
        </View>
      </Surface>
    );
  };

  return (
    <View
      style={styles.galleryRoot}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
      }}
    >
      {showTitle && (
        <View style={styles.headerContainer}>
          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            {t("attachmentGallery.attachments", { count: attachments.length })}
          </Text>
        </View>
      )}

      {selectorPosition === "top" && renderSelector()}

      <View style={[styles.mediaContainer, { height: mediaHeight }]}>
        {eventsDisabled && enableFullScreen && fullScreenTrigger === "button" && (
          <View style={[styles.fullScreenButtonContainer, styles.fullScreenButtonOnTop]}>
            <TouchableRipple
              onPress={() => setFullScreenVisible(true)}
              style={[
                styles.fullScreenButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outline,
                  borderWidth: 1,
                },
              ]}
            >
              <Icon
                source="arrow-expand-all"
                size={18}
                color={theme.colors.onSurface}
              />
            </TouchableRipple>
          </View>
        )}
        <View style={StyleSheet.absoluteFill} pointerEvents="auto">
          <SimpleMediaGallery
            ref={galleryRef}
            data={attachments}
            initialIndex={Math.min(currentIndex, attachments.length - 1)}
            onIndexChange={(index) => {
              setCurrentIndex(index);
              onIndexChange?.(index);
            }}
            numToRender={itemsToRender}
            keyExtractor={galleryKeyExtractor}
            pinchEnabled={zoomEnabled}
            disableVerticalSwipe={!onSwipeToClose}
            swipeEnabled={swipeToChange}
            onSwipeToClose={onSwipeToClose}
            containerDimensions={containerDimensions}
            renderItem={renderGalleryItem}
          />
        </View>
        {!eventsDisabled && enableFullScreen && fullScreenTrigger === "button" && (
          <View style={styles.fullScreenButtonContainer}>
            <TouchableRipple
              onPress={() => setFullScreenVisible(true)}
              style={[
                styles.fullScreenButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outline,
                  borderWidth: 1,
                },
              ]}
            >
              <Icon
                source="arrow-expand-all"
                size={18}
                color={theme.colors.onSurface}
              />
            </TouchableRipple>
          </View>
        )}
      </View>

      {selectorPosition === "bottom" && renderSelector()}
      {showMediaName && currentAttachment.name && (
        <Text style={styles.attachmentName} numberOfLines={2}>
          {currentAttachment.name}
        </Text>
      )}
      {enableFullScreen && fullScreenVisible && (
        <FullScreenMediaViewer
          visible={fullScreenVisible}
          attachments={attachments}
          initialIndex={currentIndex}
          notificationDate={notificationDate}
          onClose={() => setFullScreenVisible(false)}
          onCurrentIndexChange={(index) => {
            setCurrentIndex(index);
            if (galleryRef.current) {
              galleryRef.current.setIndex(index, true);
            }
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  galleryRoot: {
    width: "100%",
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
    // borderTopRightRadius: 12,
    // borderTopLeftRadius: 12,
    overflow: "hidden",
  },
  selectorRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
  },
  selectorSegment: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderColor: "transparent",
    borderWidth: 1,
  },
  mediaContainer: {
    width: "100%",
    position: "relative",
  },
  media: {
    width: "100%",
    borderRadius: 12,
  },
  fullScreenButtonContainer: {
    position: "absolute",
    left: 8,
    bottom: 8,
  },
  fullScreenButtonOnTop: {
    zIndex: 10,
  },
  fullScreenButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
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
