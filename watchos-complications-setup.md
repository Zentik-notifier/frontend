# Setup Complications per watchOS

## Panoramica

Le complications su Apple Watch permettono di mostrare informazioni direttamente sul watch face. Per Zentik, vogliamo mostrare:
- **Unread count**: Il numero di notifiche non lette
- **Bucket icon**: L'icona del bucket della notifica non letta più recente

**Fonte dati**: CloudKit (direttamente, non tramite cache locale)

## Componenti Necessari

### 1. ComplicationController

Un controller che implementa `CLKComplicationDataSource` per fornire i dati alla complication.

**File**: `frontend/targets/watch/ComplicationController.swift` (da creare)

**Responsabilità**:
- Implementare i metodi richiesti da `CLKComplicationDataSource`
- Fornire timeline entries (passato, presente, futuro)
- Gestire l'aggiornamento della timeline quando cambiano i dati
- **Fetchare dati direttamente da CloudKit** (non dalla cache locale)

### 2. Timeline Entries

Ogni entry rappresenta lo stato della complication in un momento specifico nel tempo.

**Struttura**:
- `date`: Quando questa entry è valida
- `template`: Il template SwiftUI da mostrare
- `timelineEntry`: Wrapper per ClockKit

### 3. Complication Families Supportate

watchOS supporta diverse famiglie di complications. Per Zentik, consigliamo di supportare:

- **Circular Small**: Icona del bucket + unread count (piccolo)
- **Modular Small**: Icona del bucket + unread count
- **Utilitarian Small**: Solo unread count (testo)
- **Graphic Circular**: Icona del bucket circolare + unread count

### 4. Accesso ai Dati da CloudKit

I dati devono essere fetchati direttamente da CloudKit usando `WatchCloudKit`:

```swift
// Fetch unread notifications from CloudKit
WatchCloudKit.shared.fetchLatestNotificationsFromCloudKit(limit: 100) { notifications, error in
    guard let notifications = notifications, error == nil else {
        // Handle error
        return
    }
    
    // Filter unread notifications
    let unreadNotifications = notifications.filter { notification in
        let readAt = notification["readAt"] as? Date
        return readAt == nil
    }
    
    let unreadCount = unreadNotifications.count
    
    // Get most recent unread notification
    let mostRecentUnread = unreadNotifications
        .sorted { (n1, n2) -> Bool in
            let date1 = n1["createdAt"] as? String ?? ""
            let date2 = n2["createdAt"] as? String ?? ""
            return date1 > date2
        }
        .first
    
    let bucketIconUrl = mostRecentUnread?["bucketIconUrl"] as? String
    let bucketColor = mostRecentUnread?["bucketColor"] as? String
}
```

**Nota**: Le complications hanno limiti di tempo per il rendering (~50ms), quindi:
- Cacheare i risultati in memoria per evitare fetch ripetuti
- Usare fetch asincroni con timeout
- Fornire fallback se CloudKit non è disponibile

### 5. Aggiornamento Timeline

La timeline deve essere aggiornata quando:
- Cambia l'unread count (via CloudKit push notification)
- Arriva una nuova notifica non letta
- Una notifica viene marcata come letta
- Cambia il bucket della notifica più recente

**Trigger da CloudKit push notifications**:
- Ascoltare `CKNotification` per cambiamenti
- Aggiornare timeline quando arrivano notifiche

## Struttura File

```
frontend/targets/watch/
├── ComplicationController.swift      (NUOVO - implementa CLKComplicationDataSource)
├── ComplicationTimelineEntry.swift   (NUOVO - modelli per timeline entries)
├── ComplicationViews.swift           (NUOVO - SwiftUI views per ogni family)
└── WatchExtensionDelegate.swift      (MODIFICARE - registrare complication controller)
```

## Implementazione Step-by-Step

Vedi il codice completo nel documento originale. I punti chiave sono:

1. **ComplicationController** deve fetchare da CloudKit usando `WatchCloudKit.shared.fetchLatestNotificationsFromCloudKit()`
2. **Cache in memoria** per evitare fetch ripetuti (validità: 1 minuto)
3. **Aggiornamento timeline** quando arrivano notifiche CloudKit
4. **Gestione errori** con fallback a dati cached

## Configurazione Xcode

1. **Abilitare Complications nel Target**
2. **Aggiungere Complication Identifier** in Info.plist
3. **Configurare Complication Families** in Info.plist

## Testing

1. **Simulatore watchOS**: Verificare fetch da CloudKit
2. **Device fisico**: Verificare aggiornamenti in tempo reale

## Limitazioni e Best Practices

1. **Performance**: Cacheare dati, evitare operazioni pesanti
2. **Timeline Updates**: Max 1 volta al minuto
3. **CloudKit Availability**: Gestire errori gracefully
4. **Battery Life**: Minimizzare fetch, usare cache

