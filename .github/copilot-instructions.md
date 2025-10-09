# GitHub Copilot Instructions - Zentik Notifier Frontend

## Project Overview
This is the frontend application for Zentik Notifier, built with:
- **React Native** with Expo Router
- **TypeScript** for type safety
- **React Native Paper** for UI components
- **Apollo Client** for GraphQL (being migrated to TanStack Query)
- **TanStack Query (React Query)** for data fetching and caching
- **Internationalization (i18n)** with English and Italian translations

## Important Development Guidelines

### 1. Internationalization (i18n) Type Generation

**CRITICAL**: When adding new translation keys to the i18n files, you **MUST** update the TypeScript type definitions.

#### Process:
1. Add new translation keys to both:
   - `frontend/locales/en-EN.json`
   - `frontend/locales/it-IT.json`

2. **Immediately after**, update `frontend/types/i18n.ts` to include the new keys in the `TranslationKey` interface.

#### Example:
If you add a new section called `newFeature` to the JSON files:

```json
// en-EN.json and it-IT.json
{
  "newFeature": {
    "title": "New Feature",
    "description": "This is a new feature"
  }
}
```

You must add the corresponding TypeScript interface:

```typescript
// types/i18n.ts
export interface TranslationKey {
  // ... existing keys ...
  newFeature: {
    title: string;
    description: string;
  };
  // ... rest of keys ...
}
```

#### Recent Example:
The `backupManagement` section was added:
- JSON files: Added complete translations in both languages
- TypeScript: Added interface in `types/i18n.ts`
- Location: Between `buckets` and `devices` sections

### 2. GraphQL Code Generation

After modifying GraphQL operations in `frontend/config/operations.graphql`, run:
```bash
npm run codegen
```

This generates TypeScript types in `frontend/generated/gql-operations-generated.ts`.

### 3. Data Fetching Pattern

**Preferred**: Use TanStack Query (React Query) for new features:
- Better caching control
- Optimistic updates
- Consistent API across components
- See `hooks/notifications/useBucketMutations.ts` for examples

**Legacy**: Apollo Client is being phased out but still used in some places.

### 4. Navigation

All navigation functions are centralized in `utils/navigation.ts`. When adding new routes:
1. Create the route files in both `app/(mobile)/` and `app/(tablet)/`
2. Add navigation function in `utils/navigation.ts`
3. Update `AdminSidebar.tsx` if it's an admin page

### 5. Component Structure

Admin pages follow this pattern:
```typescript
// app/(mobile)/(admin)/feature-name.tsx
import { FeatureComponent } from "@/components/FeatureComponent";

export default function FeatureScreen() {
  return <FeatureComponent />;
}
```

The actual logic lives in `components/FeatureComponent.tsx`.

### 6. TypeScript Type Safety

- Always use proper TypeScript types
- Avoid `any` unless absolutely necessary
- Use type assertions sparingly and only when types are verified
- For i18n translations in React components, cast to `string` when needed: `t("key") as string`

### 7. Styling

- Use React Native Paper components for consistency
- Follow Material Design 3 principles
- Use theme colors from `useTheme()` hook
- Responsive design for mobile, tablet, and desktop

### 8. Testing

Before committing, ensure:
- No TypeScript errors: `npm run typecheck`
- GraphQL codegen is up to date: `npm run codegen`
- All translations are complete in both languages

## Common Patterns

### i18n Usage with Type Safety
```typescript
import { useI18n } from "@/hooks/useI18n";

const { t } = useI18n();

// In JSX
<Text>{t("section.key") as string}</Text>

// In Alert
Alert.alert(
  t("section.title") as string,
  t("section.message") as string
);
```

### Data Fetching with TanStack Query
```typescript
const { data, loading, refetch } = useQuery({
  queryKey: ['resource', id],
  queryFn: fetchResource,
});

const mutation = useMutation({
  mutationFn: updateResource,
  onSuccess: () => queryClient.invalidateQueries(['resource']),
});
```

### GraphQL Operations
```graphql
# config/operations.graphql
query GetResource($id: ID!) {
  resource(id: $id) {
    id
    name
  }
}

mutation UpdateResource($id: ID!, $input: UpdateInput!) {
  updateResource(id: $id, input: $input) {
    id
    name
  }
}
```

## Key Files Reference

- **Translations**: `locales/en-EN.json`, `locales/it-IT.json`, `types/i18n.ts`
- **GraphQL**: `config/operations.graphql`, `generated/gql-operations-generated.ts`
- **Navigation**: `utils/navigation.ts`
- **Admin Menu**: `components/AdminSidebar.tsx`
- **Hooks**: `hooks/` directory (especially `hooks/notifications/`)
- **Routes**: `app/(mobile)/` and `app/(tablet)/` directories

## Checklist for New Features

- [ ] Add translations to both `en-EN.json` and `it-IT.json`
- [ ] Update TypeScript types in `types/i18n.ts`
- [ ] Add GraphQL operations if needed
- [ ] Run `npm run codegen` if GraphQL changed
- [ ] Create component in `components/`
- [ ] Create routes in both `app/(mobile)/` and `app/(tablet)/`
- [ ] Add navigation function in `utils/navigation.ts`
- [ ] Update `AdminSidebar.tsx` if admin feature
- [ ] Use TanStack Query for data fetching
- [ ] Follow existing code patterns and styling
- [ ] Test on both mobile and tablet layouts
- [ ] Verify TypeScript types with `npm run typecheck`
