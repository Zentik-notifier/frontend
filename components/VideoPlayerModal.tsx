import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useState } from 'react';
import {
    Modal,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { ThemedText } from './ThemedText';

interface VideoPlayerModalProps {
  visible: boolean;
  videoUrl: string;
  title?: string;
  onClose: () => void;
}

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  visible,
  videoUrl,
  title,
  onClose,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = false;
    player.addListener('playingChange', (event) => {
      setIsPlaying(event.isPlaying);
    });
  });

  const togglePlayback = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleVideoPress = () => {
    setShowControls(!showControls);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          {title && (
            <ThemedText style={styles.title} numberOfLines={1}>
              {title}
            </ThemedText>
          )}
        </View>

        <View style={styles.videoContainer}>
          <TouchableOpacity
            style={styles.videoWrapper}
            onPress={handleVideoPress}
            activeOpacity={1}
          >
            <VideoView
              style={styles.video}
              player={player}
              allowsFullscreen={false}
              allowsPictureInPicture
            />

            {showControls && (
              <View style={styles.controlsOverlay}>
                <TouchableOpacity
                  onPress={togglePlayback}
                  style={styles.playButton}
                >
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={48}
                    color="white"
                  />
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 50,
    padding: 16,
  },
});

export default VideoPlayerModal;
