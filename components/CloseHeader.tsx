import { Colors } from "@/constants/Colors";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { HeaderBackButton } from "@react-navigation/elements";
import React from "react";
import { StyleSheet, View } from "react-native";

interface CloseHeaderProps {
  onClose: () => void;
}

export default function CloseHeader({ onClose }: CloseHeaderProps) {
  const { t } = useI18n();
  const colorScheme = useColorScheme();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: Colors[colorScheme].backgroundCard,
          borderBottomColor: Colors[colorScheme].border,
        },
      ]}
    >
      <HeaderBackButton
        onPress={onClose}
        tintColor={Colors[colorScheme].text}
        label={t("common.back")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 3,
    borderBottomWidth: 1,
  },
});
