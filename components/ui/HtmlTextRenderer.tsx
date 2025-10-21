import React, { useMemo } from "react";
import {
  Alert,
  Linking,
  StyleProp,
  TextStyle,
  useWindowDimensions,
  ViewStyle,
} from "react-native";
import { useTheme } from "react-native-paper";
import RenderHTML from "react-native-render-html";
import { useI18n } from "@/hooks/useI18n";

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
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { t } = useI18n();

  // Auto-link URLs, emails, and phone numbers
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
  
  const getTextColor = () => {
    switch (color) {
      case "primary":
        return theme.colors.onSurface;
      case "secondary":
        return theme.colors.onSurfaceVariant;
      case "muted":
        return theme.colors.outline;
      case "error":
        return theme.colors.error;
      case "success":
        return theme.colors.primary;
      default:
        return theme.colors.onSurface;
    }
  };

  const textColor = getTextColor();
  const linkColor = theme.colors.primary;

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

  // Handle link presses
  const handleLinkPress = (evt: any, href: string) => {
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
  };

  // Process content: convert Markdown to HTML, auto-link, and handle newlines
  const processedContent = useMemo(() => {
    let processed = content;
    
    // First, convert Markdown syntax to HTML
    processed = convertMarkdownToHtml(processed);
    
    // Then, auto-link any remaining plain text URLs/emails/phones
    processed = autoLinkText(processed);
    
    // Convert newlines to <br> tags
    processed = processed.replace(/\n/g, '<br/>');
    
    // Wrap in a div to ensure proper rendering
    return `<div>${processed}</div>`;
  }, [content]);

  // Custom tags styles for react-native-render-html
  const tagsStyles = useMemo(() => ({
    body: {
      color: textColor,
      fontSize: getVariantStyle().fontSize,
      fontWeight: getVariantStyle().fontWeight,
      lineHeight: getVariantStyle().lineHeight,
    },
    div: {
      color: textColor,
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
      backgroundColor: theme.colors.surfaceVariant,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      fontFamily: "monospace",
    },
    pre: {
      backgroundColor: theme.colors.surfaceVariant,
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
    },
  }), [textColor, linkColor, variant, theme]);

  // If no content, return null
  if (!content || content.trim() === "") {
    return null;
  }

  return (
    <RenderHTML
      contentWidth={width}
      source={{ html: processedContent }}
      tagsStyles={tagsStyles as any}
      baseStyle={getVariantStyle() as any}
      systemFonts={[]}
      renderersProps={{
        a: {
          onPress: handleLinkPress,
        },
      }}
    />
  );
};
