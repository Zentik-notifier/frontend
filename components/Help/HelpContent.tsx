import { useI18n } from "@/hooks/useI18n";
import { settingsService } from "@/services/settings-service";
import React, { useEffect, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Checkbox,
  Icon,
  Modal,
  Portal,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

interface HelpContentProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  icon?: string;
  children: React.ReactNode;
}

export default function HelpContent({
  visible,
  onDismiss,
  title,
  icon = "information",
  children,
}: HelpContentProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [hideHintsChecked, setHideHintsChecked] = useState(false);

  // Reset checkbox when modal opens
  useEffect(() => {
    if (visible) {
      setHideHintsChecked(false);
    }
  }, [visible]);

  const handleClose = async () => {
    if (hideHintsChecked) {
      await settingsService.updateSettings({ hideHints: true });
    }
    onDismiss();
  };

  const deviceHeight = Dimensions.get("window").height;
  const containerStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 24,
    maxHeight: deviceHeight * 0.8,
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={containerStyle}
        dismissableBackButton
      >
        <View
          style={[
            styles.header,
            {
              borderBottomColor: theme.colors.outline,
              backgroundColor: "transparent",
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <Icon source={icon as any} size={24} color={theme.colors.primary} />
            <Text variant="titleLarge" style={styles.title}>
              {title}
            </Text>
          </View>
          <TouchableRipple
            style={styles.closeButton}
            onPress={handleClose}
            borderless
          >
            <Icon source="close" size={20} color={theme.colors.onSurface} />
          </TouchableRipple>
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>{children}</View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.outline }]}>
          <TouchableRipple
            onPress={() => setHideHintsChecked(!hideHintsChecked)}
            style={styles.checkboxContainer}
          >
            <View style={styles.checkboxRow}>
              <Checkbox
                status={hideHintsChecked ? "checked" : "unchecked"}
                onPress={() => setHideHintsChecked(!hideHintsChecked)}
              />
              <Text variant="bodySmall" style={[styles.checkboxLabel, { color: theme.colors.onSurface }]}>
                {t("help.hideHintsLabel")} {t("help.hideHintsHelperText")}
              </Text>
            </View>
          </TouchableRipple>
          <Button mode="contained" onPress={handleClose} style={styles.footerButton}>
            {t("common.close")}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  title: {
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
  },
  body: {
    maxHeight: Dimensions.get("window").height * 0.6,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  checkboxContainer: {
    borderRadius: 4,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  checkboxLabel: {
    flex: 1,
  },
  footerButton: {
    width: "100%",
  },
});

