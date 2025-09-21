import { AppIcons } from "@/constants/Icons";
import { useColorScheme } from "@/hooks/useTheme";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  PanGestureHandler,
  PanGestureHandlerStateChangeEvent,
  State,
} from "react-native-gesture-handler";
import Icon from "./ui/Icon";

// Keep only one menu open at a time across all instances
const menuCloseHandlers = new Set<() => void>();
const closeAllMenus = () => {
  menuCloseHandlers.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
};

// Fallback to screen width if container width is not available
const { width: screenWidth } = Dimensions.get("window");

export interface SwipeAction {
  icon: keyof typeof AppIcons;
  label: string;
  backgroundColor: string;
  onPress: () => Promise<void> | void;
  showAlert?: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  };
}

interface SwipeableItemProps {
  children: React.ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  withButton?: boolean;
  containerStyle?: any;
  contentStyle?: any;
  marginBottom?: number; // New prop to customize margin
  marginHorizontal?: number; // New prop for horizontal margins
  onSwipeActiveChange?: (active: boolean) => void;
  borderRadius?: number; // Match item corner radius
}

const SwipeableItem: React.FC<SwipeableItemProps> = ({
  children,
  leftAction,
  rightAction,
  containerStyle,
  withButton = true,
  contentStyle,
  marginBottom = 12, // Default value
  marginHorizontal = 0, // Default value
  onSwipeActiveChange,
  borderRadius = 12,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const panRef = useRef<PanGestureHandler>(null);
  const [currentSwipeDirection, setCurrentSwipeDirection] = useState<
    "left" | "right" | null
  >(null);
  const [showActionBackground, setShowActionBackground] = useState<{
    direction: "left" | "right";
    action: SwipeAction;
  } | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(screenWidth);
  const colorScheme = useColorScheme();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  
  // Calculate swipe threshold based on container width
  const SWIPE_THRESHOLD = containerWidth * 0.3; // 30% of container width

  // Listen to translateX changes to update swipe direction
  React.useEffect(() => {
    const listener = translateX.addListener(({ value }) => {
      if (Math.abs(value) > 10) {
        setCurrentSwipeDirection(value > 0 ? "right" : "left");
      } else {
        setCurrentSwipeDirection(null);
      }
    });

    return () => {
      translateX.removeListener(listener);
    };
  }, [translateX]);

  // Notify parent about swipe activity changes
  React.useEffect(() => {
    onSwipeActiveChange?.(
      currentSwipeDirection !== null || !!showActionBackground
    );
  }, [currentSwipeDirection, showActionBackground, onSwipeActiveChange]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    const { state, translationX } = event.nativeEvent;

    if (state === State.BEGAN) {
      // Reset any existing swipe state when starting new gesture
      setCurrentSwipeDirection(null);
      setShowActionBackground(null);
    } else if (state === State.END) {
      if (translationX < -SWIPE_THRESHOLD && rightAction) {
        // Swipe left (negative) - Right action
        handleAction(rightAction, "right");
      } else if (translationX > SWIPE_THRESHOLD && leftAction) {
        // Swipe right (positive) - Left action
        handleAction(leftAction, "left");
      } else {
        // Return to original position
        animateToPosition(0);
      }

      // Reset swipe direction
      setCurrentSwipeDirection(null);
    } else if (state === State.CANCELLED || state === State.FAILED) {
      // Handle cancelled gestures
      animateToPosition(0);
      setCurrentSwipeDirection(null);
      setShowActionBackground(null);
    }
  };

  const animateToPosition = (position: number) => {
    Animated.spring(translateX, {
      toValue: position,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleAction = (action: SwipeAction, direction: "left" | "right") => {
    // Mantieni il background visibile durante l'azione
    setShowActionBackground({ direction, action });

    if (action.showAlert) {
      Alert.alert(action.showAlert.title, action.showAlert.message, [
        {
          text: action.showAlert.cancelText || "Cancel",
          style: "cancel",
          onPress: () => {
            setShowActionBackground(null);
            animateToPosition(0);
          },
        },
        {
          text: action.showAlert.confirmText || "Confirm",
          style: direction === "left" ? "destructive" : "default",
          onPress: async () => {
            try {
              // Animate based on direction
              const targetPosition =
                direction === "left" ? -screenWidth : screenWidth;
              Animated.timing(translateX, {
                toValue: targetPosition,
                duration: 300,
                useNativeDriver: true,
              }).start();

              await action.onPress();
              setShowActionBackground(null);
            } catch (error) {
              console.error("Error during action:", error);
              setShowActionBackground(null);
              animateToPosition(0);
              Alert.alert("Error", "Could not complete the action");
            }
          },
        },
      ]);
    } else {
      // No alert - execute action with animation
      executeActionWithAnimation(action, direction);
    }
  };

  const executeActionWithAnimation = async (
    action: SwipeAction,
    direction: "left" | "right"
  ) => {
    try {
      const animationDistance =
        direction === "left" ? screenWidth * 0.8 : -screenWidth * 0.8;

      Animated.sequence([
        Animated.timing(translateX, {
          toValue: animationDistance,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      await action.onPress();
      setShowActionBackground(null);
    } catch (error) {
      console.error("Error during action:", error);
      setShowActionBackground(null);
      animateToPosition(0);
      Alert.alert("Error", "Could not complete the action");
    }
  };

  const handleMenuActionPress = async (action?: SwipeAction) => {
    if (!action) return;
    setIsMenuVisible(false);
    try {
      await action.onPress();
    } catch (error) {
      console.error("Error during action:", error);
      Alert.alert("Error", "Could not complete the action");
    }
  };

  // Register global closer for this instance
  React.useEffect(() => {
    const closer = () => setIsMenuVisible(false);
    menuCloseHandlers.add(closer);
    return () => {
      menuCloseHandlers.delete(closer);
    };
  }, []);

  return (
    <View
      style={[
        styles.container,
        { marginBottom, marginHorizontal },
        containerStyle,
      ]}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
      }}
    >
      {/* Full background overlay during active swipe or action */}
      {currentSwipeDirection === "right" && leftAction && (
        <View
          style={[
            styles.fullBackground,
            {
              backgroundColor: leftAction.backgroundColor,
              bottom: 0,
              left: 0, // Keep full width for background
              right: 0,
              borderRadius,
              overflow: "hidden",
            },
          ]}
        >
          <View style={styles.actionLeft}>
            <Icon name={leftAction.icon} size="md" color="white" />
            <Text style={styles.actionLabel}>{leftAction.label}</Text>
          </View>
        </View>
      )}

      {currentSwipeDirection === "left" && rightAction && (
        <View
          style={[
            styles.fullBackground,
            {
              backgroundColor: rightAction.backgroundColor,
              bottom: 0,
              left: 0, // Keep full width for background
              right: 0,
              borderRadius,
              overflow: "hidden",
            },
          ]}
        >
          <View style={styles.actionRight}>
            <Icon name={rightAction.icon} size="md" color="white" />
            <Text style={styles.actionLabel}>{rightAction.label}</Text>
          </View>
        </View>
      )}

      {/* Background during modal/action */}
      {showActionBackground && (
        <View
          style={[
            styles.fullBackground,
            {
              backgroundColor: showActionBackground.action.backgroundColor,
              bottom: 0,
              left: 0, // Keep full width for background
              right: 0,
              borderRadius,
              overflow: "hidden",
            },
          ]}
        >
          <View
            style={
              showActionBackground.direction === "left"
                ? styles.actionLeft
                : styles.actionRight
            }
          >
            <Icon
              name={showActionBackground.action.icon}
              size="md"
              color="white"
            />
            <Text style={styles.actionLabel}>
              {showActionBackground.action.label}
            </Text>
          </View>
        </View>
      )}

      {/* Main content */}
      <PanGestureHandler
        ref={panRef}
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-10, 10]}
        minPointers={1}
        maxPointers={1}
        shouldCancelWhenOutside={true}
        enableTrackpadTwoFingerGesture={false}
      >
        <Animated.View
          style={[
            styles.contentContainer,
            contentStyle,
            {
              transform: [{ translateX }],
              borderRadius,
              overflow: "hidden",
            },
          ]}
        >
          {(leftAction || rightAction) && withButton && (
            <TouchableOpacity
              style={styles.burgerButton}
              onPress={() => {
                if (isMenuVisible) {
                  setIsMenuVisible(false);
                } else {
                  closeAllMenus();
                  setIsMenuVisible(true);
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.burgerIcon}>⋮</Text>
            </TouchableOpacity>
          )}
          {children}
        </Animated.View>
      </PanGestureHandler>

      {/* Inline dropdown menu */}
      {isMenuVisible && (
        <>
          {/* overlay only within the item to close on outside click */}
          <TouchableOpacity
            style={styles.inlineOverlay}
            activeOpacity={1}
            onPress={() => setIsMenuVisible(false)}
          />
          <View style={[styles.dropdownContainer, { borderRadius }]}>
            {!!leftAction && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleMenuActionPress(leftAction)}
              >
                <Icon
                  name={leftAction.icon}
                  size="xs"
                  color={leftAction.backgroundColor}
                />
                <Text style={styles.menuItemText} numberOfLines={1}>
                  {leftAction.label}
                </Text>
              </TouchableOpacity>
            )}
            {!!rightAction && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleMenuActionPress(rightAction)}
              >
                <Icon
                  name={rightAction.icon}
                  size="xs"
                  color={rightAction.backgroundColor}
                />
                <Text style={styles.menuItemText} numberOfLines={1}>
                  {rightAction.label}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    // marginBottom removed - now dynamic
  },
  fullBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  actionLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 20,
    minWidth: 80,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  actionRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingRight: 20,
    minWidth: 80,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  actionLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  contentContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  burgerButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    zIndex: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  burgerIcon: {
    fontSize: 16,
    color: "#666",
    fontWeight: "bold",
    lineHeight: 16,
  },
  inlineOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 48, // leave space so the burger remains clickable
    bottom: 48,
    zIndex: 1,
  },
  dropdownContainer: {
    position: "absolute",
    right: 8,
    bottom: 40, // place above the burger so it stays clickable
    backgroundColor: "#fff",
    paddingVertical: 4,
    paddingHorizontal: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    zIndex: 3,
  },
  colorIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  menuItemText: {
    fontSize: 13,
    color: "#333",
    marginLeft: 6,
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#f4f4f4",
  },
  cancelText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
});

export default SwipeableItem;
