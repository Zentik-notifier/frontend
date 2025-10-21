import { useNavigationUtils } from '@/utils/navigation';
import { useCallback } from 'react';
import { Linking } from 'react-native';
import { settingsRepository } from '@/services/settings-repository';
import { apolloClient } from '@/config/apollo-client';
import { MarkNotificationAsReadDocument } from '@/generated/gql-operations-generated';
import { createNotificationLink } from '@/utils/universal-links';

export function usePendingNotificationIntents() {
  const { navigateToNotificationDetail } = useNavigationUtils();

  const processPendingNavigationIntent = useCallback(async () => {
    try {
      // Read directly from database (realtime) instead of cached value
      const intentStr = await settingsRepository.getSetting('auth_pendingNavigationIntent');
      if (!intentStr) {
        console.log('[PendingIntents] No Pending navigation intent found');
        return false;
      }

      const intent = JSON.parse(intentStr);
      console.log(`[PendingIntents] Pending navigation intent found: ${JSON.stringify(intent)}`);

      // Expecting format: { type: 'NAVIGATE' | 'OPEN_NOTIFICATION', value: string }
      if (typeof intent?.value === 'string' && intent.value.length > 0) {
        if (intent.type === 'OPEN_NOTIFICATION') {
          console.log('[PendingIntents] 📂 Opening notification detail for ID:', intent.value);

          // Mark notification as read when opening via intent
          if (apolloClient) {
            try {
              await apolloClient.mutate({
                mutation: MarkNotificationAsReadDocument,
                variables: { id: intent.value },
              });
              console.log('[PendingIntents] ✅ Notification marked as read:', intent.value);
            } catch (error) {
              console.error('[PendingIntents] ⚠️ Failed to mark notification as read:', error);
            }
          } else {
            console.warn('[PendingIntents] ⚠️ Apollo client not initialized, skipping mark as read');
          }

          try {
            navigateToNotificationDetail(intent.value);
          } catch (e) {
            console.warn('[PendingIntents] ⚠️ Failed to navigate via router');
          }
        } else if (intent.type === 'NAVIGATE') {
          console.log('[PendingIntents] 🧭 Opening deep link for pending intent:', intent.value);
          await Linking.openURL(intent.value);
        } else {
          console.log('[PendingIntents] ⚠️ Unknown intent type, ignoring:', intent.type);
        }
      } else {
        console.log('[PendingIntents] ⚠️ Intent value missing or invalid', intent?.value);
      }

      // Clear intent directly from database
      await settingsRepository.removeSetting('auth_pendingNavigationIntent');
      console.log('[PendingIntents] 🧭 Pending navigation intent processed and cleared');
      return true;
    } catch (error) {
      console.error('[PendingIntents] ❌ Error processing pending navigation intent:', error);
      return false;
    }
  }, [navigateToNotificationDetail]);

  return {
    processPendingNavigationIntent,
  };
}
