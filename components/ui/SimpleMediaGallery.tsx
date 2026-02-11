import React, { useCallback, useImperativeHandle, useRef, useState } from "react";
import {
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const SPRING_CONFIG = { damping: 15, stiffness: 150 };
const SWIPE_TO_CLOSE_THRESHOLD = 80;
const DOUBLE_TAP_DURATION = 180;
const DOUBLE_TAP_EASING = Easing.out(Easing.cubic);

export interface SimpleMediaGalleryRef {
  setIndex: (index: number, animated?: boolean) => void;
}

export interface RenderItemInfo<T> {
  item: T;
  index: number;
}

export interface SimpleMediaGalleryProps<T> {
  ref?: React.Ref<SimpleMediaGalleryRef | null>;
  data: T[];
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  renderItem: (info: RenderItemInfo<T>) => React.ReactElement | null;
  keyExtractor?: (item: T, index: number) => string | number;
  numToRender?: number;
  removeClippedSubviews?: boolean;
  containerDimensions: { width: number; height: number };
  pinchEnabled?: boolean;
  swipeEnabled?: boolean;
  disableVerticalSwipe?: boolean;
  disableSwipeUp?: boolean;
  onSwipeToClose?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  style?: ViewStyle;
}

function ZoomableCell({
  children,
  width,
  height,
  pinchEnabled,
  onSwipeToClose,
  disableVerticalSwipe,
  cellIndex,
  onScaleChange,
}: {
  children: React.ReactNode;
  width: number;
  height: number;
  pinchEnabled: boolean;
  onSwipeToClose?: () => void;
  disableVerticalSwipe?: boolean;
  cellIndex: number;
  onScaleChange?: (index: number, scale: number) => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const triggerClose = useCallback(() => {
    onSwipeToClose?.();
  }, [onSwipeToClose]);

  const notifyScale = useCallback(
    (index: number, s: number) => {
      onScaleChange?.(index, s);
    },
    [onScaleChange]
  );

  const pinchGesture = Gesture.Pinch()
    .enabled(pinchEnabled)
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= MIN_SCALE) {
        translateX.value = withTiming(0, {
          duration: DOUBLE_TAP_DURATION,
          easing: DOUBLE_TAP_EASING,
        });
        translateY.value = withTiming(0, {
          duration: DOUBLE_TAP_DURATION,
          easing: DOUBLE_TAP_EASING,
        });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        const maxTx = (width * (scale.value - 1)) / 2;
        const maxTy = (height * (scale.value - 1)) / 2;
        savedTranslateX.value = Math.min(
          maxTx,
          Math.max(-maxTx, translateX.value)
        );
        savedTranslateY.value = Math.min(
          maxTy,
          Math.max(-maxTy, translateY.value)
        );
        translateX.value = savedTranslateX.value;
        translateY.value = savedTranslateY.value;
      }
      scheduleOnRN(notifyScale, cellIndex, scale.value);
    });

  const panGesture = Gesture.Pan()
    .activeOffsetX(15)
    .activeOffsetY(15)
    .onUpdate((e) => {
      if (scale.value > 1) {
        const maxTx = (width * (scale.value - 1)) / 2;
        const maxTy = (height * (scale.value - 1)) / 2;
        translateX.value = Math.min(
          maxTx,
          Math.max(-maxTx, savedTranslateX.value + e.translationX)
        );
        translateY.value = Math.min(
          maxTy,
          Math.max(-maxTy, savedTranslateY.value + e.translationY)
        );
      } else if (!disableVerticalSwipe && onSwipeToClose) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (scale.value > 1) {
        const maxTx = (width * (scale.value - 1)) / 2;
        const maxTy = (height * (scale.value - 1)) / 2;
        savedTranslateX.value = Math.min(
          maxTx,
          Math.max(-maxTx, translateX.value)
        );
        savedTranslateY.value = Math.min(
          maxTy,
          Math.max(-maxTy, translateY.value)
        );
      } else {
        if (
          !disableVerticalSwipe &&
          onSwipeToClose &&
          Math.abs(e.translationY) > SWIPE_TO_CLOSE_THRESHOLD
        ) {
          scheduleOnRN(triggerClose);
        } else {
          translateY.value = withSpring(0, SPRING_CONFIG);
        }
        savedTranslateY.value = 0;
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .enabled(pinchEnabled)
    .maxDuration(400)
    .maxDeltaX(5)
    .maxDeltaY(5)
    .onEnd((e) => {
      if (scale.value > 1) {
        scale.value = withTiming(MIN_SCALE, {
          duration: DOUBLE_TAP_DURATION,
          easing: DOUBLE_TAP_EASING,
        });
        savedScale.value = MIN_SCALE;
        translateX.value = withTiming(0, {
          duration: DOUBLE_TAP_DURATION,
          easing: DOUBLE_TAP_EASING,
        });
        translateY.value = withTiming(0, {
          duration: DOUBLE_TAP_DURATION,
          easing: DOUBLE_TAP_EASING,
        });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        const S = DOUBLE_TAP_SCALE;
        scale.value = withTiming(S, {
          duration: DOUBLE_TAP_DURATION,
          easing: DOUBLE_TAP_EASING,
        });
        savedScale.value = S;
        const maxTx = (width * (S - 1)) / 2;
        const maxTy = (height * (S - 1)) / 2;
        const tx = Math.min(
          maxTx,
          Math.max(-maxTx, S * (width / 2 - e.x))
        );
        const ty = Math.min(
          maxTy,
          Math.max(-maxTy, S * (height / 2 - e.y))
        );
        translateX.value = withTiming(tx, {
          duration: DOUBLE_TAP_DURATION,
          easing: DOUBLE_TAP_EASING,
        });
        translateY.value = withTiming(ty, {
          duration: DOUBLE_TAP_DURATION,
          easing: DOUBLE_TAP_EASING,
        });
        savedTranslateX.value = tx;
        savedTranslateY.value = ty;
      }
      scheduleOnRN(
        notifyScale,
        cellIndex,
        scale.value > 1 ? MIN_SCALE : DOUBLE_TAP_SCALE
      );
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const composed = Gesture.Simultaneous(
    doubleTapGesture,
    pinchGesture,
    panGesture
  );

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.cell, { width, height }, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

function SimpleMediaGalleryInner<T>(
  {
    data,
    initialIndex = 0,
    onIndexChange,
    renderItem,
    keyExtractor = (_, i) => String(i),
    numToRender = 3,
    removeClippedSubviews = false,
    containerDimensions,
    pinchEnabled = false,
    swipeEnabled = true,
    disableVerticalSwipe = true,
    onSwipeToClose,
    onSwipeLeft,
    onSwipeRight,
    style,
  }: SimpleMediaGalleryProps<T>,
  ref: React.Ref<SimpleMediaGalleryRef | null>
) {
  const { width, height } = containerDimensions;
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), Math.max(0, data.length - 1))
  );
  const [isZoomed, setIsZoomed] = useState(false);
  const currentIndexRef = useRef(currentIndex);
  const prevIndexRef = useRef<number | undefined>(undefined);

  currentIndexRef.current = currentIndex;

  const onIndexChangeRef = useRef(onIndexChange);
  onIndexChangeRef.current = onIndexChange;

  useImperativeHandle(
    ref,
    () => ({
      setIndex: (index: number, animated = true) => {
        const safe = Math.min(Math.max(index, 0), data.length - 1);
        setCurrentIndex(safe);
        prevIndexRef.current = safe;
        setIsZoomed(false);
        onIndexChangeRef.current?.(safe);
        flatListRef.current?.scrollToOffset({
          offset: safe * width,
          animated,
        });
      },
    }),
    [data.length, width]
  );

  const handleScaleChange = useCallback((index: number, scale: number) => {
    if (index === currentIndexRef.current) {
      setIsZoomed(scale > 1);
    }
  }, []);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / width);
      const safe = Math.min(Math.max(index, 0), data.length - 1);
      const prev = prevIndexRef.current;
      if (prev !== undefined && prev !== safe) {
        if (safe > prev) onSwipeLeft?.();
        else onSwipeRight?.();
      }
      prevIndexRef.current = safe;
      setCurrentIndex(safe);
      setIsZoomed(false);
      onIndexChange?.(safe);
    },
    [width, data.length, onIndexChange, onSwipeLeft, onSwipeRight]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width]
  );

  const needsGestures = !!pinchEnabled || !!onSwipeToClose;

  const render = useCallback(
    ({ item, index }: { item: T; index: number }) => {
      const content = renderItem({ item, index });
      if (!content) return <View style={{ width, height }} />;
      if (!needsGestures) {
        return (
          <View style={[styles.cell, { width, height }]}>
            {content}
          </View>
        );
      }
      return (
        <ZoomableCell
          width={width}
          height={height}
          pinchEnabled={!!pinchEnabled}
          onSwipeToClose={onSwipeToClose}
          disableVerticalSwipe={disableVerticalSwipe}
          cellIndex={index}
          onScaleChange={handleScaleChange}
        >
          {content}
        </ZoomableCell>
      );
    },
    [
      renderItem,
      width,
      height,
      needsGestures,
      pinchEnabled,
      onSwipeToClose,
      disableVerticalSwipe,
      handleScaleChange,
    ]
  );

  if (!width || !height || data.length === 0) {
    return <View style={[styles.container, style, { width: width || "100%", height: height || 200 }]} />;
  }

  return (
    <View style={[styles.container, style, { width, height }]}>
      <FlatList
        ref={flatListRef}
        data={data}
        renderItem={render}
        keyExtractor={(item, index) => String(keyExtractor(item, index))}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={swipeEnabled && !isZoomed}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={getItemLayout}
        initialScrollIndex={Math.min(initialIndex, data.length - 1)}
        initialNumToRender={numToRender ?? 1}
        maxToRenderPerBatch={numToRender ?? 1}
        windowSize={numToRender ?? 1}
        removeClippedSubviews={removeClippedSubviews}
        scrollEventThrottle={16}
      />
    </View>
  );
}

const SimpleMediaGallery = React.forwardRef(SimpleMediaGalleryInner) as <T>(
  props: SimpleMediaGalleryProps<T> & { ref?: React.Ref<SimpleMediaGalleryRef | null> }
) => React.ReactElement;

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  cell: {
    justifyContent: "center",
    alignItems: "center",
  },
});

export default SimpleMediaGallery;
