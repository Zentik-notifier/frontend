import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Icon, Surface, TouchableRipple, useTheme, Text } from "react-native-paper";
import { useI18n } from "@/hooks/useI18n";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useAppContext } from "@/contexts/AppContext";

interface FeedbackButtonProps {
  /**
   * Variant:
   * - "header": compact, surface-based pill with icon (+ label on desktop)
   * - "text": simple outlined button (login/register footers)
   */
  variant?: "header" | "text";
}

export function FeedbackButton({ variant = "header" }: FeedbackButtonProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { isMobile } = useDeviceType();
  const { openFeedbackModal } = useAppContext();

  const label = t("feedbackModal.title") as string;

  if (variant === "text") {
    return (
      <View style={styles.textContainer}>
        <Button
          mode="outlined"
          onPress={openFeedbackModal}
          icon="comment-quote-outline"
        >
          {label}
        </Button>
      </View>
    );
  }

  return (
    <Surface
      style={[
        styles.headerWrapper,
        { backgroundColor: theme.colors.secondaryContainer },
      ]}
      elevation={2}
    >
      <TouchableRipple
        style={styles.headerButton}
        onPress={openFeedbackModal}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        <View style={styles.headerContent}>
          <Icon
            source="comment-quote"
            size={20}
            color={theme.colors.onSecondaryContainer}
          />
          {!isMobile && (
            <Text
              variant="labelLarge"
              style={{ color: theme.colors.onSecondaryContainer }}
            >
              {label}
            </Text>
          )}
        </View>
      </TouchableRipple>
    </Surface>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    borderRadius: 20,
    marginRight: 8,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  textContainer: {
    alignItems: "center",
    marginTop: 16,
  },
});


