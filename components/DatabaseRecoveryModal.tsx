import React, { useState } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { useAppContext } from '@/contexts/AppContext';
import {
  Dialog,
  Portal,
  Text,
  Button,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';

export function DatabaseRecoveryModal() {
  const theme = useTheme();
  const { t } = useI18n();
  const { showDatabaseRecoveryModal, setShowDatabaseRecoveryModal, handleDatabaseRecoveryRequest } = useAppContext();
  const [isRecovering, setIsRecovering] = useState(false);

  const handleRecovery = async () => {
    setIsRecovering(true);
    try {
      await handleDatabaseRecoveryRequest();
    } finally {
      setIsRecovering(false);
    }
  };

  const dismissModal = () => {
    if (!isRecovering) {
      setShowDatabaseRecoveryModal(false);
    }
  };

  return (
    <Portal>
      <Dialog
        visible={showDatabaseRecoveryModal}
        onDismiss={dismissModal}
        dismissable={!isRecovering}
        style={{ backgroundColor: theme.colors.surface }}
      >
        <Dialog.Title>{t("databaseRecovery.title")}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
            {t("databaseRecovery.description")}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 16 }}>
            {t("databaseRecovery.warning")}
          </Text>
          {isRecovering && (
            <ActivityIndicator
              size="small"
              style={{ marginTop: 8 }}
            />
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            onPress={dismissModal}
            disabled={isRecovering}
          >
            {t("common.cancel")}
          </Button>
          <Button
            mode="contained"
            onPress={handleRecovery}
            buttonColor={theme.colors.primary}
            disabled={isRecovering}
            loading={isRecovering}
          >
            {isRecovering
              ? t("databaseRecovery.recovering")
              : t("databaseRecovery.recoverButton")}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
