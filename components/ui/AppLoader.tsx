import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

interface AppLoaderProps {
  text?: string;
  size?: string;
  showText?: boolean;
  style?: any;
}

export const AppLoader: React.FC<AppLoaderProps> = ({
  text,
  showText = true,
  style,
}) => {
  const rotationValue = useRef(new Animated.Value(0)).current;
  const dotScaleValues = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'textSecondary');

  useEffect(() => {
    // Continuous rotation animation
    const rotationAnimation = Animated.loop(
      Animated.timing(rotationValue, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Dot scale animations with staggered timing
    const dotAnimations = dotScaleValues.map((dotScale, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(dotScale, {
            toValue: 1.3,
            duration: 800,
            delay: index * 100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dotScale, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    });

    rotationAnimation.start();
    dotAnimations.forEach(animation => animation.start());

    return () => {
      rotationAnimation.stop();
      dotAnimations.forEach(animation => animation.stop());
    };
  }, [rotationValue, dotScaleValues]);

  const rotation = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getSizeConfig = () => {
    return { 
      containerSize: 160, 
      iconSize: 96, 
      dotRadius: 55, 
      dotSize: 10,
      textSize: 16 
    };
  };

  const { containerSize, iconSize, dotRadius, dotSize, textSize } = getSizeConfig();

  // Calculate positions for 8 dots in a circle
  const dotPositions = Array.from({ length: 8 }, (_, index) => {
    const angle = (index * 45) * (Math.PI / 180); // 45 degrees apart
    return {
      x: Math.cos(angle) * dotRadius,
      y: Math.sin(angle) * dotRadius,
    };
  });

  return (
    <ThemedView style={[styles.container, style]}>
      <View style={[styles.loaderContainer, { width: containerSize, height: containerSize }]}>
        {/* Rotating dots container */}
        <Animated.View
          style={[
            styles.dotsContainer,
            {
              transform: [{ rotate: rotation }],
            },
          ]}
        >
          {dotPositions.map((position, index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotSize,
                  height: dotSize,
                  left: containerSize / 2 + position.x - dotSize / 2,
                  top: containerSize / 2 + position.y - dotSize / 2,
                  transform: [{ scale: dotScaleValues[index] }],
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* App icon in center */}
        <View style={[
          styles.iconContainer, 
          { 
            width: iconSize, 
            height: iconSize,
            left: containerSize / 2 - iconSize / 2,
            top: containerSize / 2 - iconSize / 2,
          }
        ]}>
          <Image
            source={require('@/assets/icons/icon-96x96.png')}
            style={[styles.appIcon, { width: iconSize, height: iconSize }]}
            resizeMode="contain"
          />
        </View>
        
        {/* Loading text */}
        {showText && (
          <ThemedText 
            style={[
              styles.loadingText, 
              { 
                fontSize: textSize,
                color: textColor,
                position: 'absolute',
                bottom: -80,
                left: 0,
                right: 0,
                textAlign: 'center',
              }
            ]}
          >
            {text || 'Loading...'}
          </ThemedText>
        )}
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dotsContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  dot: {
    position: 'absolute',
    backgroundColor: '#FFD700', // Yellow color
    borderRadius: 50,
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  iconContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  appIcon: {
    borderRadius: 8,
  },
  loadingText: {
    textAlign: 'center',
    fontWeight: '500',
    zIndex: 10,
  },
});

export default AppLoader;