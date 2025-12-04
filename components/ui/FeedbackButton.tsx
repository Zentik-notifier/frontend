import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, IconButton, useTheme, Text } from "react-native-paper";
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
    <View style={styles.headerContainer}>
      <IconButton
        icon="comment-quote"
        size={20}
        iconColor={theme.colors.onSecondaryContainer}
        containerColor={theme.colors.secondaryContainer}
        onPress={openFeedbackModal}
        accessibilityLabel={label}
        style={styles.headerButton}
      />
      {!isMobile && (
        <Text
          variant="labelLarge"
          style={[
            styles.headerLabel,
            { color: theme.colors.onSecondaryContainer },
          ]}
        >
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  headerButton: {
    margin: 0,
  },
  headerLabel: {
    marginLeft: 4,
  },
  textContainer: {
    alignItems: "center",
    marginTop: 16,
  },
});


