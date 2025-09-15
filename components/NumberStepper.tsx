import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useTheme";
import { ThemedText } from "./ThemedText";

interface NumberStepperProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

export default function NumberStepper({ value, min, max, step = 1, onChange }: NumberStepperProps) {
  const colorScheme = useColorScheme();

  const decrement = () => {
    const next = Math.max(min, value - step);
    if (next !== value) onChange(next);
  };

  const increment = () => {
    const next = Math.min(max, value + step);
    if (next !== value) onChange(next);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        accessibilityLabel="decrement"
        onPress={decrement}
        style={[styles.button, { borderColor: Colors[colorScheme].border, backgroundColor: Colors[colorScheme].backgroundSecondary }]}
        activeOpacity={0.7}
      >
        <Ionicons name="remove" size={18} color={Colors[colorScheme].text} />
      </TouchableOpacity>

      <ThemedText style={[styles.valueText, { color: Colors[colorScheme].text }]}>
        {value}
      </ThemedText>

      <TouchableOpacity
        accessibilityLabel="increment"
        onPress={increment}
        style={[styles.button, { borderColor: Colors[colorScheme].border, backgroundColor: Colors[colorScheme].backgroundSecondary }]}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={18} color={Colors[colorScheme].text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  valueText: {
    minWidth: 28,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
});


