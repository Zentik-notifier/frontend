import { useCallback } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { useImportExportNotifications } from '@/services/notifications-repository';
import { getAllNotificationsFromCache } from '@/services/notifications-repository';

export function useNotificationExportImport(onImportSuccess?: (notifications: any[]) => void) {
  const { t } = useI18n();
  const { exportAllNotifications, importAllNotifications } = useImportExportNotifications();

  const handleExportNotifications = useCallback(async () => {
    try {
      return await exportAllNotifications();
    } catch (error) {
      console.error("Export failed:", error);
      return false;
    }
  }, [exportAllNotifications]);

  const handleImportNotifications = useCallback(async () => {
    try {
      const success = await importAllNotifications();
      if (success && onImportSuccess) {
        const notifications = await getAllNotificationsFromCache();
        onImportSuccess(notifications);
      }
      return success;
    } catch (error) {
      console.error("Import failed:", error);
      return false;
    }
  }, [importAllNotifications, onImportSuccess]);

  return {
    handleExportNotifications,
    handleImportNotifications,
  };
}
