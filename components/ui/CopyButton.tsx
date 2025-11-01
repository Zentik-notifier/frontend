import * as Clipboard from 'expo-clipboard';
import React, { useState } from "react";
import { IconButton, useTheme, Button } from "react-native-paper";
import { View } from "react-native";

interface CopyButtonProps {
  text: string;
  onPress?: () => void;
  size?: number;
  style?: any;
  disabled?: boolean;
  /** Optional label to display next to the icon. When provided, renders as an outlined button instead of icon-only */
  label?: string;
  /** Optional custom success label when text is copied. Defaults to "Copied!" */
  successLabel?: string;
}

export default function CopyButton({
  text,
  onPress,
  size = 20,
  style,
  disabled = false,
  label,
  successLabel,
}: CopyButtonProps) {
  const theme = useTheme();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleCopy = async () => {
    if (text && text !== "N/A" && !disabled) {
      await Clipboard.setStringAsync(text);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 1000);
      
      // Call optional onPress callback
      if (onPress) {
        onPress();
      }
    }
  };

  if (label) {
    return (
      <Button
        mode="outlined"
        compact
        icon={showSuccess ? "check" : "content-copy"}
        onPress={handleCopy}
        style={style}
        disabled={disabled}
      >
        {showSuccess ? (successLabel || "Copied!") : label}
      </Button>
    );
  }

  return (
    <IconButton
      icon={showSuccess ? "check" : "content-copy"}
      size={size}
      iconColor={showSuccess ? "#4CAF50" : theme.colors.primary}
      onPress={handleCopy}
      style={style}
      disabled={disabled}
    />
  );
}
