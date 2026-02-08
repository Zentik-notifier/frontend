/**
 * Gallery-only content (Gallery + CachedMedia). Used by FullScreenMediaViewer
 * to avoid circular dependency with AttachmentGallery.
 */
import {
  MediaType,
  NotificationAttachmentDto,
} from "@/generated/gql-operations-generated";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Gallery, { GalleryRef } from "react-native-awesome-gallery";
import { CachedMedia } from "./CachedMedia";

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
}

export default function AttachmentGalleryContent({
  attachments,
  initialIndex = 0,
  onIndexChange,
  notificationDate,
  zoomEnabled = false,
  onSwipeToClose,
  autoPlay = true,
  showControls = true,
  itemsToRender,
}: AttachmentGalleryContentProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const galleryRef = React.useRef<GalleryRef>(null);
  const mediaHeight = containerWidth > 0 ? containerWidth * 0.6 : 200;

  useEffect(() => {
    const safe = Math.min(
      Math.max(initialIndex, 0),
      attachments.length - 1
    );
    setCurrentIndex(safe);
    galleryRef.current?.setIndex(safe, true);
  }, [initialIndex, attachments.length]);

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
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Gallery
        ref={galleryRef}
        data={attachments}
        initialIndex={safeIndex}
        onIndexChange={(index) => {
          setCurrentIndex(index);
          onIndexChange?.(index);
        }}
        numToRender={itemsToRender}
        keyExtractor={(_, index) => index.toString()}
        pinchEnabled={zoomEnabled}
        disableVerticalSwipe={!onSwipeToClose}
        disableSwipeUp
        disableTransitionOnScaledImage
        swipeEnabled
        onSwipeToClose={onSwipeToClose}
        containerDimensions={{
          width: containerWidth || 0,
          height: mediaHeight,
        }}
        renderItem={({ item, index }) => (
          <CachedMedia
            key={`${item.url}-${index}`}
            url={item.url!}
            mediaType={item.mediaType}
            style={[{ height: mediaHeight }]}
            originalFileName={item.name || undefined}
            notificationDate={notificationDate}
            autoPlay={autoPlay && currentIndex === index}
            showControls={showControls}
            cache
          />
        )}
      />
    </View>
  );
}
