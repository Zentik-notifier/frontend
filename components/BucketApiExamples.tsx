import { useI18n } from "@/hooks/useI18n";
import * as Clipboard from "expo-clipboard";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Surface, Text, useTheme } from "react-native-paper";

interface BucketApiExamplesProps {
  bucketId: string;
  accessToken?: string;
  apiUrl?: string;
}

export default function BucketApiExamples({
  bucketId,
  accessToken,
  apiUrl = "https://your-server.com",
}: BucketApiExamplesProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!accessToken) {
    return (
      <Surface style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Text style={[styles.noTokenText, { color: theme.colors.onSurfaceVariant }]}>
          {t("buckets.apiExamples.noToken" as any)}
        </Text>
      </Surface>
    );
  }

  const examples = [
    {
      title: t("buckets.apiExamples.getRequest" as any),
      code: `curl "${apiUrl}/messages?token=${accessToken}&bucketId=${bucketId}&title=Hello&body=Test message"`,
    },
    {
      title: t("buckets.apiExamples.postJson" as any),
      code: `curl -X POST "${apiUrl}/messages" \\
  -H "Authorization: Bearer ${accessToken}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "bucketId": "${bucketId}",
    "title": "Hello",
    "body": "Test message"
  }'`,
    },
    {
      title: t("buckets.apiExamples.postForm" as any),
      code: `curl -X POST "${apiUrl}/messages" \\
  -H "Authorization: Bearer ${accessToken}" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "bucketId=${bucketId}" \\
  -d "title=Hello" \\
  -d "body=Test message"`,
    },
    {
      title: t("buckets.apiExamples.withHeaders" as any),
      code: `curl -X POST "${apiUrl}/messages" \\
  -H "Authorization: Bearer ${accessToken}" \\
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
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>
        {t("buckets.apiExamples.title" as any)}
      </Text>
      <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
        {t("buckets.apiExamples.description" as any)}
      </Text>

      <ScrollView style={styles.examplesContainer} nestedScrollEnabled>
        {examples.map((example, index) => (
          <Surface
            key={index}
            style={[styles.exampleCard, { backgroundColor: theme.colors.elevation.level2 }]}
            elevation={0}
          >
            <View style={styles.exampleHeader}>
              <Text style={[styles.exampleTitle, { color: theme.colors.onSurface }]}>
                {example.title}
              </Text>
              <Button
                mode="contained-tonal"
                compact
                onPress={() => handleCopy(example.code, index)}
                icon={copiedIndex === index ? "check" : "content-copy"}
              >
                {copiedIndex === index ? t("common.copied") : t("common.copy")}
              </Button>
            </View>
            <Surface
              style={[styles.codeBlock, { backgroundColor: theme.colors.surfaceVariant }]}
              elevation={0}
            >
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Text
                  style={[styles.codeText, { color: theme.colors.onSurfaceVariant }]}
                  selectable
                >
                  {example.code}
                </Text>
              </ScrollView>
            </Surface>
          </Surface>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
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
  },
  noTokenText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    padding: 16,
  },
});

