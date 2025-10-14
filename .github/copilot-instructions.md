````instructions
# GitHub Copilot Instructions - Zentik Notifier Frontend

## Project Overview
Cross-platform notification management app built with:
- **Expo/React Native** (iOS, Android, Web)
- **TypeScript** with strict type checking
- **expo-router** for file-based navigation
- **Apollo Client** + **TanStack Query** for data fetching
- **GraphQL** with code generation
- **Material Design 3** (react-native-paper)
- **SQLite** for offline storage
- **i18n** with type-safe translations (en-EN, it-IT)

## Code Style and Documentation

### Language Requirements
- **All code, comments, and documentation must be in English**
- **Never create README files** unless explicitly requested
- **Never create example/test components** unless explicitly requested
- Add comments only for critical/complex logic - avoid self-explanatory comments
- Keep log messages concise and in English

**Examples:**
```typescript
// ✅ Good - explains why
// Using forwardRef to avoid circular dependency between bucket queries and AppContext
const { userId } = useAppContext();

// ❌ Bad - self-explanatory
// Get the user ID
const userId = getUserId();

// ❌ Bad - in Italian
// Ottieni l'ID utente
```

## Critical Workflows

### 1. i18n Type Generation Workflow

**Whenever adding/modifying translations:**

1. Update both locale files: `locales/en-EN.json` and `locales/it-IT.json`
2. Run: `npm run generate:i18n-types` (generates `types/translations.generated.ts`)
3. Use type-safe keys in components:

```typescript
import { useI18n } from '@/hooks/useI18n';

function MyComponent() {
  const { t } = useI18n();
  
  // ✅ Type-safe - autocomplete and compile-time checking
  return <Text>{t('settings.notifications.title')}</Text>;
  
  // ❌ Wrong - no type safety
  return <Text>{t('nonexistent.key')}</Text>;
}
```

### 2. GraphQL Code Generation

**After modifying GraphQL operations in `config/operations.graphql`:**

1. Ensure backend is running: `npm run start:dev` (in `backend/` folder)
2. Run: `npm run codegen` (generates `generated/gql-operations-generated.ts`)
3. Import generated hooks/types:

```typescript
import { 
  useGetBucketsQuery, 
  useCreateBucketMutation,
  Bucket 
} from '@/generated/gql-operations-generated';
```

### 3. iOS Extension Sync

**After modifying Swift files in `plugins/` folder:**

Run: `npm run sync-ios-extensions` (or `./scripts/sync-ios-extensions.sh`)

This syncs notification service extensions with iOS native code.

## Architecture Patterns

### Navigation (expo-router)

File-based routing with platform-specific layouts:

```
app/
  _layout.tsx              # Root layout
  index.tsx                # Redirect to main route
  (mobile)/                # Mobile-specific routes
    (home)/
      (tabs)/
        _layout.tsx        # Tab navigator
        index.tsx          # Home tab
        settings.tsx       # Settings tab
  (tablet)/                # Tablet/desktop routes
    (home)/
      index.tsx            # Split view layout
  (common)/                # Shared routes
    (auth)/
      login.tsx
```

**Navigation patterns:**
- Use `router.push()`, `router.replace()` from `expo-router`
- Dynamic routes: `[id].tsx` → accessed via `useLocalSearchParams()`
- Groups: `(group)/` for logical organization without affecting URL

### Data Fetching Strategy

**Dual approach - GraphQL + REST:**

```typescript
// ✅ GraphQL for structured data (Apollo Client)
const { data, loading } = useGetBucketsQuery();

// ✅ TanStack Query for REST/custom endpoints
const { data: attachments } = useQuery({
  queryKey: ['attachments', bucketId],
  queryFn: () => fetchAttachments(bucketId),
});
```

**Offline support:**
- SQLite database: `services/db-setup.ts`
- Notification cache: `services/notifications-repository.ts`
- Media cache: `services/media-cache-service.ts`

### State Management

**Primary state container: `AppContext`**

```typescript
// contexts/AppContext.tsx provides:
const {
  userId,                  // Current user ID
  login,                   // Login function
  logout,                  // Logout function
  push,                    // Push notification service
  userSettings,            // User preferences
  connectionStatus,        // Network status
} = useAppContext();
```

**Key hooks:**
- `useI18n()` - translations and locale
- `useTheme()` - theme colors and helpers
- `useDeviceType()` - platform detection (mobile/tablet/desktop)
- `usePushNotifications()` - notification permissions and tokens
- Custom hooks in `hooks/` for domain logic

### Component Patterns

**Prefer common components from `components/ui/`:**

```typescript
// ✅ Use existing UI components
import { AlertDialog, Selector, ButtonGroup } from '@/components/ui';

// ✅ Use React Native Paper for Material Design
import { Button, Card, List } from 'react-native-paper';

// ❌ Don't duplicate logic - extract to common component
```

**Component organization:**
- `components/ui/` - reusable UI primitives
- `components/` - feature-specific components
- `layouts/` - platform-specific layouts (mobile.tsx, tablet.tsx)
- Export from `components/index.ts` for clean imports

### Theme System

**Material Design 3 with custom theme generation:**

```typescript
// services/theme-generator.ts creates dynamic themes
// services/theme-presets.ts for predefined palettes

const theme = useTheme();
const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.outline,
  },
});
```

**Key theme colors:**
- `primary`, `onPrimary` - main brand color
- `surface`, `onSurface` - backgrounds
- `surfaceVariant`, `onSurfaceVariant` - secondary backgrounds
- `outline`, `outlineVariant` - borders
- `error`, `errorContainer` - error states

## Expo Config & Plugins

### Custom Expo Config Plugins

Located in `plugins/`:
- `withIosNotificationExtensions/` - iOS notification service extensions
- `withAndroidManifestFix/` - Android manifest patches
- `withIosExtensionsSharedUtils/` - Shared keychain/app groups

**Never modify `ios/` or `android/` folders directly** - use plugins and prebuild.

### Environment Variables

```bash
# .env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SELFHOSTED=false
APP_VARIANT=development  # or production
```

Access via: `process.env.EXPO_PUBLIC_API_URL`

## Platform-Specific Code

```typescript
import { Platform } from 'react-native';

if (Platform.OS === 'ios') {
  // iOS-specific logic
} else if (Platform.OS === 'android') {
  // Android-specific logic
} else if (Platform.OS === 'web') {
  // Web-specific logic
}
```

**Responsive layouts:**
```typescript
const { isPhone, isTablet, isDesktop } = useDeviceType();
```

## Common Commands

```bash
# Development
npm run start:dev           # Start with dev client
npm run start:ios:dev       # Start iOS with dev client
npm run start:android       # Start Android
npm run start:web           # Start web

# Code generation
npm run codegen             # Generate GraphQL types
npm run generate:i18n-types # Generate translation types
npm run regen:icons         # Regenerate app icons

# Build & Release
npm run build:ios           # Build iOS with EAS
npm run build:android       # Build Android with EAS
npm run update:patch        # OTA update (patch version)

# Quality checks
npm run lint                # ESLint
npm run ts-check            # TypeScript type checking
```

## Testing & Debugging

```bash
# Type checking (run before commits)
npm run ts-check

# Check for errors
npx expo doctor
```

**Debugging tips:**
- Use Expo Dev Tools: Press `j` in terminal
- React DevTools: Press `m` in terminal
- Network inspect: Reactotron or Flipper
- Check logs: `npx expo logs --follow`

## Security & Performance

### Authentication Flow

```typescript
// Tokens stored in secure storage
import { saveTokens, getAccessToken } from '@/services/auth-storage';

// Use RequireAuth wrapper for protected routes
import { RequireAuth } from '@/services/require-auth';
```

### Media Handling

```typescript
// Use cached media component for images
import { CachedMedia } from '@/components/CachedMedia';

// Media cache service handles:
// - Automatic caching with SQLite
// - File system storage
// - Cleanup policies
```

### Performance Optimization

- Use `React.memo()` for expensive renders
- Use `FlashList` instead of `FlatList` for large lists
- Lazy load screens with expo-router
- Optimize images with `expo-image`

## Key Files Reference

- **Entry point**: `app/_layout.tsx`
- **App context**: `contexts/AppContext.tsx`
- **GraphQL operations**: `config/operations.graphql`
- **API config**: `services/api-config.ts`
- **Database setup**: `services/db-setup.ts`
- **Push notifications**: `services/*-push-notifications.ts`
- **i18n service**: `services/i18n.ts`

## Circular Dependencies

**Known safe cycles (intentional):**

```
app/(mobile)/onboarding → components/Onboarding → hooks → contexts/AppContext
```

These are carefully managed with React hooks and lazy loading.

**Avoid creating new circular dependencies** - refactor shared logic into separate modules.

## Checklist for New Features

- [ ] Add translations to both `locales/*.json` files
- [ ] Run `npm run generate:i18n-types`
- [ ] Update GraphQL operations if needed → `npm run codegen`
- [ ] Create components using existing `components/ui/*`
- [ ] Add route in appropriate `app/(platform)/` directory
- [ ] Use `useAppContext()` for auth/user state
- [ ] Apply theme colors via `useTheme()`
- [ ] Test on iOS, Android, and Web
- [ ] Run `npm run ts-check` before commit
- [ ] Avoid directly editing `ios/` or `android/` folders

## Cross-Component Communication

**GraphQL subscriptions for real-time:**
```typescript
const { data } = useNewNotificationSubscription();
```

**Local event bus:**
```typescript
// events/ directory for custom events
// Use pub-sub pattern for cross-component updates
```

**Shared state via context:**
- `AppContext` for global state
- `QueryProviders` wrapper for Apollo + TanStack Query setup

## Common Patterns

### Swipeable List Items

```typescript
// See components/swipeable/ for reusable patterns
import { SwipeableItem } from '@/components/swipeable';
```

### Modal Patterns

```typescript
// Use ThemedBottomSheet for mobile
import { ThemedBottomSheet } from '@/components/ui/ThemedBottomSheet';

// Use Dialog for desktop/tablet
import { Dialog } from 'react-native-paper';
```

### Form Handling

```typescript
// Controlled components with React state
const [value, setValue] = useState('');

// Use validation before mutation
if (!isValid) {
  showError(t('errors.invalidInput'));
  return;
}
```
````