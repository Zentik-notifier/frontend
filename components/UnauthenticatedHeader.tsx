import { useI18n } from "@/hooks/useI18n";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, Icon } from "react-native-paper";
import { AppSettingsModal } from "./AppSettingsModal";

interface UnauthenticatedHeaderProps {
  showSettingsButton?: boolean;
}

export default function UnauthenticatedHeader({ 
  showSettingsButton = true 
}: UnauthenticatedHeaderProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleSettingsPress = () => {
    setShowSettingsModal(true);
  };

  const handleCloseModal = () => {
    setShowSettingsModal(false);
  };

  if (!showSettingsButton) {
    return null;
  }

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            paddingTop: insets.top + 10,
          },
        ]}
      >
        <View style={styles.content}>
          {/* Empty space for left side to center the content */}
          <View style={styles.leftSpace} />
          
          {/* Center content (could be used for title if needed) */}
          <View style={styles.center} />
          
          {/* Right side with settings button */}
          <View style={styles.rightSection}>
            <TouchableOpacity
              style={[
                styles.settingsButton,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.outline,
                },
              ]}
              onPress={handleSettingsPress}
              accessibilityLabel={t('common.settings')}
              accessibilityRole="button"
            >
              <Icon
                source="cog"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <AppSettingsModal 
        visible={showSettingsModal}
        onClose={handleCloseModal}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    height: 44,
  },
  leftSpace: {
    width: 44, // Same width as settings button for proper centering
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    width: 44,
    alignItems: 'flex-end',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
