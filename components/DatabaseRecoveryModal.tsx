import React from 'react';
import { useI18n } from '@/hooks/useI18n';
import type { TranslationKeyPath } from '@/hooks/useI18n';
import { databaseRecoveryService, useDatabaseRecoveryState } from '@/services/database-recovery-service';
import { useQueryClient } from '@tanstack/react-query';
import { Platform, View } from 'react-native';
import {
  Dialog,
  Portal,
  Text,
  Button,
  useTheme,
  ActivityIndicator,
  ProgressBar,
} from 'react-native-paper';

export function DatabaseRecoveryModal() {
  const theme = useTheme();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { visible, isRecovering, statusMessage, progressCurrent, progressTotal, lastRecoveryError } = useDatabaseRecoveryState();

  const progress =
    typeof progressCurrent === 'number' &&
    typeof progressTotal === 'number' &&
    progressTotal > 0
      ? Math.max(0, Math.min(1, progressCurrent / progressTotal))
      : null;

  const isIOS = Platform.OS === 'ios';

  const statusKeyMap: Record<string, TranslationKeyPath> = {
    starting: 'databaseRecovery.status.starting',
    backup: 'databaseRecovery.status.backup',
    export: 'databaseRecovery.status.export',
    import: 'databaseRecovery.status.import',
    reset: 'databaseRecovery.status.reset',
    fetch_backend: 'databaseRecovery.status.fetch_backend',
    save_backend: 'databaseRecovery.status.save_backend',
    fetch_cloudkit: 'databaseRecovery.status.fetch_cloudkit',
    upsert_notifications: 'databaseRecovery.status.upsert_notifications',
  };

  const statusText: string | null =
    statusMessage && statusKeyMap[statusMessage]
      ? String(t(statusKeyMap[statusMessage]))
      : statusMessage
        ? String(t('databaseRecovery.recoveryInProgress'))
        : null;

  const afterRecovery = async () => {
    // Recovery is a special case: safest is invalidating everything.
    try {
      await queryClient.invalidateQueries();
    } catch {
      // ignore
    }
  };

  const handleRecoveryLocal = async () => {
    await databaseRecoveryService.recover();
    await afterRecovery();
  };

  const handleRecoveryBackend = async () => {
    await databaseRecoveryService.recoverFromBackend();
    await afterRecovery();
  };

  const handleRecoveryICloud = async () => {
    await databaseRecoveryService.recoverNotificationsFromICloud();
    await afterRecovery();
  };

  const dismissModal = () => {
    if (!isRecovering) {
      databaseRecoveryService.dismiss();
    }
  };

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={dismissModal}
        dismissable={!isRecovering}
        style={{ backgroundColor: theme.colors.surface }}
      >
        <Dialog.Title>{t("databaseRecovery.title")}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
            {t("databaseRecovery.choiceDescription")}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 16 }}>
            {t("databaseRecovery.warning")}
          </Text>

          {!!lastRecoveryError && (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 12 }}>
              {t('databaseRecovery.recoveryError')}: {lastRecoveryError}
            </Text>
          )}

          {isRecovering && (
            <View style={{ gap: 8 }}>
              {!!statusText && (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {statusText}
                </Text>
              )}
              {progress !== null && (
                <ProgressBar progress={progress} />
              )}
              <ActivityIndicator size="small" style={{ marginTop: 4 }} />
            </View>
          )}

          {!isRecovering && (
            <View style={{ gap: 10, marginTop: 4, alignItems: 'stretch' }}>
              <Button
                mode="contained"
                onPress={handleRecoveryBackend}
                buttonColor={theme.colors.primary}
                style={{ width: '100%' }}
              >
                {t('databaseRecovery.recoverFromBackendButton')}
              </Button>
              <Button
                mode="outlined"
                onPress={handleRecoveryLocal}
                style={{ width: '100%' }}
              >
                {t('databaseRecovery.recoverFromLocalButton')}
              </Button>
              <Button
                mode="outlined"
                onPress={handleRecoveryICloud}
                disabled={!isIOS}
                style={{ width: '100%' }}
              >
                {t('databaseRecovery.recoverFromICloudButton')}
              </Button>
              {!isIOS && (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('databaseRecovery.iCloudOnlyOnIOS')}
                </Text>
              )}
            </View>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            onPress={dismissModal}
            disabled={isRecovering}
          >
            {t("common.cancel")}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
