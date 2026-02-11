import React, { useMemo, useCallback } from "react";
import {
  Alert,
  Linking,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
} from "react-native";
import { useTheme } from "react-native-paper";
import { useI18n } from "@/hooks/useI18n";
import { parseHtml, type HtmlNode } from "@/utils/html-parser";

const autoLinkText = (text: string): string => {
  let processed = text;
  const urlRegex = /(?<!href=["'])(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
  const emailRegex = /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/g;
  const phoneRegex = /\b(\+?[\d\s\-()]{10,})\b/g;

  processed = processed.replace(urlRegex, '<a href="$1">$1</a>');
  processed = processed.replace(emailRegex, '<a href="mailto:$1">$1</a>');
  processed = processed.replace(phoneRegex, (match) => {
    const cleaned = match.replace(/\s/g, "");
    if (cleaned.match(/^\+?[\d\-()]{10,}$/)) {
      return `<a href="tel:${cleaned}">${match}</a>`;
    }
    return match;
  });

  return processed;
};

const convertMarkdownToHtml = (text: string): string => {
  let processed = text;
  processed = processed.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2">$1</a>'
  );
  processed = processed.replace(/\*\*([^\*]+)\*\*/g, "<strong>$1</strong>");
  processed = processed.replace(/\*([^\*]+)\*/g, "<em>$1</em>");
  processed = processed.replace(/_([^_]+)_/g, "<em>$1</em>");
  processed = processed.replace(/`([^`]+)`/g, "<code>$1</code>");
  return processed;
};

const SAFE_URL_SCHEMES = ["http:", "https:", "mailto:", "tel:"];

function isSafeHref(href: string): boolean {
  try {
    const lower = href.trim().toLowerCase();
    return SAFE_URL_SCHEMES.some((s) => lower.startsWith(s));
  } catch {
    return false;
  }
}

export interface HtmlTextRendererProps {
  content: string;
  style?: StyleProp<TextStyle>;
  variant?: "body" | "title" | "subtitle" | "caption";
  color?: "primary" | "secondary" | "muted" | "error" | "success";
  maxLines?: number;
}

interface RenderContext {
  baseStyle: TextStyle;
  tagStyles: Record<string, TextStyle>;
  onLinkPress: (href: string) => void;
}

const CONTAINER_TAGS = new Set(["div", "body"]);
const BLOCK_TAGS = new Set(["p", "h1", "h2", "h3", "ul", "ol", "li", "blockquote", "pre"]);

function renderNodes(ctx: RenderContext, nodes: HtmlNode[], keyPrefix = ""): React.ReactNode[] {
  return nodes.flatMap((node, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (node.type === "text") {
      return <Text key={key} style={ctx.baseStyle}>{node.value}</Text>;
    }

    const { tag, attrs, children } = node;
    const tagStyle = ctx.tagStyles[tag] ?? {};

    if (tag === "br") {
      return <Text key={key}>{"\n"}</Text>;
    }

    if (tag === "a") {
      const href = attrs.href ?? "#";
      if (!isSafeHref(href)) {
        return renderNodes(ctx, children, key);
      }
      return (
        <Text
          key={key}
          style={[ctx.baseStyle, tagStyle]}
          onPress={() => ctx.onLinkPress(href)}
        >
          {renderNodes(ctx, children, key)}
        </Text>
      );
    }

    const childContent = renderNodes(ctx, children, key);
    if (CONTAINER_TAGS.has(tag)) {
      return childContent;
    }
    if (BLOCK_TAGS.has(tag)) {
      return (
        <Text key={key} style={[ctx.baseStyle, tagStyle]}>
          {"\n"}
          {childContent}
          {"\n"}
        </Text>
      );
    }

    return (
      <Text key={key} style={[ctx.baseStyle, tagStyle]}>
        {childContent}
      </Text>
    );
  });
}

const HtmlTextRendererComponent: React.FC<HtmlTextRendererProps> = ({
  content,
  style,
  variant = "body",
  color = "primary",
  maxLines,
}) => {
  const theme = useTheme();
  const { t } = useI18n();

  const themeColors = useMemo(
    () => ({
      onSurface: theme.colors.onSurface,
      onSurfaceVariant: theme.colors.onSurfaceVariant,
      outline: theme.colors.outline,
      error: theme.colors.error,
      primary: theme.colors.primary,
      surfaceVariant: theme.colors.surfaceVariant,
    }),
    [
      theme.colors.onSurface,
      theme.colors.onSurfaceVariant,
      theme.colors.outline,
      theme.colors.error,
      theme.colors.primary,
      theme.colors.surfaceVariant,
    ]
  );

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

  const variantStyle = useMemo((): TextStyle => {
    const baseStyle: TextStyle = { color: textColor };
    switch (variant) {
      case "title":
        return { ...baseStyle, fontSize: 24, fontWeight: "700", lineHeight: 32 };
      case "subtitle":
        return { ...baseStyle, fontSize: 18, fontWeight: "600", lineHeight: 24 };
      case "body":
        return { ...baseStyle, fontSize: 16, fontWeight: "400", lineHeight: 22 };
      case "caption":
        return { ...baseStyle, fontSize: 14, fontWeight: "400", lineHeight: 20 };
      default:
        return baseStyle;
    }
  }, [variant, textColor]);

  const handleLinkPress = useCallback(
    (href: string) => {
      if (href.startsWith("mailto:")) {
        const email = href.replace("mailto:", "");
        Alert.alert(
          t("common.sendEmail"),
          t("common.sendEmailConfirm", { email }),
          [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("common.send"),
              onPress: () =>
                Linking.openURL(href).catch(() =>
                  Alert.alert(t("common.error"), t("common.cannotOpenEmail"))
                ),
            },
          ]
        );
      } else if (href.startsWith("tel:")) {
        const phone = href.replace("tel:", "");
        Alert.alert(t("common.call"), t("common.callConfirm", { phone }), [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.call"),
            onPress: () =>
              Linking.openURL(href).catch(() =>
                Alert.alert(t("common.error"), t("common.cannotMakeCall"))
              ),
          },
        ]);
      } else {
        Alert.alert(
          t("common.openLink"),
          t("common.openLinkConfirm", { url: href }),
          [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("common.open"),
              onPress: () =>
                Linking.openURL(href).catch(() =>
                  Alert.alert(t("common.error"), t("common.cannotOpenLink"))
                ),
            },
          ]
        );
      }
    },
    [t]
  );

  const processedContent = useMemo(() => {
    let processed = content;
    processed = convertMarkdownToHtml(processed);
    if (!/<a\s+[^>]*href\s*=/i.test(processed)) {
      processed = autoLinkText(processed);
    }
    processed = processed.replace(/\n/g, "<br/>");
    return `<div>${processed}</div>`;
  }, [content]);

  const tagStyles = useMemo(
    () => ({
      a: { color: linkColor, textDecorationLine: "underline" as const },
      strong: { fontWeight: "700" as const },
      b: { fontWeight: "700" as const },
      em: { fontStyle: "italic" as const },
      i: { fontStyle: "italic" as const },
      h1: { fontSize: 28, fontWeight: "700" as const, marginVertical: 8 },
      h2: { fontSize: 24, fontWeight: "600" as const, marginVertical: 6 },
      h3: { fontSize: 20, fontWeight: "600" as const, marginVertical: 4 },
      p: { marginVertical: 4 },
      ul: { marginVertical: 4 },
      ol: { marginVertical: 4 },
      li: { marginVertical: 2 },
      blockquote: {
        borderLeftWidth: 4,
        borderLeftColor: textColor,
        paddingLeft: 12,
        marginVertical: 8,
        fontStyle: "italic" as const,
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
    }),
    [textColor, linkColor, themeColors]
  );

  const styleKey = useMemo(
    () => JSON.stringify(StyleSheet.flatten(style) || {}),
    [style]
  );

  const mergedBaseStyle = useMemo(() => {
    const flattenedExternalStyle = JSON.parse(styleKey);
    return { ...variantStyle, ...flattenedExternalStyle };
  }, [styleKey, variantStyle]);

  const ast = useMemo(() => parseHtml(processedContent), [processedContent]);

  const ctx: RenderContext = useMemo(
    () => ({
      baseStyle: mergedBaseStyle,
      tagStyles,
      onLinkPress: handleLinkPress,
    }),
    [mergedBaseStyle, tagStyles, handleLinkPress]
  );

  if (!content || content.trim() === "") {
    return null;
  }

  const renderedContent = renderNodes(ctx, ast);

  return (
    <Text
      style={mergedBaseStyle}
      numberOfLines={maxLines}
      ellipsizeMode={maxLines ? "tail" : undefined}
    >
      {renderedContent}
    </Text>
  );
};

export const HtmlTextRenderer = React.memo(
  HtmlTextRendererComponent,
  (prevProps, nextProps) =>
    prevProps.content === nextProps.content &&
    prevProps.variant === nextProps.variant &&
    prevProps.color === nextProps.color &&
    prevProps.maxLines === nextProps.maxLines &&
    JSON.stringify(StyleSheet.flatten(prevProps.style)) ===
      JSON.stringify(StyleSheet.flatten(nextProps.style))
);
