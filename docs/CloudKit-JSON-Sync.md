# CloudKit JSON Sync - Documentazione

## Panoramica

Il sistema di sincronizzazione CloudKit è stato completamente ridisegnato per utilizzare un approccio basato su **file JSON** invece di record CloudKit individuali.

## Architettura

### Vecchio Approccio (Deprecato)
- ❌ Un record CloudKit per ogni bucket
- ❌ Un record CloudKit per ogni notifica
- ❌ Sync incrementale complessa con change tokens
- ❌ Limiti di performance con molti record

### Nuovo Approccio
- ✅ Un singolo file JSON per tutti i buckets (`buckets.json`)
- ✅ Un singolo file JSON per tutte le notifications (`notifications.json`)
- ✅ File caricati come `CKAsset` su CloudKit
- ✅ Sync semplificata e più performante
- ✅ Messaggi real-time tra dispositivi tramite WatchConnectivity

## Flusso di Sincronizzazione

### iOS → CloudKit (Upload)

1. **Esportazione dal DB locale**
   ```
   Database SQL → Array di oggetti Swift → JSON Container
   ```

2. **Creazione del file JSON**
   ```swift
   BucketsDataContainer(buckets: [...], syncTimestamp: "2025-11-08T...")
   NotificationsDataContainer(notifications: [...], syncTimestamp: "2025-11-08T...")
   ```

3. **Upload come CKAsset**
   ```
   JSON → File temporaneo → CKAsset → CloudKit Record
   ```

### Watch ← CloudKit (Download)

1. **Download del file JSON**
   ```
   CloudKit Record → CKAsset → File JSON
   ```

2. **Parsing del JSON**
   ```
   JSON → Container → Array di oggetti Swift
   ```

3. **Importazione nel DB locale**
   ```
   Array di oggetti → DELETE vecchi dati → INSERT nuovi dati
   ```

## Strutture Dati

### Bucket
```swift
struct Bucket: Codable {
    let id: String
    let name: String
    let description: String?
    let color: String?
    let iconUrl: String?
    let createdAt: String  // ISO8601
    let updatedAt: String  // ISO8601
    let isOrphan: Bool?
}
```

### Notification
```swift
struct Notification: Codable {
    let id: String
    let title: String
    let subtitle: String?
    let body: String?
    let readAt: String?    // ISO8601 or null
    let sentAt: String?    // ISO8601
    let createdAt: String  // ISO8601
    let updatedAt: String  // ISO8601
    let bucketId: String
    let attachments: [NotificationAttachment]
    let actions: [NotificationAction]
    let tapAction: NotificationAction?
}
```

### Container
```swift
struct BucketsDataContainer: Codable {
    let buckets: [Bucket]
    let syncTimestamp: String  // ISO8601
}

struct NotificationsDataContainer: Codable {
    let notifications: [Notification]
    let syncTimestamp: String  // ISO8601
}
```

## CloudKit Schema

### Record Types

1. **BucketsData**
   - `dataFile`: CKAsset (file JSON)
   - `syncTimestamp`: Date
   - `recordCount`: Int (numero di buckets)

2. **NotificationsData**
   - `dataFile`: CKAsset (file JSON)
   - `syncTimestamp`: Date
   - `recordCount`: Int (numero di notifiche)

### Zone
- **Nome**: `ZentikSyncZone`
- **Tipo**: Custom Zone (privata)
- **Creata da**: iOS app
- **Utilizzata da**: iOS + Watch

## API Sincronizzazione

### iOS (Upload)

```swift
// Sync singolo tipo
CloudKitSyncManager.shared.syncBucketsToCloudKit { success, count in
    print("Synced \(count) buckets: \(success)")
}

CloudKitSyncManager.shared.syncNotificationsToCloudKit { success, count in
    print("Synced \(count) notifications: \(success)")
}

// Sync completo
CloudKitSyncManager.shared.syncAllToCloudKit { success, bucketsCount, notificationsCount in
    print("Synced \(bucketsCount) buckets, \(notificationsCount) notifications")
}
```

### Watch (Download)

```swift
// Download singolo tipo
CloudKitSyncManager.shared.fetchBucketsFromCloudKit { buckets in
    print("Downloaded \(buckets.count) buckets")
}

CloudKitSyncManager.shared.fetchNotificationsFromCloudKit { notifications in
    print("Downloaded \(notifications.count) notifications")
}

// Download completo
CloudKitSyncManager.shared.fetchAllFromCloudKit { buckets, notifications in
    print("Downloaded \(buckets.count) buckets, \(notifications.count) notifications")
}

// Force refresh (ignora cache)
CloudKitSyncManager.shared.forceRefreshFromCloudKit { success in
    print("Refresh completed: \(success)")
}
```

## Messaggi Real-Time tra Dispositivi

### SyncUpdateMessage

```swift
struct SyncUpdateMessage: Codable {
    enum UpdateType: String, Codable {
        case notificationRead
        case notificationDeleted
        case bucketCreated
        case bucketUpdated
        case bucketDeleted
        case fullSync
    }
    
    let type: UpdateType
    let entityId: String?  // ID della notifica/bucket modificato
    let timestamp: String  // ISO8601
}
```

### Flusso di Aggiornamento

1. **Utente modifica una notifica sul Watch**
   ```
   Watch: Aggiorna DB locale
   Watch: Invia SyncUpdateMessage a iOS via WatchConnectivity
   iOS: Riceve messaggio, aggiorna DB locale
   iOS: Riesporta JSON e carica su CloudKit
   ```

2. **Utente modifica una notifica su iOS**
   ```
   iOS: Aggiorna DB locale
   iOS: Invia SyncUpdateMessage al Watch via WatchConnectivity
   iOS: Riesporta JSON e carica su CloudKit
   Watch: Riceve messaggio, aggiorna DB locale
   ```

## Subscriptions

### iOS e Watch
Entrambi i dispositivi si sottoscrivono agli aggiornamenti dei record `BucketsData` e `NotificationsData`.

Quando CloudKit notifica un cambiamento:
- **iOS**: Normalmente non fa nulla (ha già i dati aggiornati)
- **Watch**: Scarica automaticamente il nuovo JSON e aggiorna il DB

```swift
CloudKitSyncManager.shared.setupSubscriptions { success in
    print("Subscriptions setup: \(success)")
}
```

## Metodi Deprecati

Con il nuovo approccio basato su JSON, alcuni metodi sono deprecati:

### iOS
```swift
// ❌ DEPRECATO - non si cancellano record individuali
CloudKitSyncManager.shared.deleteNotificationFromCloudKit(id: "...") { success in }
CloudKitSyncManager.shared.deleteBucketFromCloudKit(id: "...") { success in }
```

**Soluzione**: Modifica il DB locale e poi chiama `syncNotificationsToCloudKit()` o `syncBucketsToCloudKit()` per riesportare tutto il JSON.

### Watch
```swift
// ❌ DEPRECATO - Watch è read-only
CloudKitSyncManager.shared.syncBucketsToCloudKit { ... }
CloudKitSyncManager.shared.syncNotificationsToCloudKit { ... }
CloudKitSyncManager.shared.syncAllToCloudKit { ... }
```

**Soluzione**: Watch invia messaggi a iOS via WatchConnectivity. iOS poi sincronizza su CloudKit.

## Vantaggi del Nuovo Approccio

1. **Performance**
   - ✅ Un solo upload/download invece di centinaia
   - ✅ Meno chiamate API CloudKit
   - ✅ Riduzione dei costi e rate limits

2. **Semplicità**
   - ✅ Niente gestione complessa di change tokens
   - ✅ Sync completa ogni volta (semplice e affidabile)
   - ✅ Facile da debuggare (JSON leggibile)

3. **Affidabilità**
   - ✅ Sync atomica (tutto o niente)
   - ✅ Meno possibilità di inconsistenze
   - ✅ Facile ripristino in caso di errori

## Limitazioni e Considerazioni

1. **Dimensione del JSON**
   - I file JSON hanno un limite di dimensione (CloudKit Asset max: 250MB)
   - Con 150 notifiche + buckets, il file è ~100-200KB (molto sotto il limite)

2. **Bandwidth**
   - Download completo ogni volta (non incrementale)
   - Su Watch, limitare le sync automatiche per risparmiare batteria

3. **Conflitti**
   - Last-write-wins (l'ultimo che scrive vince)
   - I messaggi real-time via WatchConnectivity aiutano a minimizzare i conflitti

## Best Practices

### iOS
1. ✅ Sync dopo ogni modifica importante (bucket creato/modificato/eliminato)
2. ✅ Sync dopo batch di modifiche alle notifiche
3. ✅ Sync periodica in background (es. ogni 15 minuti)

### Watch
1. ✅ Download all'apertura dell'app
2. ✅ Force refresh quando l'utente fa pull-to-refresh
3. ✅ Ascolta le subscription CloudKit per aggiornamenti automatici
4. ✅ Invia messaggi a iOS per modifiche locali (notifica letta/eliminata)

## Migrazione dal Vecchio Sistema

I vecchi file `CloudKitSyncManager_iOS_Old.swift` e `CloudKitSyncManager_Watch_Old.swift` sono stati preservati per riferimento.

### Step di Migrazione

1. ✅ **Modelli aggiornati** → `CloudKitModels.swift`
2. ✅ **iOS Sync Manager** → `CloudKitSyncManager_iOS.swift`
3. ✅ **Watch Sync Manager** → `CloudKitSyncManager_Watch.swift`
4. ⚠️ **Da fare**: Aggiornare WatchConnectivity per inviare `SyncUpdateMessage`
5. ⚠️ **Da fare**: Gestire i messaggi ricevuti e triggerare sync appropriati

## Prossimi Passi

1. **Implementare WatchConnectivity messaging**
   - Inviare `SyncUpdateMessage` quando una notifica viene modificata
   - Gestire i messaggi ricevuti e aggiornare il DB locale

2. **Test completi**
   - Test sync bidirezionale iOS ↔ Watch
   - Test conflitti
   - Test performance con molti dati

3. **Monitoring e logging**
   - Tracciare successo/fallimento sync
   - Monitorare dimensione dei file JSON
   - Alert in caso di problemi

## Troubleshooting

### "Failed to fetch buckets/notifications"
- Verifica che la zona `ZentikSyncZone` esista (creata da iOS)
- Controlla i permessi iCloud
- Verifica che i record `buckets_data` e `notifications_data` esistano

### "Failed to sync to CloudKit"
- Verifica la connessione internet
- Controlla i quota CloudKit
- Verifica che il DB locale sia accessibile

### "Watch cannot sync to CloudKit (read-only)"
- Questo è normale - Watch non può scrivere su CloudKit
- Usa WatchConnectivity per inviare modifiche a iOS
- iOS poi sincronizzerà su CloudKit

## Riferimenti

- [CloudKit Documentation](https://developer.apple.com/documentation/cloudkit)
- [CKAsset Documentation](https://developer.apple.com/documentation/cloudkit/ckasset)
- [WatchConnectivity Framework](https://developer.apple.com/documentation/watchconnectivity)
