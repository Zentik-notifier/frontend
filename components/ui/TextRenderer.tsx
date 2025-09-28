import React, { useMemo } from "react";
import { Alert, Linking, StyleProp, TextStyle, View, ViewStyle } from "react-native";
import { Text, useTheme } from "react-native-paper";

export interface TextRendererProps {
  content: string;
  style?: StyleProp<TextStyle> ;
  containerStyle?: ViewStyle;
  variant?: "body" | "title" | "subtitle" | "caption";
  color?: "primary" | "secondary" | "muted" | "error" | "success";
  allowHtml?: boolean;
  preserveWhitespace?: boolean;
  maxLines?: number;
  onLinkPress?: (url: string) => void;
  testID?: string;
}

interface TextSegment {
  type: "text" | "link" | "bold" | "italic" | "break" | "email" | "phone" | "url";
  content: string;
  url?: string;
  contactType?: "email" | "phone" | "url";
}

export const TextRenderer: React.FC<TextRendererProps> = ({
  content,
  style,
  containerStyle,
  variant = "body",
  color = "primary",
  allowHtml = true,
  preserveWhitespace = true,
  maxLines,
  onLinkPress,
  testID,
}) => {
  const theme = useTheme();
  
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

  // Regular expressions for contact detection
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const phoneRegex = /(?:\+?(?:39|0039)\s?)?(?:(?:0\d{1,4}[\s.-]?\d{4,8})|(?:3\d{2}[\s.-]?\d{6,7})|(?:\d{3}[\s.-]?\d{3}[\s.-]?\d{4}))/g;
  const urlRegex = /https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?/g;

  // Handle contact actions
  const handleEmailPress = (email: string) => {
    Alert.alert(
      "Invia Email",
      `Vuoi inviare un'email a ${email}?`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Invia",
          onPress: () => {
            Linking.openURL(`mailto:${email}`).catch(() => {
              Alert.alert("Errore", "Impossibile aprire l'app email");
            });
          },
        },
      ]
    );
  };

  const handlePhonePress = (phone: string) => {
    Alert.alert(
      "Chiama",
      `Vuoi chiamare ${phone}?`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Chiama",
          onPress: () => {
            Linking.openURL(`tel:${phone.replace(/[\s.-]/g, "")}`).catch(() => {
              Alert.alert("Errore", "Impossibile aprire l'app telefono");
            });
          },
        },
      ]
    );
  };

  const handleUrlPress = (url: string) => {
    if (onLinkPress) {
      onLinkPress(url);
    } else {
      Alert.alert(
        "Apri link",
        `Vuoi aprire questo link?\n${url}`,
        [
          { text: "Annulla", style: "cancel" },
          {
            text: "Apri",
            onPress: () => {
              Linking.openURL(url).catch(() => {
                Alert.alert("Errore", "Impossibile aprire il link");
              });
            },
          },
        ]
      );
    }
  };

  // Parse content into segments
  const segments = useMemo((): TextSegment[] => {
    if (!content) return [];

    let processedContent = content;

    // Handle newlines if preserveWhitespace is true
    if (preserveWhitespace) {
      processedContent = processedContent
        .replace(/\\n/g, "\n")
        .replace(/\\r\\n/g, "\n")
        .replace(/\\r/g, "\n");
    }

    // If HTML is not allowed, just handle line breaks and contacts
    if (!allowHtml) {
      const lines = processedContent.split("\n");
      const result: TextSegment[] = [];

      lines.forEach((line, index) => {
        if (line.trim()) {
          // Detect contacts in the line even when HTML is disabled
          const lineSegments = detectAndReplaceContacts(line);
          result.push(...lineSegments);
        }
        if (index < lines.length - 1) {
          result.push({ type: "break", content: "" });
        }
      });

      return result;
    }

    // Parse HTML-like content and detect contacts
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi;
    const result: TextSegment[] = [];

    let lastIndex = 0;
    let currentText = processedContent;

    // Function to detect and replace contacts in text
    const detectAndReplaceContacts = (text: string): TextSegment[] => {
      const segments: TextSegment[] = [];
      let lastIdx = 0;

      // Create array of all matches with their positions
      const allMatches: {
        index: number;
        length: number;
        type: "email" | "phone" | "url";
        match: string;
      }[] = [];

      // Find emails
      let match;
      emailRegex.lastIndex = 0;
      while ((match = emailRegex.exec(text)) !== null) {
        allMatches.push({
          index: match.index,
          length: match[0].length,
          type: "email",
          match: match[0],
        });
      }

      // Find phone numbers
      phoneRegex.lastIndex = 0;
      while ((match = phoneRegex.exec(text)) !== null) {
        allMatches.push({
          index: match.index,
          length: match[0].length,
          type: "phone",
          match: match[0],
        });
      }

      // Find URLs
      urlRegex.lastIndex = 0;
      while ((match = urlRegex.exec(text)) !== null) {
        allMatches.push({
          index: match.index,
          length: match[0].length,
          type: "url",
          match: match[0],
        });
      }

      // Sort matches by position
      allMatches.sort((a, b) => a.index - b.index);

      // Remove overlapping matches (keep the first one)
      const cleanMatches: {
        index: number;
        length: number;
        type: "email" | "phone" | "url";
        match: string;
      }[] = [];
      for (let i = 0; i < allMatches.length; i++) {
        const current = allMatches[i];
        const isOverlapping = cleanMatches.some(
          (existing) =>
            current.index < existing.index + existing.length &&
            current.index + current.length > existing.index
        );
        if (!isOverlapping) {
          cleanMatches.push(current);
        }
      }

      // Build segments
      for (const contactMatch of cleanMatches) {
        // Add text before contact
        if (contactMatch.index > lastIdx) {
          const beforeText = text.substring(lastIdx, contactMatch.index);
          if (beforeText.trim()) {
            segments.push({ type: "text", content: beforeText });
          }
        }

        // Add contact segment
        segments.push({
          type: contactMatch.type,
          content: contactMatch.match,
          contactType: contactMatch.type,
          url: contactMatch.match,
        });

        lastIdx = contactMatch.index + contactMatch.length;
      }

      // Add remaining text
      if (lastIdx < text.length) {
        const remainingText = text.substring(lastIdx);
        if (remainingText.trim()) {
          segments.push({ type: "text", content: remainingText });
        }
      }

      return segments.length > 0 ? segments : [{ type: "text", content: text }];
    };

    // First, handle links
    let linkMatch;
    const linkMatches: {
      start: number;
      end: number;
      url: string;
      text: string;
    }[] = [];

    while ((linkMatch = linkRegex.exec(currentText)) !== null) {
      linkMatches.push({
        start: linkMatch.index,
        end: linkMatch.index + linkMatch[0].length,
        url: linkMatch[2],
        text: linkMatch[3],
      });
    }

    // Process links from right to left to maintain indices
    for (let i = linkMatches.length - 1; i >= 0; i--) {
      const match = linkMatches[i];
      const before = currentText.substring(0, match.start);
      const after = currentText.substring(match.end);

      // Add text before link
      if (before.length > lastIndex) {
        const beforeText = before.substring(lastIndex);
        if (beforeText.trim()) {
          result.unshift({ type: "text", content: beforeText });
        }
      }

      // Add link
      result.unshift({
        type: "link",
        content: match.text,
        url: match.url,
      });

      currentText = before + after;
      lastIndex = 0;
    }

    // Handle remaining text with basic HTML tags
    const remainingText = currentText;
    const simpleHtmlRegex = /<(\/?)(?:b|strong|i|em|br\/?)(?:\s+[^>]*)?>/gi;

    let textIndex = 0;
    let match;

    while ((match = simpleHtmlRegex.exec(remainingText)) !== null) {
      // Add text before tag with contact detection
      const beforeTag = remainingText.substring(textIndex, match.index);
      if (beforeTag) {
        // Handle line breaks in text
        const lines = beforeTag.split("\n");
        lines.forEach((line, index) => {
          if (line.trim()) {
            // Detect contacts in the line
            const lineSegments = detectAndReplaceContacts(line);
            result.push(...lineSegments);
          }
          if (index < lines.length - 1) {
            result.push({ type: "break", content: "" });
          }
        });
      }

      const isClosing = match[1] === "/";
      const tagName = match[0].toLowerCase();

      if (tagName.includes("br")) {
        result.push({ type: "break", content: "" });
      } else if (
        !isClosing &&
        (tagName.includes("b") || tagName.includes("strong"))
      ) {
        // Find closing tag and add bold segment
        const closingRegex = new RegExp(`<\/(b|strong)>`, "i");
        const closingMatch = closingRegex.exec(
          remainingText.substring(match.index + match[0].length)
        );

        if (closingMatch) {
          const boldContent = remainingText.substring(
            match.index + match[0].length,
            match.index + match[0].length + closingMatch.index
          );
          result.push({ type: "bold", content: boldContent });

          // Skip to after closing tag
          textIndex =
            match.index +
            match[0].length +
            closingMatch.index +
            closingMatch[0].length;
          simpleHtmlRegex.lastIndex = textIndex;
          continue;
        }
      } else if (
        !isClosing &&
        (tagName.includes("i") || tagName.includes("em"))
      ) {
        // Find closing tag and add italic segment
        const closingRegex = new RegExp(`<\/(i|em)>`, "i");
        const closingMatch = closingRegex.exec(
          remainingText.substring(match.index + match[0].length)
        );

        if (closingMatch) {
          const italicContent = remainingText.substring(
            match.index + match[0].length,
            match.index + match[0].length + closingMatch.index
          );
          result.push({ type: "italic", content: italicContent });

          // Skip to after closing tag
          textIndex =
            match.index +
            match[0].length +
            closingMatch.index +
            closingMatch[0].length;
          simpleHtmlRegex.lastIndex = textIndex;
          continue;
        }
      }

      textIndex = match.index + match[0].length;
    }

    // Add remaining text with contact detection
    const remainingAfterTags = remainingText.substring(textIndex);
    if (remainingAfterTags) {
      const lines = remainingAfterTags.split("\n");
      lines.forEach((line, index) => {
        if (line.trim()) {
          // Detect contacts in the line
          const lineSegments = detectAndReplaceContacts(line);
          result.push(...lineSegments);
        }
        if (index < lines.length - 1) {
          result.push({ type: "break", content: "" });
        }
      });
    }

    return result;
  }, [content, allowHtml, preserveWhitespace]);

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

  const handleLinkPress = (url: string) => {
    if (onLinkPress) {
      onLinkPress(url);
    } else {
      Alert.alert("Apri link", `Vuoi aprire questo link?\n${url}`, [
        { text: "Annulla", style: "cancel" },
        {
          text: "Apri",
          onPress: () => {
            Linking.openURL(url).catch(() => {
              Alert.alert("Errore", "Impossibile aprire il link");
            });
          },
        },
      ]);
    }
  };

  const renderSegment = (segment: TextSegment, index: number) => {
    const baseStyle = getVariantStyle();

    switch (segment.type) {
      case "break":
        return "\n";

      case "link":
        return (
          <Text
            key={index}
            style={[
              baseStyle,
              { color: linkColor, textDecorationLine: "underline" },
            ]}
            onPress={() => segment.url && handleLinkPress(segment.url)}
          >
            {segment.content}
          </Text>
        );

      case "email":
        return (
          <Text
            key={index}
            style={[
              baseStyle,
              { color: linkColor, textDecorationLine: "underline" },
            ]}
            onPress={() => handleEmailPress(segment.content)}
          >
            {segment.content}
          </Text>
        );

      case "phone":
        return (
          <Text
            key={index}
            style={[
              baseStyle,
              { color: linkColor, textDecorationLine: "underline" },
            ]}
            onPress={() => handlePhonePress(segment.content)}
          >
            {segment.content}
          </Text>
        );

      case "url":
        return (
          <Text
            key={index}
            style={[
              baseStyle,
              { color: linkColor, textDecorationLine: "underline" },
            ]}
            onPress={() => handleUrlPress(segment.content)}
          >
            {segment.content}
          </Text>
        );

      case "bold":
        return (
          <Text key={index} style={[baseStyle, { fontWeight: "700" }]}>
            {segment.content}
          </Text>
        );

      case "italic":
        return (
          <Text key={index} style={[baseStyle, { fontStyle: "italic" }]}>
            {segment.content}
          </Text>
        );

      case "text":
      default:
        return segment.content;
    }
  };

  // If no segments or empty content, return null
  if (!segments.length) {
    return null;
  }

  const finalStyle = [getVariantStyle(), style];

  return (
    <View style={containerStyle} testID={testID}>
      <Text style={finalStyle} numberOfLines={maxLines} ellipsizeMode="tail">
        {segments.map(renderSegment)}
      </Text>
    </View>
  );
};
