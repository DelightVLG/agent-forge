# Expo Router

Rules and patterns for file-based routing in Expo. Apply on top of `expo.md`,
`react-native.md`, and `conventions.md`.

## Rules

- **File-based routing only.** All screens live in `app/`. The file path is the
  URL. Never define routes imperatively when using Expo Router.
- **Layouts for shared UI.** Use `_layout.tsx` for persistent shells (tabs,
  stacks, drawers). Nest layouts for deeper navigation hierarchies.
- **Stack by default, tabs for top-level.** Use `Stack` in `_layout.tsx` for
  most sections. Use `Tabs` only at the root or top-level navigation.
- **Type-safe navigation.** Use `useRouter()` with typed paths. Define route
  params via `useLocalSearchParams<>()` with explicit types — never cast or use
  `any`.
- **Groups for organization.** Use parenthesized folders `(auth)`, `(app)` to
  group routes without affecting the URL path. Use `_layout.tsx` in each group.
- **Modal screens via `presentation: "modal"`.** Configure in the parent
  layout's `<Stack.Screen options>`, not in the modal file itself.
- **Auth guard in root layout.** Redirect unauthenticated users in the root
  `_layout.tsx` using `useSegments()` and `useRouter()`. Don't scatter auth
  checks across individual screens.
- **Deep linking is automatic.** Expo Router generates URL schemes from the file
  structure. Test deep links with `npx uri-scheme open`.
- **Error and not-found routes.** Place `+not-found.tsx` at the root of `app/`
  for 404s. Use `ErrorBoundary` exports in layouts for error recovery.

## Patterns

### Root layout with Stack

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen
        name="modal"
        options={{ presentation: 'modal', title: 'Details' }}
      />
    </Stack>
  );
}
```

### Tab layout

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Home, Settings, User } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#3b82f6' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
```

### Typed navigation and params

```tsx
// app/users/[id].tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, Pressable } from 'react-native';

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <View>
      <Text>User ID: {id}</Text>
      <Pressable onPress={() => router.push(`/users/${id}/edit`)}>
        <Text>Edit</Text>
      </Pressable>
      <Pressable onPress={() => router.back()}>
        <Text>Go Back</Text>
      </Pressable>
    </View>
  );
}
```

### Auth guard in root layout

```tsx
// app/_layout.tsx
import { useEffect } from 'react';
import { useRouter, useSegments, Stack } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';

export default function RootLayout() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, segments, isLoading]);

  if (isLoading) return <LoadingScreen />;

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
```

### Route structure example

```
app/
  _layout.tsx              # Root Stack
  +not-found.tsx           # 404 fallback
  (auth)/
    _layout.tsx            # Auth Stack (no header)
    login.tsx
    register.tsx
  (tabs)/
    _layout.tsx            # Tab Navigator
    index.tsx              # Home tab
    profile.tsx            # Profile tab
    settings.tsx           # Settings tab
  users/
    [id].tsx               # /users/:id
    [id]/
      edit.tsx             # /users/:id/edit
  modal.tsx                # Presented as modal
```

### Not-found and error handling

```tsx
// app/+not-found.tsx
import { Link } from 'expo-router';
import { View, Text } from 'react-native';

export default function NotFoundScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Page not found</Text>
      <Link href="/">Go home</Link>
    </View>
  );
}
```

## Anti-patterns

```tsx
// ❌ Imperative navigation setup alongside file-based routing
const Stack = createNativeStackNavigator();
<Stack.Navigator>
  <Stack.Screen name="Home" component={HomeScreen} />
</Stack.Navigator>;

// ✅ File-based — just create app/index.tsx
// Expo Router handles the rest
```

```tsx
// ❌ Auth check in every screen
export default function ProfileScreen() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/login" />;
  // ...
}

// ✅ Single auth guard in root _layout.tsx
// All protected screens are automatically guarded
```

```tsx
// ❌ Untyped params
const { id } = useLocalSearchParams(); // id is string | string[]

// ✅ Typed params
const { id } = useLocalSearchParams<{ id: string }>();
```

```tsx
// ❌ Configuring modal presentation inside the modal file
export default function ModalScreen() {
  return <Stack.Screen options={{ presentation: 'modal' }} />;
}

// ✅ Configure in parent layout
<Stack.Screen name="modal" options={{ presentation: 'modal' }} />;
```

## Checklist

- [ ] All screens in `app/` directory — no imperative route definitions
- [ ] Layouts (`_layout.tsx`) used for navigation structure
- [ ] Route params typed via `useLocalSearchParams<>()`
- [ ] Auth guard in root `_layout.tsx`, not per-screen
- [ ] Groups `(auth)`, `(tabs)` used for logical organization
- [ ] Modals configured via `presentation: "modal"` in parent layout
- [ ] `+not-found.tsx` at app root for 404 handling
- [ ] Deep links tested with `npx uri-scheme open`
- [ ] Navigation uses `useRouter()` and typed paths
