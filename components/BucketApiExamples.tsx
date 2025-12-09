import { useI18n } from "@/hooks/useI18n";
import { settingsService } from "@/services/settings-service";
import * as Clipboard from "expo-clipboard";
import React, { useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Button, Surface, Text, useTheme } from "react-native-paper";

interface BucketApiExamplesProps {
  bucketId: string;
  accessToken?: string;
  magicCode?: string;
}

export default function BucketApiExamples({
  bucketId,
  accessToken: accessTokenParent,
  magicCode,
}: BucketApiExamplesProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  // Use magic code if provided, otherwise use access token
  const isUsingMagicCode = !!magicCode;
  const identifier = magicCode || accessTokenParent || "zat_<TOKEN>";
  const apiUrl = settingsService.getApiUrl();
  
  const examples = isUsingMagicCode
    ? [
        {
          title: t("buckets.apiExamples.getRequest" as any),
          code: `curl "${apiUrl}/message?magicCode=${magicCode}&title=Hello&body=Test message"`,
        },
        {
          title: t("buckets.apiExamples.postJson" as any),
          code: `curl -X POST "${apiUrl}/message" \\
  -H "Content-Type: application/json" \\
  -d '{
    "magicCode": "${magicCode}",
    "title": "Hello",
    "body": "Test message"
  }'`,
        },
        {
          title: t("buckets.apiExamples.postForm" as any),
          code: `curl -X POST "${apiUrl}/message" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "magicCode=${magicCode}" \\
  -d "title=Hello" \\
  -d "body=Test message"`,
        },
        {
          title: t("buckets.apiExamples.withHeaders" as any),
          code: `curl -X POST "${apiUrl}/message" \\
  -H "x-message-magicCode: ${magicCode}" \\
  -H "x-message-title: Hello" \\
  -H "x-message-body: Test message"`,
        },
      ]
    : [
        {
          title: t("buckets.apiExamples.getRequest" as any),
          code: `curl "${apiUrl}/message?token=${identifier}&bucketId=${bucketId}&title=Hello&body=Test message"`,
        },
        {
          title: t("buckets.apiExamples.postJson" as any),
          code: `curl -X POST "${apiUrl}/message" \\
  -H "Authorization: Bearer ${identifier}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "bucketId": "${bucketId}",
    "title": "Hello",
    "body": "Test message"
  }'`,
        },
        {
          title: t("buckets.apiExamples.postForm" as any),
          code: `curl -X POST "${apiUrl}/message" \\
  -H "Authorization: Bearer ${identifier}" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "bucketId=${bucketId}" \\
  -d "title=Hello" \\
  -d "body=Test message"`,
        },
        {
          title: t("buckets.apiExamples.withHeaders" as any),
          code: `curl -X POST "${apiUrl}/message" \\
  -H "Authorization: Bearer ${identifier}" \\
  -H "x-message-bucketId: ${bucketId}" \\
  -H "x-message-title: Hello" \\
  -H "x-message-body: Test message"`,
        },
      ];

  const handleCopy = async (code: string, index: number) => {
    try {
      await Clipboard.setStringAsync(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.examplesContainer} nestedScrollEnabled>
        {examples.map((example, index) => (
          <Surface
            key={index}
            style={[
              styles.exampleCard,
              { backgroundColor: theme.colors.elevation.level2 },
            ]}
            elevation={0}
          >
            <View style={styles.exampleHeader}>
              <Text
                style={[styles.exampleTitle, { color: theme.colors.onSurface }]}
              >
                {example.title}
              </Text>
              <Button
                mode="contained-tonal"
                compact
                onPress={() => handleCopy(example.code, index)}
                icon={copiedIndex === index ? "check" : "content-copy"}
              >
                {copiedIndex === index
                  ? t("common.copiedToClipboard")
                  : t("common.copy")}
              </Button>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TextInput
                style={[
                  styles.codeText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
                value={example.code}
                editable={false}
                multiline
              />
            </ScrollView>
          </Surface>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // No margin - DetailModal provides padding
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
  },
  examplesContainer: {
    maxHeight: 500,
  },
  exampleCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  exampleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  codeBlock: {
    padding: 12,
    borderRadius: 6,
  },
  codeText: {
    fontFamily: "monospace",
    fontSize: 12,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  noTokenText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    padding: 16,
  },
});
