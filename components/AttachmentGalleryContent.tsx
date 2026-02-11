/**
 * Gallery-only content (SimpleMediaGallery + CachedMedia). Used by FullScreenMediaViewer
 * to avoid circular dependency with AttachmentGallery.
 */
import {
  NotificationAttachmentDto,
} from "@/generated/gql-operations-generated";
import SimpleMediaGallery, {
  SimpleMediaGalleryRef,
} from "@/components/ui/SimpleMediaGallery";
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Dimensions, View } from "react-native";
import { ImageContentFit } from "expo-image";
import { CachedMedia } from "./CachedMedia";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const galleryContentKeyExtractor = (_: any, index: number) => index.toString();

export interface AttachmentGalleryContentProps {
  attachments: NotificationAttachmentDto[];
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  notificationDate: number;
  zoomEnabled?: boolean;
  onSwipeToClose?: () => void;
  autoPlay?: boolean;
  showControls?: boolean;
  itemsToRender?: number;
  contentFit?: ImageContentFit;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export interface AttachmentGalleryContentRef {
  scrollToIndex: (index: number) => void;
}

const AttachmentGalleryContent = forwardRef<AttachmentGalleryContentRef, AttachmentGalleryContentProps>(function AttachmentGalleryContent({
  attachments,
  initialIndex = 0,
  onIndexChange,
  notificationDate,
  zoomEnabled = false,
  onSwipeToClose,
  autoPlay = true,
  showControls = true,
  itemsToRender,
  contentFit = "cover",
  onSwipeLeft,
  onSwipeRight,
}, ref) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const galleryRef = useRef<SimpleMediaGalleryRef>(null);
  const { width: layoutWidth, height: layoutHeight } = containerSize;
  const containerWidth =
    layoutWidth > 0 ? layoutWidth : screenWidth;
  const containerHeight =
    layoutHeight > 0 ? layoutHeight : screenHeight * 0.7;
  const mediaHeight =
    containerHeight > 0 ? containerHeight : containerWidth * 0.6;
  const mediaWidth = containerWidth > 0 ? containerWidth : screenWidth;

  const containerDimensions = useMemo(() => ({
    width: containerWidth || 0,
    height: mediaHeight,
  }), [containerWidth, mediaHeight]);

  const renderContentItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <CachedMedia
      key={`${item.url}-${index}`}
      url={item.url!}
      mediaType={item.mediaType}
      style={[{ width: mediaWidth, height: mediaHeight }]}
      originalFileName={item.name || undefined}
      notificationDate={notificationDate}
      autoPlay={autoPlay && currentIndex === index}
      showControls={showControls}
      contentFit={contentFit}
      disableLongPress
    />
  ), [mediaWidth, mediaHeight, notificationDate, autoPlay, currentIndex, showControls, contentFit]);

  useImperativeHandle(ref, () => ({
    scrollToIndex: (index: number) => {
      const safe = Math.min(Math.max(index, 0), attachments.length - 1);
      setCurrentIndex(safe);
      galleryRef.current?.setIndex(safe, true);
    },
  }), [attachments.length]);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const safeIndex = Math.min(
    Math.max(currentIndex, 0),
    attachments.length - 1
  );

  return (
    <View
      style={{ flex: 1, width: "100%" }}
      onLayout={(e) => setContainerSize(e.nativeEvent.layout)}
    >
      <SimpleMediaGallery
        ref={galleryRef}
        data={attachments}
        initialIndex={safeIndex}
        onIndexChange={(index) => {
          setCurrentIndex(index);
          onIndexChange?.(index);
        }}
        numToRender={itemsToRender ?? 1}
        removeClippedSubviews
        keyExtractor={galleryContentKeyExtractor}
        pinchEnabled={zoomEnabled}
        disableVerticalSwipe={!onSwipeToClose}
        swipeEnabled
        onSwipeToClose={onSwipeToClose}
        onSwipeLeft={onSwipeLeft}
        onSwipeRight={onSwipeRight}
        containerDimensions={containerDimensions}
        renderItem={renderContentItem}
      />
    </View>
  );
});

export default AttachmentGalleryContent;
