import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import IosBridgeService from '@/services/ios-bridge';
import { notificationKeys } from './useNotificationQueries';
// import { bucketKeys } from './useBucketMutations';

/**
 * Hook per sincronizzare i dati quando CloudKit invia notifiche di cambiamento
 * 
 * Questo hook ascolta gli eventi CloudKit inviati da iOS quando Watch (o altri dispositivi)
 * modificano i dati. Quando riceve un evento:
 * 1. Invalida le query React Query appropriate
 * 2. Forza il re-fetch dei dati aggiornati
 * 3. Aggiorna la UI automaticamente
 * 
 * Eventi supportati:
 * - onCloudKitNotificationRead: Notifica marcata come letta
 * - onCloudKitNotificationUnread: Notifica marcata come non letta
 * - onCloudKitNotificationDeleted: Notifica eliminata
 * - onCloudKitBucketChanged: Bucket creato/modificato/eliminato
 */
// export function useCloudKitSync() {
//   const queryClient = useQueryClient();

//   useEffect(() => {
//     console.log('[CloudKitSync] Setting up CloudKit event listeners...');

//     // Listen for notification read events from Watch/other devices
//     const unsubscribeRead = IosBridgeService.onCloudKitNotificationRead((event) => {
//       console.log(`[CloudKitSync] Notification ${event.notificationId} marked as read from another device`);
      
//       // Invalidate queries to refresh data
//       queryClient.invalidateQueries({ queryKey: notificationKeys.all });
//       queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
//       queryClient.invalidateQueries({ queryKey: notificationKeys.bucketsStats() });
//     });

//     // Listen for notification unread events from Watch/other devices
//     const unsubscribeUnread = IosBridgeService.onCloudKitNotificationUnread((event) => {
//       console.log(`[CloudKitSync] Notification ${event.notificationId} marked as unread from another device`);
      
//       // Invalidate queries to refresh data
//       queryClient.invalidateQueries({ queryKey: notificationKeys.all });
//       queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
//       queryClient.invalidateQueries({ queryKey: notificationKeys.bucketsStats() });
//     });

//     // Listen for notification deleted events from Watch/other devices
//     const unsubscribeDeleted = IosBridgeService.onCloudKitNotificationDeleted((event) => {
//       console.log(`[CloudKitSync] Notification ${event.notificationId} deleted from another device`);
      
//       // Invalidate queries to refresh data
//       queryClient.invalidateQueries({ queryKey: notificationKeys.all });
//       queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
//       queryClient.invalidateQueries({ queryKey: notificationKeys.bucketsStats() });
//     });

//     // Listen for bucket changed events from Watch/other devices
//     const unsubscribeBucket = IosBridgeService.onCloudKitBucketChanged((event) => {
//       console.log(`[CloudKitSync] Bucket ${event.bucketId} ${event.changeType} from another device`);
      
//       // Invalidate bucket queries to refresh data
//       queryClient.invalidateQueries({ queryKey: bucketKeys.all });
//       queryClient.invalidateQueries({ queryKey: bucketKeys.detail(event.bucketId) });
//       queryClient.invalidateQueries({ queryKey: notificationKeys.bucketsStats() });
//     });

//     console.log('[CloudKitSync] CloudKit event listeners active ✅');

//     // Cleanup on unmount
//     return () => {
//       console.log('[CloudKitSync] Removing CloudKit event listeners...');
//       unsubscribeRead();
//       unsubscribeUnread();
//       unsubscribeDeleted();
//       unsubscribeBucket();
//     };
//   }, [queryClient]);
// }
