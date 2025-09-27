import * as Clipboard from 'expo-clipboard';
import React, { useState } from "react";
import { IconButton, useTheme } from "react-native-paper";

interface CopyButtonProps {
  text: string;
  onPress?: () => void;
  size?: number;
  style?: any;
  disabled?: boolean;
}

export default function CopyButton({
  text,
  onPress,
  size = 20,
  style,
  disabled = false,
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
