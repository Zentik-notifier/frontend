import React, { useEffect, useState } from 'react';
import { StyleSheet, Pressable, Platform, View } from 'react-native';
import { Card, Text, IconButton, useTheme } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { NotificationDeliveryType } from '@/generated/gql-operations-generated';

interface IncomingNotificationToastProps {
  title: string;
  body: string;
  imageUrl?: string;
  icon?: string;
  visible: boolean;
  onDismiss: () => void;
  onPress?: () => void;
  duration?: number; // Duration in ms before auto-dismiss (default: 5000)
  bucketColor?: string;
  deliveryType?: NotificationDeliveryType;
}

export const IncomingNotificationToast: React.FC<
  IncomingNotificationToastProps
> = ({
  title,
  body,
  imageUrl,
  icon,
  visible,
  onDismiss,
  onPress,
  duration = 5000,
  bucketColor,
  deliveryType,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [isVisible, setIsVisible] = useState(false);
  
  // Animation values
  const translateY = useSharedValue(-200);
  const opacity = useSharedValue(0);

  // Determine border color based on deliveryType
  const getBorderColor = () => {
    if (deliveryType === NotificationDeliveryType.Critical) {
      return theme.colors.error;
    } else if (deliveryType === NotificationDeliveryType.Silent) {
      return theme.colors.secondary;
    } else if (deliveryType === NotificationDeliveryType.NoPush) {
      return theme.colors.tertiary;
    } else if (bucketColor) {
      return bucketColor;
    }
    return theme.colors.primary;
  };

  // Determine border width based on deliveryType
  const getBorderWidth = () => {
    if (deliveryType === NotificationDeliveryType.Critical || 
        deliveryType === NotificationDeliveryType.Silent || 
        deliveryType === NotificationDeliveryType.NoPush) {
      return 4;
    }
    return 4;
  };

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      // Animate in
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });
      opacity.value = withTiming(1, { duration: 300 });

      // Auto-dismiss after duration
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      handleDismiss();
    }
  }, [visible]);

  const handleDismiss = () => {
    // Animate out
    translateY.value = withTiming(-200, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 }, () => {
      scheduleOnRN(setIsVisible, false);
      scheduleOnRN(onDismiss);
    });
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
    handleDismiss();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 8,
          paddingHorizontal: 16,
        },
        animatedStyle,
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={handlePress}
        android_ripple={{ color: theme.colors.primary + '20' }}
      >
        <Card
          mode="elevated"
          elevation={5}
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderLeftColor: getBorderColor(),
              borderLeftWidth: getBorderWidth(),
            },
          ]}
        >
          <Card.Content style={styles.content}>
            {/* Icon or Image */}
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                contentFit="cover"
                transition={200}
              />
            ) : icon ? (
              <IconButton
                icon={icon}
                size={32}
                iconColor={theme.colors.primary}
                style={styles.iconButton}
              />
            ) : (
              <IconButton
                icon="bell-ring"
                size={32}
                iconColor={theme.colors.primary}
                style={styles.iconButton}
              />
            )}

            {/* Content */}
            <View style={styles.textContainer}>
              <Text
                variant="titleSmall"
                numberOfLines={1}
                style={[styles.title, { color: theme.colors.onSurface }]}
              >
                {title}
              </Text>
              <Text
                variant="bodySmall"
                numberOfLines={2}
                style={[styles.body, { color: theme.colors.onSurfaceVariant }]}
              >
                {body}
              </Text>
            </View>

            {/* Dismiss button */}
            <IconButton
              icon="close"
              size={20}
              onPress={handleDismiss}
              iconColor={theme.colors.onSurfaceVariant}
              style={styles.closeButton}
            />
          </Card.Content>
        </Card>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  card: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  iconButton: {
    margin: 0,
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontWeight: '600',
    marginBottom: 2,
  },
  body: {
    lineHeight: 18,
  },
  closeButton: {
    margin: 0,
  },
});
