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

Note:
- Includere eventuali sotto-componenti usati da questi file (modali, badge, bottoni swipe) durante la migrazione.
- Non utilizzare componenti in `components/ui/*`: sostituirli con equivalenti di react-native-paper dove possibile.
- Migrare quanti più componenti possibili a react-native-paper (Text, Surface, Button, IconButton, Menu, Dialog, Snackbar, ecc.).
- **IMPORTANTE**: Utilizzare SOLO icone di Paper (MaterialCommunityIcons via `react-native-paper`), evitando set di icone custom.
- **NON utilizzare MAI** il componente `Icon` da `components/ui/Icon.tsx` - tutte le icone devono venire da `react-native-paper`.
- Usare `Icon` da `react-native-paper` con `source` prop (es: `source="home"`, `source="settings"`).
- Ridurre al minimo lo styling custom: preferire colori e tipografia da `theme.colors`/`MD3` e component props di Paper; evitare shadow/ombre custom.
- Evitare modifiche dirette a ios/android; usare solo componenti Paper e hook tema.

