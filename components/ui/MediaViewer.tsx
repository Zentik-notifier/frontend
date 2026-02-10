import { MediaType } from "@/generated/gql-operations-generated";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import React from "react";
import { ImageStyle, StyleProp, ViewStyle } from "react-native";

interface MediaViewerProps {
  url: string;
  mediaType: MediaType;
  style?: StyleProp<ViewStyle | ImageStyle>;
  contentFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  showVideoControls?: boolean;
  autoPlay?: boolean;
  isLooping?: boolean;
  isMuted?: boolean;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
  url,
  mediaType,
  style,
  contentFit = "cover",
  showVideoControls = false,
  autoPlay = false,
  isLooping = false,
  isMuted = true,
}) => {
  if (mediaType === MediaType.Video) {
    return (
      <MediaViewerVideo
        url={url}
        style={style}
        showVideoControls={showVideoControls}
        autoPlay={autoPlay}
        isLooping={isLooping}
        isMuted={isMuted}
      />
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={style as StyleProp<ImageStyle>}
      contentFit={contentFit}
      cachePolicy="none"
      recyclingKey={`media-viewer-${url}`}
    />
  );
};

const MediaViewerVideo: React.FC<{
  url: string;
  style?: StyleProp<ViewStyle | ImageStyle>;
  showVideoControls: boolean;
  autoPlay: boolean;
  isLooping: boolean;
  isMuted: boolean;
}> = ({ url, style, showVideoControls, autoPlay, isLooping, isMuted }) => {
  const videoPlayer = useVideoPlayer(url, (player) => {
    player.muted = isMuted;
    player.loop = isLooping;
    if (autoPlay) player.play();
  });

  return (
    <VideoView
      style={style}
      player={videoPlayer}
      nativeControls={showVideoControls}
      allowsPictureInPicture={showVideoControls}
    />
  );
};
