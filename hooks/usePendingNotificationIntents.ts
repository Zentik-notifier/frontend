import { useNavigationUtils } from '@/utils/navigation';
import { useCallback } from 'react';
import { Linking } from 'react-native';
import { clearPendingNavigationIntent, getPendingNavigationIntent } from '../services/auth-storage';
import { useMarkNotificationAsReadMutation } from '@/generated/gql-operations-generated';

export function usePendingNotificationIntents() {
  const { navigateToNotificationDetail } = useNavigationUtils();
  const [markAsReadGQL] = useMarkNotificationAsReadMutation();

  const processPendingNavigationIntent = useCallback(async () => {
    try {
      const intent = await getPendingNavigationIntent();
      if (intent) {
        console.log(`[PendingIntents] Pending navigation intent found: ${JSON.stringify(intent)}`);
      } else {
        console.log('[PendingIntents] No Pending navigation intent found');
        return false;
      }

      // Expecting format: { type: 'NAVIGATE' | 'OPEN_NOTIFICATION', value: string }
      if (typeof intent?.value === 'string' && intent.value.length > 0) {
        if (intent.type === 'OPEN_NOTIFICATION') {
          console.log('[PendingIntents] 📂 Opening notification detail for ID:', intent.value);
          
          // Mark notification as read when opening via intent
          try {
            await markAsReadGQL({ variables: { id: intent.value } });
            console.log('[PendingIntents] ✅ Notification marked as read:', intent.value);
          } catch (error) {
            console.error('[PendingIntents] ⚠️ Failed to mark notification as read:', error);
          }
          
          try {
            navigateToNotificationDetail(intent.value);
          } catch (e) {
            console.warn('[PendingIntents] ⚠️ Failed to navigate via router, falling back to deep link');
            await Linking.openURL(`zentik://notifications/${intent.value}`);
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

      await clearPendingNavigationIntent();
      console.log('[PendingIntents] 🧭 Pending navigation intent processed and cleared');
      return true;
    } catch (error) {
      console.error('[PendingIntents] ❌ Error processing pending navigation intent:', error);
      return false;
    }
  }, [markAsReadGQL]);

  return {
    processPendingNavigationIntent,
  };
}
