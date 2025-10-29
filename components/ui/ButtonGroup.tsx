import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";

interface ButtonGroupProps {
  children: React.ReactNode;
  style?: any;
  variant?: "default" | "compact";
}

export default function ButtonGroup({
  children,
  style,
  variant = "default",
}: ButtonGroupProps) {
  const theme = useTheme();
  const bgSecondary = theme.colors.surfaceVariant;

  const isCompact = variant === "compact";
  const buttonGroupStyle = isCompact
    ? styles.buttonGroupCompact
    : styles.buttonGroup;
  const dividerStyle = isCompact ? styles.dividerCompact : styles.divider;

  const childrenArray = React.Children.toArray(children);
  const childrenWithDividers = childrenArray.reduce<React.ReactNode[]>(
    (acc, child, index) => {
      acc.push(child);
      // if (index < childrenArray.length - 1) {
      //   acc.push(
      //     <View
      //       key={`divider-${index}`}
      //       style={[
      //         dividerStyle,
      //         {
      //           backgroundColor: theme.colors.outlineVariant,
      //           alignSelf: "stretch",
      //           transform: [{ scaleY: 0.75 }], // 75% dell'altezza
      //         },
      //       ]}
      //     />
      //   );
      // }
      return acc;
    },
    []
  );

  return (
    <View style={[buttonGroupStyle, { backgroundColor: bgSecondary }, style]}>
      {childrenWithDividers}
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
  buttonGroupCompact: {
    flexDirection: "row",
    alignItems: "center", // ✅ Centra verticalmente tutti gli elementi incluso il divisore
    paddingVertical: 2,
    paddingHorizontal: 3,
    borderRadius: 8,
  },
  divider: {
    width: 1,
    height: "100%",
    marginHorizontal: 2,
  },
  dividerCompact: {
    width: 1,
    height: "100%",
    marginHorizontal: 2,
  },
});
