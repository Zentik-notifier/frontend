import React, { useMemo, useCallback } from "react";
import {
  Alert,
  Linking,
  StyleProp,
  StyleSheet,
  TextStyle,
  useWindowDimensions,
  ViewStyle,
} from "react-native";
import { useTheme } from "react-native-paper";
import RenderHTML from "react-native-render-html";
import { useI18n } from "@/hooks/useI18n";

// Pure helper functions - moved outside component to prevent recreation
const autoLinkText = (text: string): string => {
  let processed = text;
  
  // Regex patterns (migliorati per supportare trattini e caratteri speciali)
  const urlRegex = /(?<!href=["'])(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
  const emailRegex = /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/g;
  const phoneRegex = /\b(\+?[\d\s\-()]{10,})\b/g;
  
  // Auto-link URLs (skip already in href attributes)
  processed = processed.replace(urlRegex, '<a href="$1">$1</a>');
  
  // Auto-link emails
  processed = processed.replace(emailRegex, '<a href="mailto:$1">$1</a>');
  
  // Auto-link phone numbers (Italian format priority)
  processed = processed.replace(phoneRegex, (match) => {
    const cleaned = match.replace(/\s/g, '');
    if (cleaned.match(/^\+?[\d\-()]{10,}$/)) {
      return `<a href="tel:${cleaned}">${match}</a>`;
    }
    return match;
  });
  
  return processed;
};

// Convert Markdown to HTML
const convertMarkdownToHtml = (text: string): string => {
  let processed = text;
  
  // Convert [text](url) to <a href="url">text</a>
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Convert **text** to <strong>text</strong>
  processed = processed.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
  
  // Convert *text* or _text_ to <em>text</em>
  processed = processed.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
  processed = processed.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  // Convert `code` to <code>code</code>
  processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  return processed;
};

export interface HtmlTextRendererProps {
  content: string;
  style?: StyleProp<TextStyle>;
  variant?: "body" | "title" | "subtitle" | "caption";
  color?: "primary" | "secondary" | "muted" | "error" | "success";
}

const HtmlTextRendererComponent: React.FC<HtmlTextRendererProps> = ({
  content,
  style,
  variant = "body",
  color = "primary",
}) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { t } = useI18n();

  // Extract only the theme colors we need to prevent unnecessary rerenders
  const themeColors = useMemo(() => ({
    onSurface: theme.colors.onSurface,
    onSurfaceVariant: theme.colors.onSurfaceVariant,
    outline: theme.colors.outline,
    error: theme.colors.error,
    primary: theme.colors.primary,
    surfaceVariant: theme.colors.surfaceVariant,
  }), [
    theme.colors.onSurface,
    theme.colors.onSurfaceVariant,
    theme.colors.outline,
    theme.colors.error,
    theme.colors.primary,
    theme.colors.surfaceVariant,
  ]);

  // Get text color based on color prop
  const textColor = useMemo(() => {
    switch (color) {
      case "primary":
        return themeColors.onSurface;
      case "secondary":
        return themeColors.onSurfaceVariant;
      case "muted":
        return themeColors.outline;
      case "error":
        return themeColors.error;
      case "success":
        return themeColors.primary;
      default:
        return themeColors.onSurface;
    }
  }, [color, themeColors]);

  const linkColor = useMemo(() => themeColors.primary, [themeColors]);

  // Get variant styles - memoized
  const variantStyle = useMemo((): TextStyle => {
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
  }, [variant, textColor]);

  // Handle link presses - memoized to prevent renderersProps recreation
  const handleLinkPress = useCallback((evt: any, href: string) => {
    if (href.startsWith('mailto:')) {
      const email = href.replace('mailto:', '');
      Alert.alert(
        t('common.sendEmail'),
        t('common.sendEmailConfirm', { email }),
        [
          { text: t('common.cancel'), style: "cancel" },
          {
            text: t('common.send'),
            onPress: () => {
              Linking.openURL(href).catch(() => {
                Alert.alert(t('common.error'), t('common.cannotOpenEmail'));
              });
            },
          },
        ]
      );
    } else if (href.startsWith('tel:')) {
      const phone = href.replace('tel:', '');
      Alert.alert(
        t('common.call'),
        t('common.callConfirm', { phone }),
        [
          { text: t('common.cancel'), style: "cancel" },
          {
            text: t('common.call'),
            onPress: () => {
              Linking.openURL(href).catch(() => {
                Alert.alert(t('common.error'), t('common.cannotMakeCall'));
              });
            },
          },
        ]
      );
    } else {
      Alert.alert(
        t('common.openLink'),
        t('common.openLinkConfirm', { url: href }),
        [
          { text: t('common.cancel'), style: "cancel" },
          {
            text: t('common.open'),
            onPress: () => {
              Linking.openURL(href).catch(() => {
                Alert.alert(t('common.error'), t('common.cannotOpenLink'));
              });
            },
          },
        ]
      );
    }
  }, [t]);

  // Process content: convert Markdown to HTML, auto-link, and handle newlines
  const processedContent = useMemo(() => {
    let processed = content;
    
    // First, convert Markdown syntax to HTML
    processed = convertMarkdownToHtml(processed);
    
    // Only auto-link if content doesn't already contain HTML anchor tags
    // This prevents interfering with existing <a href="..."> tags
    if (!/<a\s+[^>]*href\s*=/i.test(processed)) {
      processed = autoLinkText(processed);
    }
    
    // Convert newlines to <br> tags
    processed = processed.replace(/\n/g, '<br/>');
    
    // Wrap in a div to ensure proper rendering
    return `<div>${processed}</div>`;
  }, [content]);

  // Custom tags styles for react-native-render-html
  const tagsStyles = useMemo(() => ({
    body: {
      // Don't set styles on body tag - let baseStyle handle it
      // This prevents overriding parent styles
    },
    div: {
      // Don't set color here either - baseStyle handles it
    },
    a: {
      color: linkColor,
      textDecorationLine: "underline" as const,
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
    },
    ol: {
      marginVertical: 4,
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
      backgroundColor: themeColors.surfaceVariant,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      fontFamily: "monospace",
    },
    pre: {
      backgroundColor: themeColors.surfaceVariant,
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
    },
  }), [textColor, linkColor, variantStyle, themeColors]);

  // Merge external styles with variant styles
  // Use JSON.stringify for stable comparison of style object
  const styleKey = useMemo(() => 
    JSON.stringify(StyleSheet.flatten(style) || {})
  , [style]);
  
  const mergedBaseStyle = useMemo(() => {
    const flattenedExternalStyle = JSON.parse(styleKey);
    
    return {
      ...variantStyle,
      ...flattenedExternalStyle,
    };
  }, [styleKey, variantStyle]);

  // Memoize renderersProps to prevent recreation on every render
  const renderersProps = useMemo(() => ({
    a: {
      onPress: handleLinkPress,
    },
  }), [handleLinkPress]);

  // If no content, return null
  if (!content || content.trim() === "") {
    return null;
  }

  return (
    <RenderHTML
      contentWidth={width}
      source={{ html: processedContent }}
      tagsStyles={tagsStyles as any}
      baseStyle={mergedBaseStyle as any}
      renderersProps={renderersProps as any}
    />
  );
};

// Memoize the entire component to prevent unnecessary rerenders
export const HtmlTextRenderer = React.memo(HtmlTextRendererComponent, (prevProps, nextProps) => {
  // Custom comparison: only rerender if these props actually changed
  return (
    prevProps.content === nextProps.content &&
    prevProps.variant === nextProps.variant &&
    prevProps.color === nextProps.color &&
    JSON.stringify(StyleSheet.flatten(prevProps.style)) === JSON.stringify(StyleSheet.flatten(nextProps.style))
  );
});
