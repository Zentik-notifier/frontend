import React from "react";
import { Text } from "react-native-paper";
import { HtmlTextRenderer } from "./HtmlTextRenderer";
import type { TextRendererProps } from "./TextRenderer";
import { TextRenderer } from "./TextRenderer";

export interface SmartTextRendererProps extends TextRendererProps {
  forceHtml?: boolean;
  detectHtml?: boolean;
  enableHtml?: boolean;
}

export const SmartTextRenderer: React.FC<SmartTextRendererProps> = ({
  content,
  forceHtml = false,
  detectHtml = true,
  enableHtml = true,
  style,
  maxLines,
  testID,
  ...props
}) => {
  // Function to detect if content contains HTML tags
  const containsHtml = (text: string): boolean => {
    if (!detectHtml) return false;

    // Simple HTML tag detection
    const htmlRegex = /<[^>]*>/;
    return htmlRegex.test(text);
  };

  // If HTML is disabled, render simple Text component
  if (!enableHtml) {
    return (
      <Text 
        style={style}
        numberOfLines={maxLines}
        ellipsizeMode={maxLines ? "tail" : undefined}
        testID={testID}
      >
        {content}
      </Text>
    );
  }

  // If HTML is forced or detected, use HtmlTextRenderer
  if (forceHtml || containsHtml(content)) {
    return <HtmlTextRenderer content={content} style={style} maxLines={maxLines} testID={testID} {...props} />;
  }

  // Otherwise, use the regular TextRenderer
  return <TextRenderer content={content} style={style} maxLines={maxLines} testID={testID} {...props} />;
};
