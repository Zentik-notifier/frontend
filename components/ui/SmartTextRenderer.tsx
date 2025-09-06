import React from "react";
import { HtmlTextRenderer } from "./HtmlTextRenderer";
import type { TextRendererProps } from "./TextRenderer";
import { TextRenderer } from "./TextRenderer";

export interface SmartTextRendererProps extends TextRendererProps {
  forceHtml?: boolean;
  detectHtml?: boolean;
}

export const SmartTextRenderer: React.FC<SmartTextRendererProps> = ({
  content,
  forceHtml = false,
  detectHtml = true,
  ...props
}) => {
  // Function to detect if content contains HTML tags
  const containsHtml = (text: string): boolean => {
    if (!detectHtml) return false;

    // Simple HTML tag detection
    const htmlRegex = /<[^>]*>/;
    return htmlRegex.test(text);
  };

  // If HTML is forced or detected, use HtmlTextRenderer
  if (forceHtml || containsHtml(content)) {
    return <HtmlTextRenderer content={content} {...props} />;
  }

  // Otherwise, use the regular TextRenderer
  return <TextRenderer content={content} {...props} />;
};
