import React, { useMemo, useRef, useState } from "react";
import { View, PanResponder, StyleSheet, LayoutChangeEvent } from "react-native";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useTheme";
import { ThemedText } from "./ThemedText";

interface SimpleSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

export default function SimpleSlider({ value, min, max, step = 1, onChange }: SimpleSliderProps) {
  const colorScheme = useColorScheme();
  const [width, setWidth] = useState(0);
  const containerRef = useRef<View | null>(null);
  const H_PADDING = 12; // horizontal padding for the track

  const clamped = useMemo(() => Math.min(max, Math.max(min, value)), [value, min, max]);
  const stepsCount = Math.floor((max - min) / step);
  const effectiveWidth = Math.max(0, width - H_PADDING * 2);
  const progress = effectiveWidth > 0 ? (clamped - min) / (max - min) : 0;

  const handleLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const snapToStep = (raw: number) => {
    const snapped = Math.round(raw / step) * step;
    const next = Math.min(max, Math.max(min, snapped));
    if (next !== clamped) onChange(next);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          if (!width) return;
          const x = evt.nativeEvent.locationX;
          const ratio = Math.min(1, Math.max(0, x / width));
          const raw = min + ratio * (max - min);
          snapToStep(raw);
        },
        onPanResponderMove: (evt) => {
          if (!width) return;
          const x = evt.nativeEvent.locationX;
          const ratio = Math.min(1, Math.max(0, x / width));
          const raw = min + ratio * (max - min);
          snapToStep(raw);
        },
        onPanResponderTerminationRequest: () => true,
        onPanResponderRelease: () => {},
      }),
    [width, min, max, step, clamped]
  );

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.labelsRow}>
        <ThemedText style={{ color: Colors[colorScheme].textSecondary, fontSize: 12 }}>{min}</ThemedText>
        <ThemedText style={{ color: Colors[colorScheme].text, fontSize: 14, fontWeight: "600" }}>{clamped}</ThemedText>
        <ThemedText style={{ color: Colors[colorScheme].textSecondary, fontSize: 12 }}>{max}</ThemedText>
      </View>

      <View
        ref={containerRef}
        onLayout={handleLayout}
        style={[styles.container, { backgroundColor: Colors[colorScheme].border }]}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.track,
            { backgroundColor: Colors[colorScheme].border, left: H_PADDING, right: H_PADDING },
          ]}
        />
        <View
          style={[
            styles.filled,
            {
              width: effectiveWidth * progress,
              left: H_PADDING,
              backgroundColor: Colors[colorScheme].tint,
            },
          ]}
        />
        <View
          style={[
            styles.thumb,
            {
              left: H_PADDING + effectiveWidth * progress - 10,
              backgroundColor: Colors[colorScheme].background,
              borderColor: Colors[colorScheme].tint,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    overflow: "hidden",
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  track: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 3,
  },
  filled: {
    position: "absolute",
    left: 0,
    height: 6,
    borderRadius: 3,
  },
  thumb: {
    position: "absolute",
    top: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
});


