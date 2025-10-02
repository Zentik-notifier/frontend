import React, { useRef, useState } from "react";
import { Platform } from "react-native";
import {
  Animated,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  PanGestureHandler,
  PanGestureHandlerStateChangeEvent,
  State,
} from "react-native-gesture-handler";
import {
  Dialog,
  Icon,
  Portal,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";

// Fallback to screen width if container width is not available
const { width: screenWidth } = Dimensions.get("window");

export interface SwipeAction {
  icon: string;
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

const enableSwipe = Platform.OS !== "web";

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
  const scaleValue = useRef(new Animated.Value(1)).current;
  const panRef = useRef<PanGestureHandler>(null);
  const [currentSwipeDirection, setCurrentSwipeDirection] = useState<
    "left" | "right" | null
  >(null);
  const [showActionBackground, setShowActionBackground] = useState<{
    direction: "left" | "right";
    action: SwipeAction;
  } | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(screenWidth);
  const theme = useTheme();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const burgerButtonRef = useRef<View>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    action: SwipeAction;
    direction: "left" | "right";
  } | null>(null);

  // Calculate swipe threshold based on container width
  const SWIPE_THRESHOLD = containerWidth * 0.3; // 30% of container width

  // Listen to translateX changes to update swipe direction - optimized
  React.useEffect(() => {
    let lastValue = 0;
    const listener = translateX.addListener(({ value }) => {
      // Only update if there's a significant change to reduce re-renders
      if (Math.abs(value - lastValue) > 5) {
        lastValue = value;
        if (Math.abs(value) > 10) {
          setCurrentSwipeDirection(value > 0 ? "right" : "left");
        } else {
          setCurrentSwipeDirection(null);
        }
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
    {
      useNativeDriver: true,
      listener: undefined, // Remove any additional listeners for better performance
    }
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
      tension: 300,
      friction: 10,
      overshootClamping: true,
    }).start();
  };

  const animateActionFeedback = () => {
    // Quick scale animation for feedback
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleAction = (action: SwipeAction, direction: "left" | "right") => {
    // Mantieni il background visibile durante l'azione
    setShowActionBackground({ direction, action });

    if (action.showAlert) {
      setPendingAction({ action, direction });
      setShowConfirmDialog(true);
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
      // Trigger feedback animation immediately
      animateActionFeedback();

      // Execute action immediately
      await action.onPress();

      // Return to original position immediately after action
      animateToPosition(0);

      // Clear action background
      setShowActionBackground(null);
    } catch (error) {
      console.error("Error during action:", error);
      setShowActionBackground(null);
      animateToPosition(0);
      // Error handling will be done via dialog
    }
  };

  const handleMenuActionPress = async (action?: SwipeAction) => {
    if (!action) return;
    try {
      // Trigger feedback animation immediately
      animateActionFeedback();

      await action.onPress();
    } catch (error) {
      console.error("Error during action:", error);
      // Error handling will be done via dialog
    }
  };

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
            <Icon source={leftAction.icon} size={24} color="white" />
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
            <Icon source={rightAction.icon} size={24} color="white" />
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
              source={showActionBackground.action.icon}
              size={24}
              color="white"
            />
            <Text style={styles.actionLabel}>
              {showActionBackground.action.label}
            </Text>
          </View>
        </View>
      )}

      {/* Main content */}
      {enableSwipe ? (
        <PanGestureHandler
          ref={panRef}
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
          activeOffsetX={[-5, 5]}
          minPointers={1}
          maxPointers={1}
          shouldCancelWhenOutside={true}
          enableTrackpadTwoFingerGesture={false}
          avgTouches={true}
          failOffsetX={[-50, 50]}
        >
          <Animated.View
            style={[
              styles.contentContainer,
              contentStyle,
              {
                transform: [{ translateX }, { scale: scaleValue }],
                borderRadius,
                overflow: "hidden",
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            {(leftAction || rightAction) && withButton && (
              <TouchableOpacity
                ref={burgerButtonRef}
                style={[
                  styles.burgerButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
                onPress={() => {
                  if (burgerButtonRef.current) {
                    burgerButtonRef.current.measure(
                      (
                        x: number,
                        y: number,
                        width: number,
                        height: number,
                        pageX: number,
                        pageY: number
                      ) => {
                        setMenuPosition({
                          top: pageY + height + 8, // Sotto il pulsante
                          right: screenWidth - pageX - width, // Allineato a destra
                        });
                        setIsMenuVisible(true);
                      }
                    );
                  }
                }}
                activeOpacity={0.7}
              >
                <Icon
                  source="dots-vertical"
                  size={18}
                  color={theme.colors.onSurface}
                />
              </TouchableOpacity>
            )}
            {children}
          </Animated.View>
        </PanGestureHandler>
      ) : (
        <View
          style={[
            styles.contentContainer,
            contentStyle,
            {
              borderRadius,
              overflow: "hidden",
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          {(leftAction || rightAction) && withButton && (
            <TouchableOpacity
              ref={burgerButtonRef}
              style={[
                styles.burgerButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
              onPress={() => {
                if (burgerButtonRef.current) {
                  burgerButtonRef.current.measure(
                    (
                      x: number,
                      y: number,
                      width: number,
                      height: number,
                      pageX: number,
                      pageY: number
                    ) => {
                      setMenuPosition({
                        top: pageY + height + 8, // Sotto il pulsante
                        right: screenWidth - pageX - width, // Allineato a destra
                      });
                      setIsMenuVisible(true);
                    }
                  );
                }
              }}
              activeOpacity={0.7}
            >
              <Icon
                source="dots-vertical"
                size={18}
                color={theme.colors.onSurface}
              />
            </TouchableOpacity>
          )}
          {children}
        </View>
      )}

      {/* Popup menu */}
      {(leftAction || rightAction) && withButton && isMenuVisible && (
        <Portal>
          <TouchableOpacity
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "transparent",
            }}
            onPress={() => setIsMenuVisible(false)}
            activeOpacity={1}
          />
          <Surface
            style={{
              position: "absolute",
              top: menuPosition.top,
              right: menuPosition.right,
              backgroundColor: theme.colors.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
              padding: 8,
              elevation: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
            }}
          >
            {!!leftAction && (
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  { backgroundColor: theme.colors.surface },
                ]}
                onPress={() => {
                  setIsMenuVisible(false);
                  handleMenuActionPress(leftAction);
                }}
                activeOpacity={0.7}
              >
                <Icon
                  source={leftAction.icon}
                  size={16}
                  color={leftAction.backgroundColor}
                />
                <Text
                  style={[
                    styles.menuItemText,
                    { color: theme.colors.onSurface },
                  ]}
                  numberOfLines={1}
                >
                  {leftAction.label}
                </Text>
              </TouchableOpacity>
            )}
            {!!rightAction && (
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  { backgroundColor: theme.colors.surface },
                ]}
                onPress={() => {
                  setIsMenuVisible(false);
                  handleMenuActionPress(rightAction);
                }}
                activeOpacity={0.7}
              >
                <Icon
                  source={rightAction.icon}
                  size={16}
                  color={rightAction.backgroundColor}
                />
                <Text
                  style={[
                    styles.menuItemText,
                    { color: theme.colors.onSurface },
                  ]}
                  numberOfLines={1}
                >
                  {rightAction.label}
                </Text>
              </TouchableOpacity>
            )}
          </Surface>
        </Portal>
      )}

      {/* Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={showConfirmDialog}
          onDismiss={() => {
            setShowConfirmDialog(false);
            setPendingAction(null);
            setShowActionBackground(null);
            animateToPosition(0);
          }}
        >
          <Dialog.Title>
            {pendingAction?.action.showAlert?.title || "Confirm Action"}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {pendingAction?.action.showAlert?.message ||
                "Are you sure you want to perform this action?"}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Text
              onPress={() => {
                setShowConfirmDialog(false);
                setPendingAction(null);
                setShowActionBackground(null);
                animateToPosition(0);
              }}
              style={{ color: theme.colors.primary }}
            >
              {pendingAction?.action.showAlert?.cancelText || "Cancel"}
            </Text>
            <Text
              onPress={async () => {
                if (!pendingAction) return;

                setShowConfirmDialog(false);
                try {
                  // Animate based on direction
                  const targetPosition =
                    pendingAction.direction === "left"
                      ? -screenWidth
                      : screenWidth;
                  Animated.timing(translateX, {
                    toValue: targetPosition,
                    duration: 300,
                    useNativeDriver: true,
                  }).start();

                  await pendingAction.action.onPress();
                  setShowActionBackground(null);
                } catch (error) {
                  console.error("Error during action:", error);
                  setShowActionBackground(null);
                  animateToPosition(0);
                }
                setPendingAction(null);
              }}
              style={{
                color:
                  pendingAction?.direction === "left"
                    ? theme.colors.error
                    : theme.colors.primary,
              }}
            >
              {pendingAction?.action.showAlert?.confirmText || "Confirm"}
            </Text>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
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
