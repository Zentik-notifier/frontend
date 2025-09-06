import { useThemeColor } from "@/hooks/useThemeColor";
import React, { useMemo } from "react";
import {
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import HTMLView from "react-native-htmlview";

export interface HtmlTextRendererProps {
  content: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: ViewStyle;
  variant?: "body" | "title" | "subtitle" | "caption";
  color?: "primary" | "secondary" | "muted" | "error" | "success";
  maxLines?: number;
  testID?: string;
}

export const HtmlTextRenderer: React.FC<HtmlTextRendererProps> = ({
  content,
  style,
  containerStyle,
  variant = "body",
  color = "primary",
  maxLines,
  testID,
}) => {
  const textColor = useThemeColor(
    {},
    color === "primary"
      ? "text"
      : color === "secondary"
        ? "textSecondary"
        : color === "muted"
          ? "textMuted"
          : color === "error"
            ? "error"
            : color === "success"
              ? "success"
              : "text"
  );

  const linkColor = useThemeColor({}, "tint");

  // Get variant styles
  const getVariantStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      color: textColor,
    };

    switch (variant) {
      case "title":
        return {
          ...baseStyle,
          fontSize: 24,
          fontWeight: "700",
          lineHeight: 32,
        };
      case "subtitle":
        return {
          ...baseStyle,
          fontSize: 18,
          fontWeight: "600",
          lineHeight: 24,
        };
      case "body":
        return {
          ...baseStyle,
          fontSize: 16,
          fontWeight: "400",
          lineHeight: 22,
        };
      case "caption":
        return {
          ...baseStyle,
          fontSize: 14,
          fontWeight: "400",
          lineHeight: 20,
        };
      default:
        return baseStyle;
    }
  };

  // Function to truncate HTML content based on maxLines
  const truncateHtmlContent = useMemo(() => {
    if (!maxLines || maxLines <= 0) return content;

    // Remove HTML tags to count characters
    const plainText = content.replace(/<[^>]*>/g, "");

    // Estimate characters per line based on variant
    const variantStyle = getVariantStyle();
    const estimatedCharsPerLine = Math.floor(
      300 / (variantStyle.fontSize || 16)
    ); // Rough estimation

    // Calculate max characters
    const maxChars = estimatedCharsPerLine * maxLines;

    if (plainText.length <= maxChars) return content;

    // Truncate plain text
    const truncatedText = plainText.substring(0, maxChars - 3) + "...";

    // Try to preserve some basic HTML structure
    let truncatedHtml = content;

    // Find the last complete word within the limit
    const words = plainText.split(" ");
    let currentLength = 0;
    let wordIndex = 0;

    for (let i = 0; i < words.length; i++) {
      if (currentLength + words[i].length + 1 <= maxChars - 3) {
        currentLength += words[i].length + 1;
        wordIndex = i;
      } else {
        break;
      }
    }

    // Reconstruct truncated content with basic HTML preservation
    const truncatedWords = words.slice(0, wordIndex + 1).join(" ");
    truncatedHtml = truncatedWords + "...";

    return truncatedHtml;
  }, [content, maxLines, variant]);

  // Custom stylesheet for HTML rendering
  const stylesheet = StyleSheet.create({
    body: {
      color: textColor,
      fontSize: getVariantStyle().fontSize,
      fontWeight: getVariantStyle().fontWeight,
      lineHeight: getVariantStyle().lineHeight,
    },
    a: {
      color: linkColor,
      textDecorationLine: "underline",
    },
    strong: {
      fontWeight: "700",
    },
    b: {
      fontWeight: "700",
    },
    em: {
      fontStyle: "italic",
    },
    i: {
      fontStyle: "italic",
    },
    h1: {
      fontSize: 28,
      fontWeight: "700",
      marginVertical: 8,
    },
    h2: {
      fontSize: 24,
      fontWeight: "600",
      marginVertical: 6,
    },
    h3: {
      fontSize: 20,
      fontWeight: "600",
      marginVertical: 4,
    },
    p: {
      marginVertical: 4,
    },
    ul: {
      marginVertical: 4,
      paddingLeft: 20,
    },
    ol: {
      marginVertical: 4,
      paddingLeft: 20,
    },
    li: {
      marginVertical: 2,
    },
    blockquote: {
      borderLeftWidth: 4,
      borderLeftColor: textColor,
      paddingLeft: 12,
      marginVertical: 8,
      fontStyle: "italic",
    },
    code: {
      backgroundColor: useThemeColor({}, "backgroundSecondary"),
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      fontFamily: "monospace",
    },
    pre: {
      backgroundColor: useThemeColor({}, "backgroundSecondary"),
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
    },
  });

  // If no content, return null
  if (!content || content.trim() === "") {
    return null;
  }

  // const finalStyle = [getVariantStyle(), style];

  return (
    <View style={containerStyle} testID={testID}>
      <HTMLView
        value={truncateHtmlContent}
        stylesheet={stylesheet}
        // style={finalStyle}
      />
    </View>
  );
};
