import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useTheme";
import * as Clipboard from 'expo-clipboard';
import React from "react";
import {
    Alert,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import Icon from "./ui/Icon";

interface IdWithCopyButtonProps {
  id: string;
  label: string;
  copyMessage?: string;
  style?: any;
  valueStyle?: any;
}

export default function IdWithCopyButton({
  id,
  label,
  copyMessage = "ID copied to clipboard",
  style,
  valueStyle,
}: IdWithCopyButtonProps) {
  const colorScheme = useColorScheme();
  
  const copyIdToClipboard = async () => {
    if (id && id !== "N/A") {
      await Clipboard.setStringAsync(id);
      Alert.alert("Copied!", copyMessage);
    }
  };

  return (
    <ThemedView style={[
      styles.field, 
      { backgroundColor: Colors[colorScheme].backgroundCard },
      style
    ]}>
      <ThemedView style={[
        styles.idRow,
        { backgroundColor: 'transparent' }
      ]}>
        <ThemedText style={styles.label}>{label}:</ThemedText>
        <ThemedText style={[styles.idValue, valueStyle]}>{id || "N/A"}</ThemedText>
        <TouchableOpacity
          style={[
            styles.copyButton,
            { backgroundColor: Colors[colorScheme].backgroundSecondary }
          ]}
          onPress={copyIdToClipboard}
        >
          <Icon name="copy" size="sm" color={Colors[colorScheme].tabIconDefault} />
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
    flexShrink: 0,
  },
  idRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  idValue: {
    fontSize: 12,
    fontFamily: "monospace",
    flex: 1,
    marginRight: 8,
  },
  copyButton: {
    padding: 4,
    borderRadius: 4,
    flexShrink: 0,
  },
});
