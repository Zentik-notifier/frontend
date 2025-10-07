# Migration Steps - Rimozione completa di Apollo useNotifications

Questo documento descrive i passi necessari per completare la migrazione da Apollo GraphQL a React Query e rimuovere completamente l'hook `useNotifications` legacy.

## ✅ Completato

- [x] Creati hook React Query (`useNotificationQueries`, `useNotificationMutations`)
- [x] Migrato `NotificationItem` a React Query
- [x] Migrato `NotificationsList` a `NotificationsListRQ` con React Query
- [x] Migrato `NotificationDetail` a React Query
- [x] Implementato `useRefreshNotifications` per pull-to-refresh
- [x] Convertite tutte le mutazioni a LOCAL-ONLY (no API calls)
- [x] Fixato bug di persistenza dati (parseNotificationFromDB)
- [x] Aggiunto supporto per `useMassDeleteNotificationsMutation` batch delete

## 🔄 In Progress - Rimozione Apollo useNotifications

### Step 1: Identificare tutti i file che usano `useNotifications` Apollo

Esegui questa ricerca per trovare tutte le occorrenze:

```bash
cd /Users/gianlucaruocco/Documents/Git/zentik-notifier/frontend
grep -r "useNotifications" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=generated
```

File probabili da controllare:
- `/hooks/useNotifications.ts` - **File principale da rimuovere**
- `/contexts/AppContext.tsx` - Usa `useFetchNotifications` e mantiene `notifications` state
- `/components/Header.tsx` - Potrebbe usare stats da AppContext
- `/app/(tabs)/_layout.tsx` - Usa stats per badge counts
- Altri componenti che potrebbero importare da `useNotifications`

### Step 2: Aggiornare AppContext

**File**: `/contexts/AppContext.tsx`

**Modifiche necessarie**:

1. **Rimuovere import Apollo**:
   ```typescript
   // ❌ Rimuovere
   import { useFetchNotifications } from '@/hooks/useNotifications';
   ```

2. **Rimuovere state Apollo**:
   ```typescript
   // ❌ Rimuovere
   const { data: notifications, loading: notificationsLoading } = useFetchNotifications();
   ```

3. **Aggiungere React Query hook**:
   ```typescript
   // ✅ Aggiungere
   import { useNotificationStats } from '@/hooks/notifications';
   
   const { data: stats } = useNotificationStats({ realtime: true });
   ```

4. **Aggiornare context value**:
   ```typescript
   // Sostituire
   notifications: notifications || []
   notificationsLoading
   
   // Con
   notificationStats: stats || { totalCount: 0, unreadCount: 0, readCount: 0 }
   ```

### Step 3: Aggiornare componenti che usano AppContext

**File**: `/components/Header.tsx`

**Modifiche**:
- Sostituire `notifications.length` con `notificationStats.totalCount`
- Sostituire `notifications.filter(n => !n.readAt).length` con `notificationStats.unreadCount`

**File**: `/app/(tabs)/_layout.tsx`

**Modifiche**:
- Usare `useNotificationStats()` direttamente invece di prelevare da AppContext
- Aggiornare badge counts usando `stats.unreadCount`

### Step 4: Sostituire NotificationsList con NotificationsListRQ

Cerca tutti i componenti che usano `<NotificationsList>` e sostituiscili con `<NotificationsListRQ>`:

```bash
grep -r "NotificationsList" --include="*.tsx" --exclude-dir=node_modules
```

**Modifiche**:
```tsx
// ❌ Vecchio
import NotificationsList from '@/components/NotificationsList';
<NotificationsList bucketId={bucket.id} />

// ✅ Nuovo
import NotificationsListRQ from '@/components/NotificationsListRQ';
<NotificationsListRQ bucketId={bucket.id} />
```

### Step 5: Rimuovere file Apollo legacy

Una volta completati tutti gli step precedenti:

1. **Rimuovere hook Apollo**:
   ```bash
   rm /Users/gianlucaruocco/Documents/Git/zentik-notifier/frontend/hooks/useNotifications.ts
   ```

2. **Rimuovere componenti vecchi** (se non più usati):
   ```bash
   # Verifica prima che non siano più referenziati
   rm /Users/gianlucaruocco/Documents/Git/zentik-notifier/frontend/components/NotificationsList.tsx
   ```

3. **Verificare import Apollo non utilizzati**:
   ```bash
   grep -r "from '@apollo/client'" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules
   ```

### Step 6: Pulizia ApolloClient

**File**: `/app/_layout.tsx` o dove è configurato ApolloClient

**Verificare se Apollo è ancora necessario**:
- Se viene usato solo per notifiche → rimuovere completamente
- Se viene usato per altri dati (buckets, etc.) → mantenere ma rimuovere queries notifiche

### Step 7: Testing completo

Dopo ogni modifica, testare:

1. **Test funzionali**:
   - ✅ Fetch notifiche da remoto all'avvio app
   - ✅ Pull-to-refresh sincronizza da remoto
   - ✅ Mark as read/unread funziona (LOCAL-ONLY)
   - ✅ Delete funziona (LOCAL-ONLY)
   - ✅ Badge counts aggiornati correttamente
   - ✅ Tab badges mostrano conteggi corretti
   - ✅ Scroll preservation durante mark/delete
   - ✅ Infinite scroll carica più notifiche
   - ✅ Filtri funzionano correttamente
   - ✅ Ricerca funziona
   - ✅ Mark all as read funziona

2. **Test performance**:
   - ✅ Cache React Query veloce
   - ✅ Nessun lag durante scroll
   - ✅ Batch operations efficienti
   - ✅ DB locale risponde velocemente

3. **Test edge cases**:
   - ✅ Comportamento con 0 notifiche
   - ✅ Comportamento con molte notifiche (1000+)
   - ✅ Offline mode (usa solo DB locale)
   - ✅ Errori di rete gestiti correttamente

## 📋 Checklist finale

Prima di considerare la migrazione completa:

- [ ] Tutti i file che importano da `useNotifications` sono aggiornati
- [ ] AppContext usa solo React Query hooks
- [ ] Header e tab layout usano `useNotificationStats`
- [ ] Tutti i componenti usano `NotificationsListRQ`
- [ ] File Apollo rimossi: `useNotifications.ts`, `NotificationsList.tsx`
- [ ] Nessun errore TypeScript
- [ ] Nessun warning in console
- [ ] Tutti i test funzionali passano
- [ ] Performance accettabile (no lag, cache veloce)
- [ ] Badge counts corretti ovunque
- [ ] Pull-to-refresh funziona con sync remoto

## 🎯 Architettura finale

```
┌─────────────────────────────────────────────────────────┐
│                    Components Layer                      │
│  NotificationsListRQ, NotificationItem, Header, etc.    │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────────┐
│                React Query Hooks Layer                   │
│  useNotificationQueries, useNotificationMutations       │
│  useRefreshNotifications, useNotificationStats          │
└───────────┬────────────────────────────┬────────────────┘
            │                            │
            ↓                            ↓
┌───────────────────────┐    ┌──────────────────────────┐
│   GraphQL Layer       │    │   Local DB Layer         │
│   (Apollo Client)     │    │   (IndexedDB/SQLite)     │
│                       │    │                          │
│ - GetNotifications    │    │ - queryNotifications     │
│ - GetNotification     │    │ - saveNotification       │
│ - MassDelete          │    │ - updateNotification     │
└───────────────────────┘    │ - deleteNotification     │
                              │ - getStats               │
                              └──────────────────────────┘

Data Flow:
1. App startup → useSyncNotificationsFromAPI → Fetch from GraphQL → Save to DB → Delete from server
2. User action → LOCAL-ONLY mutation → Update DB → Update React Query cache
3. Pull-to-refresh → useRefreshNotifications → Repeat step 1
4. Push notification → Save to DB → invalidateQueries → UI updates
```

## 🚀 Benefici della migrazione

1. **Performance**: React Query cache più veloce di Apollo
2. **Offline-first**: Tutte le operazioni funzionano offline (LOCAL-ONLY)
3. **Ridotto traffico di rete**: Solo sync iniziale e pull-to-refresh
4. **Batch operations**: Delete/mark in batch con una singola mutation GraphQL
5. **Migliore UX**: Cache invalidation invece di refetch, scroll preservation
6. **Type-safe**: Tutti gli hook sono tipizzati con TypeScript
7. **Manutenibilità**: Codice più pulito e organizzato in hooks riutilizzabili

## 📚 Documentazione

- React Query: https://tanstack.com/query/latest
- Apollo Client (per reference): https://www.apollographql.com/docs/react/
- Hook docs: `/hooks/notifications/README.md` (TODO: creare)

---

**Nota**: Questo documento dovrebbe essere aggiornato man mano che procedi con la migrazione. Spunta gli item completati e aggiungi note su problemi incontrati o soluzioni trovate.
