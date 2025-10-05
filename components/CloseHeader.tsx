import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import {
  Icon,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";

interface CloseHeaderProps {
  onClose?: () => void;
}

export default function CloseHeader({ onClose }: CloseHeaderProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const { navigateBack } = useNavigationUtils();

  return (
    <Surface
      style={[
        styles.header,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.outline,
        },
      ]}
      elevation={1}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={onClose || navigateBack}
        accessibilityLabel={t("common.back")}
        accessibilityRole="button"
      >
        <Icon
          source="arrow-left"
          size={24}
          color={theme.colors.onSurface}
        />
        <Text
          variant="titleMedium"
          style={{ color: theme.colors.onSurface }}
        >
          {t("common.back")}
        </Text>
      </TouchableOpacity>
    </Surface>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
  },
});
