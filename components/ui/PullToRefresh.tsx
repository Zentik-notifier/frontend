import React, { useCallback } from "react";
import { Platform, StyleSheet } from "react-native";
import { ActivityIndicator, useTheme } from "react-native-paper";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  refreshing?: boolean;
  enabled?: boolean;
  threshold?: number;
}

const REFRESH_THRESHOLD = 80;
const MAX_PULL_DISTANCE = 120;

export default function PullToRefresh({
  children,
  onRefresh,
  refreshing = false,
  enabled = true,
  threshold = REFRESH_THRESHOLD,
}: PullToRefreshProps) {
  const theme = useTheme();
  const translateY = useSharedValue(0);
  const isRefreshing = useSharedValue(false);

  const triggerRefresh = useCallback(async () => {
    isRefreshing.value = true;
    try {
      await onRefresh();
    } finally {
      isRefreshing.value = false;
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });
    }
  }, [onRefresh, isRefreshing, translateY]);

  const panGesture = Gesture.Pan()
    .enabled(enabled && !refreshing)
    .onUpdate((event) => {
      if (!enabled || isRefreshing.value) return;

      if (event.translationY > 0) {
        translateY.value = Math.min(event.translationY, MAX_PULL_DISTANCE);
      }
    })
    .onEnd(() => {
      if (!enabled || isRefreshing.value) return;

      if (translateY.value >= threshold) {
        translateY.value = withSpring(threshold, {
          damping: 15,
          stiffness: 150,
        });
        runOnJS(triggerRefresh)();
      } else {
        translateY.value = withSpring(0, {
          damping: 15,
          stiffness: 150,
        });
      }
    });

  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const indicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, threshold],
      [0, 1],
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      translateY.value,
      [0, threshold / 2, threshold],
      [0.3, 0.8, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const indicatorContainerStyle = useAnimatedStyle(() => {
    const height = Math.max(0, translateY.value);
    return {
      height,
    };
  });

  if (Platform.OS !== "web" || !enabled) {
    return <>{children}</>;
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={styles.container}>
        <Animated.View
          style={[
            styles.indicatorContainer,
            { backgroundColor: theme.colors.background },
            indicatorContainerStyle,
          ]}
        >
          <Animated.View style={[styles.indicator, indicatorStyle]}>
            {refreshing ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            )}
          </Animated.View>
        </Animated.View>
        <Animated.View style={[styles.content, containerStyle]}>
          {children}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  indicatorContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    justifyContent: "flex-end",
    alignItems: "center",
    zIndex: 1000,
  },
  indicator: {
    paddingBottom: 10,
  },
  content: {
    flex: 1,
  },
});
