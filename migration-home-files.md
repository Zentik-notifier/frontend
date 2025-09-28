# Home module - Lista file da migrare a react-native-paper

Ordine consigliato (dalle entrypoint ai componenti annidati):

1. app/_layout.tsx
2. layouts/mobile.tsx
3. layouts/tablet.tsx (route tablet: header e colori ancora da migrare a Paper)
4. components/Header.tsx
5. components/UserDropdown.tsx
6. components/NotificationsList.tsx
7. components/NotificationItem.tsx
8. components/NotificationFilters.tsx
9. components/NotificationActionsButton.tsx
10. components/NotificationSnoozeButton.tsx
11. components/GallerySection.tsx
12. components/MediaTypeIcon.tsx
13. components/BucketIcon.tsx
14. components/FullScreenMediaViewer.tsx
15. components/CachedMedia.tsx
16. components/ui/Icon.tsx (e altri in components/ui utili in Home)
17. components/SectionTabs.tsx

## Sezioni Settings e Admin - Ordine di Migrazione

### Fase 1: Sidebar e Layout (Priorità Alta)
1. components/SettingsSidebar.tsx
2. components/AdminSidebar.tsx
3. app/(tablet)/(settings)/_layout.tsx
4. app/(tablet)/(admin)/_layout.tsx

### Fase 2: Componenti Settings Core (Priorità Alta)
5. components/AppSettings.tsx
6. components/SettingsTabs.tsx
7. components/SettingsScrollView.tsx (da rimuovere/evitare)
8. components/UserSection.tsx
9. components/DateFormatSettings.tsx
10. components/LanguageSettings.tsx
11. components/TimezoneSettings.tsx
12. components/LegalDocumentsSettings.tsx
13. components/UnifiedCacheSettings.tsx
14. components/VersionInfo.tsx

### Fase 3: Settings Specifici (Priorità Media)
15. components/NotificationsSettings.tsx
16. components/BucketsSettings.tsx
17. components/UserSessionsSettings.tsx
18. components/DevicesSettings.tsx
19. components/AccessTokensSettings.tsx
20. components/WebhooksSettings.tsx

### Fase 4: Admin Components (Priorità Media)
21. components/UserManagement.tsx ✅
22. components/UserDetails.tsx ✅ (Nota: utilizzare ThemedInputSelect per selezione ruolo)
23. components/OAuthConnections.tsx ✅ (già migrato a Paper)
24. components/CreateOAuthProviderForm.tsx ✅
25. components/OAuthProvidersSettings.tsx ✅
26. components/SystemAccessTokensSettings.tsx
27. components/EventsReview.tsx

### Fase 5: Pagine Settings (Priorità Bassa)
25. app/(mobile)/(settings)/*.tsx
26. app/(tablet)/(settings)/*.tsx
27. app/(mobile)/(admin)/*.tsx
28. app/(tablet)/(admin)/*.tsx

### Note Specifiche per Settings/Admin:
- **Rimuovere SettingsScrollView**: Sostituire con ScrollView nativo + stili appropriati
- **Sidebar Navigation**: Migrare a react-native-paper con Surface, List, Icon
- **Settings Cards**: Usare Card di react-native-paper per sezioni
- **Form Components**: Sostituire TextInput nativi con TextInput di Paper
- **Color Consistency**: Usare theme.colors per tutti i colori
- **Icon Consistency**: Solo MaterialCommunityIcons via react-native-paper
- **ThemedInputSelect**: Mantenere ThemedInputSelect per selezioni complesse (es. selezione ruolo in UserDetails)

Note:
- Includere eventuali sotto-componenti usati da questi file (modali, badge, bottoni swipe) durante la migrazione.
- Non utilizzare componenti in `components/ui/*`: sostituirli con equivalenti di react-native-paper dove possibile.
- Migrare quanti più componenti possibili a react-native-paper (Text, Surface, Button, IconButton, Menu, Dialog, Snackbar, ecc.).
- **IMPORTANTE**: Utilizzare SOLO icone di Paper (MaterialCommunityIcons via `react-native-paper`), evitando set di icone custom.
- **NON utilizzare MAI** il componente `Icon` da `components/ui/Icon.tsx` - tutte le icone devono venire da `react-native-paper`.
- Usare `Icon` da `react-native-paper` con `source` prop (es: `source="home"`, `source="settings"`).
- **NON utilizzare MAI** `SettingsScrollView` - sostituire con `PaperScrollView` per ScrollView con RefreshControl.
- Ridurre al minimo lo styling custom: preferire colori e tipografia da `theme.colors`/`MD3` e component props di Paper; evitare shadow/ombre custom.
- Evitare modifiche dirette a ios/android; usare solo componenti Paper e hook tema.

## Componenti Riusabili Paper

### PaperScrollView

Utilizzare il componente `PaperScrollView` per tutte le ScrollView con RefreshControl:

```tsx
import PaperScrollView from "@/components/ui/PaperScrollView";

// Utilizzo base
<PaperScrollView>
  <Card>
    <Card.Content>
      {/* Contenuto */}
    </Card.Content>
  </Card>
</PaperScrollView>

// Con RefreshControl
<PaperScrollView
  refreshing={refreshing}
  onRefresh={onRefresh}
  contentContainerStyle={{ padding: 16 }}
>
  <Card>
    <Card.Content>
      {/* Contenuto */}
    </Card.Content>
  </Card>
</PaperScrollView>
```

**Vantaggi**:
- RefreshControl automaticamente temato
- Background temato
- Configurazione standardizzata
- Supporto per dark mode

## Struttura Modal Standard

Per tutti i modal, utilizzare la seguente struttura basata su `NotificationFiltersModal`:

```tsx
import {
  Button,
  Icon,
  Modal,
  Portal,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { Dimensions } from "react-native";

const deviceHeight = Dimensions.get("window").height;
const containerStyle = {
  backgroundColor: theme.colors.surface,
  borderRadius: 12,
  overflow: "hidden",
  marginHorizontal: 16,
  marginVertical: 24,
  maxHeight: deviceHeight * 0.8,
} as const;

return (
  <Portal>
    <Modal
      visible={visible}
      onDismiss={onClose}
      contentContainerStyle={containerStyle}
      dismissableBackButton
    >
      <View
        style={[
          styles.modalHeader,
          {
            borderBottomColor: theme.colors.outline,
            backgroundColor: "transparent",
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <Icon source="icon-name" size={24} color={theme.colors.primary} />
          <Text style={styles.modalTitle}>{title}</Text>
        </View>
        <TouchableRipple
          style={[styles.closeButton]}
          onPress={onClose}
          borderless
        >
          <Icon source="close" size={20} color={theme.colors.onSurface} />
        </TouchableRipple>
      </View>

      <View style={{ padding: 20 }}>
        {/* Contenuto del modal */}
      </View>

      <View style={styles.modalFooter}>
        <Button mode="outlined" onPress={onClose} style={styles.footerButton}>
          {t("common.cancel")}
        </Button>
        <Button mode="contained" onPress={onConfirm} style={styles.footerButton}>
          {t("common.confirm")}
        </Button>
      </View>
    </Modal>
  </Portal>
);
```

### Stili Standard per Modal

```tsx
const styles = StyleSheet.create({
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 60,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  footerButton: {
    flex: 1,
  },
});
```

