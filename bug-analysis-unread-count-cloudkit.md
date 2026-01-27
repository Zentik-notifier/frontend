# Analisi Bug: Unread Count e CloudKit Sync

## Problemi Identificati

### 1. Unread Count = 0 all'avvio dell'app

**Sintomo**: 
- Il pulsante "Mark All as Read" in header non viene mostrato
- Badge count synced: 0 nei log
- `hasUnreadNotifications` è false anche quando ci sono notifiche non lette

**Causa Probabile**:
- `useAppState()` (alias di `useNotificationsState`) carica i dati dal cache locale
- Le stats vengono calcolate da `getNotificationStats([])` che legge dal database locale
- Se il database locale non è sincronizzato o le notifiche non sono caricate correttamente, l'unread count risulta 0

**Possibili Cause**:
1. **Database locale non sincronizzato**: Le notifiche potrebbero non essere state salvate correttamente nel database locale
2. **Stats non ricalcolate**: Le stats potrebbero essere calcolate prima che le notifiche vengano caricate completamente
3. **Cache React Query**: La cache React Query potrebbe essere vuota o non aggiornata all'avvio

### 2. CloudKit Sync non completa le operazioni

**Sintomo**:
- Le operazioni CloudKit vengono create (`CKModifyRecordsOperation added to database`)
- Ma non si vedono i risultati completati nei log
- Il watch non riceve gli aggiornamenti

**Causa Probabile**:
- Le operazioni CloudKit potrebbero non completarsi correttamente
- I log potrebbero non mostrare i risultati completati
- Potrebbe esserci un problema con il callback di completamento

## Analisi del Codice

### useAppState / useNotificationsState

```typescript
// frontend/hooks/notifications/useNotificationQueries.ts
export function useNotificationsState() {
    const queryResult = useQuery({
        queryKey: ['app-state'],
        queryFn: async () => {
            // PHASE 1: Load from cache
            const cachedNotifications = await getAllNotificationsFromCache();
            const cachedBuckets = await getAllBuckets();
            
            // Calculate stats from cache
            const cachedStats = await getNotificationStats([]);
            
            // Return cache data immediately
            return {
                buckets: cachedBucketsWithStats,
                notifications: cachedNotifications,
                stats: cachedStats,  // ⚠️ Se cachedStats è vuoto, unreadCount = 0
                lastSync: new Date().toISOString(),
            };
        },
        refetchOnMount: false,  // ⚠️ Non refetch su mount
        staleTime: 30000,       // ⚠️ 30 secondi stale time
    });
}
```

**Problema**: Se `getAllNotificationsFromCache()` restituisce un array vuoto o le notifiche non hanno `readAt` settato correttamente, `getNotificationStats([])` calcolerà `unreadCount = 0`.

### getNotificationStats

```typescript
// frontend/db/repositories/notifications-query-repository.ts
export async function getNotificationStats(bucketIds?: string[]): Promise<NotificationStats> {
    // ...
    if (!parsed.readAt) {
        unreadCount++;  // ⚠️ Se readAt è settato, non conta come unread
    }
    // ...
}
```

**Problema**: Se le notifiche nel database hanno `readAt` settato quando non dovrebbero, o se `readAt` è una stringa vuota invece di `null`, il calcolo fallisce.

## Soluzioni Proposte

### Soluzione 1: Verificare caricamento notifiche all'avvio

**File**: `frontend/hooks/notifications/useNotificationQueries.ts`

Aggiungere logging per verificare quante notifiche vengono caricate:

```typescript
const queryResult = useQuery({
    queryKey: ['app-state'],
    queryFn: async () => {
        const cachedNotifications = await getAllNotificationsFromCache();
        console.log('[useNotificationsState] Loaded notifications from cache:', cachedNotifications.length);
        
        const cachedStats = await getNotificationStats([]);
        console.log('[useNotificationsState] Calculated stats:', {
            totalCount: cachedStats.totalCount,
            unreadCount: cachedStats.unreadCount
        });
        
        // ... rest of code
    }
});
```

### Soluzione 2: Forzare refetch all'avvio se stats sono vuote

**File**: `frontend/hooks/notifications/useNotificationQueries.ts`

Modificare per forzare un refetch se le stats risultano vuote:

```typescript
const queryResult = useQuery({
    queryKey: ['app-state'],
    queryFn: async () => {
        // ... existing code ...
    },
    refetchOnMount: true,  // ✅ Cambiare a true per forzare refetch
    staleTime: 0,          // ✅ Cambiare a 0 per considerare sempre stale all'avvio
});
```

### Soluzione 3: Verificare completamento operazioni CloudKit

**File**: `frontend/plugins/ZentikShared/CloudKitManagerBase.swift`

Aggiungere logging per i risultati delle operazioni CloudKit:

```swift
op.modifyRecordsResultBlock = { result in
    switch result {
    case .success:
        self.infoLog("CKModifyRecordsOperation completed successfully", metadata: [
            "chunkSize": chunk.count,
            "completedItems": completedItems + chunk.count,
            "totalItems": totalItems
        ])
        completion(.success(()))
    case .failure(let error):
        self.errorLog("CKModifyRecordsOperation failed", metadata: [
            "error": error.localizedDescription,
            "chunkSize": chunk.count
        ])
        completion(.failure(error))
    }
}
```

### Soluzione 4: Verificare readAt nel database

**File**: `frontend/db/repositories/notifications-query-repository.ts`

Aggiungere logging per verificare come viene interpretato `readAt`:

```typescript
if (Platform.OS !== 'web') {
    const results = await db.getAllAsync(
        `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) as unread
         FROM notifications`
    );
    
    console.log('[getNotificationStats] SQLite stats:', results[0]);
}
```

### Soluzione 5: Invalidare cache React Query all'avvio

**File**: `frontend/contexts/AppContext.tsx`

Invalidare la cache `app-state` quando l'app diventa attiva:

```typescript
useEffect(() => {
    if (nextAppState === 'active') {
        // Invalidate app-state cache to force refetch
        queryClient.invalidateQueries({ queryKey: ['app-state'] });
    }
}, [nextAppState, queryClient]);
```

## Debug Steps

1. **Verificare database locale**:
   - Controllare se le notifiche sono presenti nel database SQLite
   - Verificare se `read_at` è `NULL` per le notifiche non lette

2. **Verificare cache React Query**:
   - Aggiungere logging per vedere cosa contiene la cache `app-state`
   - Verificare se le notifiche vengono caricate correttamente

3. **Verificare CloudKit operations**:
   - Aggiungere logging per vedere se le operazioni CloudKit vengono completate
   - Verificare se ci sono errori nelle operazioni CloudKit

4. **Verificare sync iniziale**:
   - Controllare se `syncFromNetwork()` viene chiamato all'avvio
   - Verificare se le notifiche vengono sincronizzate dal backend

## File Modificati

1. ✅ `frontend/hooks/notifications/useNotificationQueries.ts` 
   - Aggiunto logging per notifiche caricate e stats calcolate
   - Cambiato `refetchOnMount: false` → `refetchOnMount: true` per forzare refetch
   - Cambiato `staleTime: 30000` → `staleTime: 0` per considerare sempre stale

2. ✅ `frontend/plugins/ZentikShared/CloudKitManagerBase.swift`
   - Aggiunto logging per completamento operazioni CloudKit (`CKModifyRecordsOperation completed successfully`)

3. ✅ `frontend/db/repositories/notifications-query-repository.ts`
   - Aggiunto logging per stats calcolate (sia IndexedDB che SQLite)
   - Aggiunto logging per unread counts by bucket

4. ✅ `frontend/contexts/AppContext.tsx`
   - Aggiunto `useQueryClient` hook
   - Invalidazione cache `app-state` quando l'app diventa attiva per forzare refetch

## Test da Eseguire

1. **Aprire l'app** e verificare nei log:
   - `[useNotificationsState] Loaded from cache:` - quante notifiche vengono caricate
   - `[useNotificationsState] Calculated stats:` - stats calcolate (unreadCount dovrebbe essere > 0)
   - `[getNotificationStats] Overall stats result:` - stats dal database
   - `[AppContext] Invalidated app-state cache` - cache invalidata

2. **Verificare CloudKit sync**:
   - `CKModifyRecordsOperation completed successfully` - operazioni completate
   - Se non compaiono, le operazioni potrebbero fallire silenziosamente

3. **Verificare watch sync**:
   - Controllare se il watch riceve gli aggiornamenti dopo le modifiche CloudKit
