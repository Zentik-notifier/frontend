import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";

interface ButtonGroupProps {
  children: React.ReactNode;
  style?: any;
  variant?: "default" | "compact" | "segmented";
}

export default function ButtonGroup({
  children,
  style,
  variant = "default",
}: ButtonGroupProps) {
  const theme = useTheme();
  const bgSecondary = theme.colors.surfaceVariant;

  const isCompact = variant === "compact";
  const isSegmented = variant === "segmented";
  
  const buttonGroupStyle = isCompact
    ? styles.buttonGroupCompact
    : isSegmented
    ? styles.buttonGroupSegmented
    : styles.buttonGroup;
  const dividerStyle = isCompact ? styles.dividerCompact : styles.divider;

  const childrenArray = React.Children.toArray(children);
  
  // For segmented variant, wrap each child with additional styling
  const processedChildren = isSegmented
    ? childrenArray.map((child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            key: child.key || `segmented-${index}`,
            style: [
              child.props.style,
              index === 0 && styles.segmentedButtonFirst,
              index === childrenArray.length - 1 && styles.segmentedButtonLast,
              index > 0 && index < childrenArray.length - 1 && styles.segmentedButtonMiddle,
              styles.segmentedButton,
            ],
          });
        }
        return child;
      })
    : childrenArray;

  const childrenWithDividers = processedChildren.reduce<React.ReactNode[]>(
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
    <View style={[buttonGroupStyle, !isSegmented && { backgroundColor: bgSecondary }, style]}>
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
  buttonGroupSegmented: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 8,
    overflow: "hidden",
    gap: 0,
    padding: 0,
    backgroundColor: "transparent",
  },
  segmentedButton: {
    borderRadius: 0,
    margin: 0,
    marginHorizontal: 0,
    marginVertical: 0,
    minWidth: 0,
  },
  segmentedButtonFirst: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  segmentedButtonLast: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  segmentedButtonMiddle: {
    borderRadius: 0,
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
