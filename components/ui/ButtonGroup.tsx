import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";

interface ButtonGroupProps {
  children: React.ReactNode;
  style?: any;
}

export default function ButtonGroup({ children, style }: ButtonGroupProps) {
  const theme = useTheme();
  const bgSecondary = theme.colors.surfaceVariant;

  return (
    <View
      style={[
        styles.buttonGroup,
        { backgroundColor: bgSecondary },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  buttonGroup: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
});
