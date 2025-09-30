import React from "react";
import {
    StyleSheet,
    View,
} from "react-native";
import { Text, useTheme } from "react-native-paper";
import CopyButton from "./ui/CopyButton";

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
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.idRow}>
        <Text style={[styles.label, { color: theme.colors.onSurface }]}>
          {label}:
        </Text>
        <Text style={[styles.idValue, { color: theme.colors.onSurfaceVariant }, valueStyle]}>
          {id || "N/A"}
        </Text>
        <CopyButton text={id} size={20} style={styles.copyButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  content: {
    paddingVertical: 8,
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
    margin: 0,
  },
});
