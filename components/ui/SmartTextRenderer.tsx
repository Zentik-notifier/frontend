import React from "react";
import { TextInput as RNTextInput } from "react-native";
import { useTheme } from "react-native-paper";
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
  const theme = useTheme();

  // Function to detect if content contains HTML tags
  const containsHtml = (text: string): boolean => {
    if (!detectHtml) return false;

    // Simple HTML tag detection
    const htmlRegex = /<[^>]*>/;
    return htmlRegex.test(text);
  };

  // If HTML is disabled, render TextInput for selectable text
  if (!enableHtml) {
    return (
      <RNTextInput
        value={content}
        editable={false}
        multiline
        numberOfLines={maxLines}
        style={[
          {
            color: theme.colors.onSurface,
            backgroundColor: 'transparent',
            padding: 0,
            margin: 0,
          },
          style,
        ]}
        testID={testID}
      />
    );
  }

  // If HTML is forced or detected, use HtmlTextRenderer
  if (forceHtml || containsHtml(content)) {
    return <HtmlTextRenderer content={content} style={style} maxLines={maxLines} testID={testID} {...props} />;
  }

  // Otherwise, use the regular TextRenderer
  return <TextRenderer content={content} style={style} maxLines={maxLines} testID={testID} {...props} />;
};
