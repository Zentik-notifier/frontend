import { AppIcons } from '@/constants/Icons';
import { useColorScheme } from '@/hooks/useTheme';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerStateChangeEvent,
  State,
} from 'react-native-gesture-handler';
import Icon from './ui/Icon';

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.3; // 30% of screen width

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
  containerStyle?: any;
  contentStyle?: any;
  marginBottom?: number; // New prop to customize margin
  marginHorizontal?: number; // New prop for horizontal margins
  onSwipeActiveChange?: (active: boolean) => void;
}

const SwipeableItem: React.FC<SwipeableItemProps> = ({
  children,
  leftAction,
  rightAction,
  containerStyle,
  contentStyle,
  marginBottom = 12, // Default value
  marginHorizontal = 0, // Default value
  onSwipeActiveChange,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const panRef = useRef<PanGestureHandler>(null);
  const [currentSwipeDirection, setCurrentSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [showActionBackground, setShowActionBackground] = useState<{direction: 'left' | 'right', action: SwipeAction} | null>(null);
  const colorScheme = useColorScheme();

  // Listen to translateX changes to update swipe direction
  React.useEffect(() => {
    const listener = translateX.addListener(({ value }) => {
      if (Math.abs(value) > 10) {
        setCurrentSwipeDirection(value > 0 ? 'right' : 'left');
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
    onSwipeActiveChange?.(currentSwipeDirection !== null || !!showActionBackground);
  }, [currentSwipeDirection, showActionBackground, onSwipeActiveChange]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      
      if (translationX < -SWIPE_THRESHOLD && rightAction) {
        // Swipe left (negative) - Right action
        handleAction(rightAction, 'right');
      } else if (translationX > SWIPE_THRESHOLD && leftAction) {
        // Swipe right (positive) - Left action  
        handleAction(leftAction, 'left');
      } else {
        // Return to original position
        animateToPosition(0);
      }
      
      // Reset swipe direction
      setCurrentSwipeDirection(null);
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

  const handleAction = (action: SwipeAction, direction: 'left' | 'right') => {
    // Mantieni il background visibile durante l'azione
    setShowActionBackground({ direction, action });
    
    if (action.showAlert) {
      Alert.alert(
        action.showAlert.title,
        action.showAlert.message,
        [
          {
            text: action.showAlert.cancelText || 'Cancel',
            style: 'cancel',
            onPress: () => {
              setShowActionBackground(null);
              animateToPosition(0);
            },
          },
          {
            text: action.showAlert.confirmText || 'Confirm',
            style: direction === 'left' ? 'destructive' : 'default',
            onPress: async () => {
              try {
                // Animate based on direction
                const targetPosition = direction === 'left' ? -screenWidth : screenWidth;
                Animated.timing(translateX, {
                  toValue: targetPosition,
                  duration: 300,
                  useNativeDriver: true,
                }).start();
                
                await action.onPress();
                setShowActionBackground(null);
              } catch (error) {
                console.error('Error during action:', error);
                setShowActionBackground(null);
                animateToPosition(0);
                Alert.alert('Error', 'Could not complete the action');
              }
            },
          },
        ]
      );
    } else {
      // No alert - execute action with animation
      executeActionWithAnimation(action, direction);
    }
  };

  const executeActionWithAnimation = async (action: SwipeAction, direction: 'left' | 'right') => {
    try {
      const animationDistance = direction === 'left' ? screenWidth * 0.8 : -screenWidth * 0.8;
      
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
      console.error('Error during action:', error);
      setShowActionBackground(null);
      animateToPosition(0);
      Alert.alert('Error', 'Could not complete the action');
    }
  };
  
  return (
    <View style={[styles.container, { marginBottom, marginHorizontal }, containerStyle]}>
      {/* Full background overlay during active swipe or action */}
      {(currentSwipeDirection === 'right' && leftAction) && (
        <View style={[styles.fullBackground, { 
          backgroundColor: leftAction.backgroundColor,
          bottom: marginBottom, // Use dynamic margin
          left: 0, // Keep full width for background
          right: 0,
        }]}> 
          <View style={styles.actionLeft}>
            <Icon name={leftAction.icon} size="md" color="white" />
            <Text style={styles.actionLabel}>{leftAction.label}</Text>
          </View>
        </View>
      )}
      
      {(currentSwipeDirection === 'left' && rightAction) && (
        <View style={[styles.fullBackground, { 
          backgroundColor: rightAction.backgroundColor,
          bottom: marginBottom, // Use dynamic margin
          left: 0, // Keep full width for background
          right: 0,
        }]}> 
          <View style={styles.actionRight}>
            <Icon name={rightAction.icon} size="md" color="white" />
            <Text style={styles.actionLabel}>{rightAction.label}</Text>
          </View>
        </View>
      )}

      {/* Background during modal/action */}
      {showActionBackground && (
        <View style={[styles.fullBackground, { 
          backgroundColor: showActionBackground.action.backgroundColor,
          bottom: marginBottom, // Use dynamic margin
          left: 0, // Keep full width for background
          right: 0,
        }]}> 
          <View style={showActionBackground.direction === 'left' ? styles.actionLeft : styles.actionRight}>
            <Icon name={showActionBackground.action.icon} size="md" color="white" />
            <Text style={styles.actionLabel}>{showActionBackground.action.label}</Text>
          </View>
        </View>
      )}

      {/* Main content */}
      <PanGestureHandler
        ref={panRef}
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-10, 10]}
      >
        <Animated.View
          style={[
            styles.contentContainer,
            contentStyle,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    // marginBottom removed - now dynamic
  },
  fullBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // bottom: 12, // Now dynamic based on marginBottom prop
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 20,
    minWidth: 80,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  actionRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 20,
    minWidth: 80,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  contentContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export default SwipeableItem;
