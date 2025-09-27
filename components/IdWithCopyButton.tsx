import * as Clipboard from 'expo-clipboard';
import React from "react";
import {
    Alert,
    StyleSheet,
    View,
} from "react-native";
import { Card, IconButton, Text, useTheme } from "react-native-paper";

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
  
  const copyIdToClipboard = async () => {
    if (id && id !== "N/A") {
      await Clipboard.setStringAsync(id);
      Alert.alert("Copied!", copyMessage);
    }
  };

  return (
    <Card style={[styles.container, style]}>
      <Card.Content style={styles.content}>
        <View style={styles.idRow}>
          <Text style={[styles.label, { color: theme.colors.onSurface }]}>
            {label}:
          </Text>
          <Text style={[styles.idValue, { color: theme.colors.onSurfaceVariant }, valueStyle]}>
            {id || "N/A"}
          </Text>
          <IconButton
            icon="content-copy"
            size={20}
            iconColor={theme.colors.primary}
            onPress={copyIdToClipboard}
            style={styles.copyButton}
          />
        </View>
      </Card.Content>
    </Card>
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
