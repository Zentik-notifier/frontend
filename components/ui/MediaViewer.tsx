import { MediaType } from "@/generated/gql-operations-generated";
// import { Image, ImageStyle } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import React from "react";
import { ImageStyle, Image, StyleProp, ViewStyle } from "react-native";

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
  const isVideo = mediaType === MediaType.Video;

  const videoPlayer = useVideoPlayer(isVideo ? url : "", (player) => {
    player.muted = isMuted;
    player.loop = isLooping;

    if (autoPlay) {
      player.play();
    }
  });
  // For video types, we need to use VideoView with useVideoPlayer
  if (isVideo) {
    return (
      <VideoView
        style={style}
        player={videoPlayer}
        nativeControls={showVideoControls}
        allowsPictureInPicture={showVideoControls}
      />
    );
  }

  // For image types (IMAGE, ICON), use expo-image
  return <Image source={{ uri: url }} style={style as StyleProp<ImageStyle>} />;
};
