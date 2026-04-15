# React Native

Rules and patterns for React Native applications. Apply on top of
`conventions.md`.

## Rules

- **Functional components only.** No class components in new code. Use hooks for
  state, effects, and refs.
- **`StyleSheet.create` for all styles.** Never inline style objects — they
  create new references every render. Define styles at the bottom of the file.
- **`FlatList` for lists, never `ScrollView` with `.map()`.** `FlatList`
  virtualizes off-screen items. `ScrollView` renders everything and kills
  performance on long lists.
- **Platform-specific code via file extensions.** Use `*.ios.tsx` /
  `*.android.tsx` for divergent implementations. Use `Platform.select` for small
  inline differences only.
- **Safe areas everywhere.** Wrap screens with `SafeAreaView` or use
  `useSafeAreaInsets()` from `react-native-safe-area-context`. Never assume
  fixed insets.
- **Avoid anonymous functions in render.** Extract callbacks with `useCallback`
  for list items and frequently re-rendered components.
- **Reanimated for animations.** Use `react-native-reanimated` for performant
  animations that run on the UI thread. Reserve the `Animated` API for trivial
  cases only.
- **No hardcoded dimensions.** Use flexbox, percentages, or
  `useWindowDimensions` for responsive layouts. Never assume a specific screen
  size.
- **Image optimization.** Use `react-native-fast-image` (or Expo `Image`) for
  caching. Always specify `width`/`height` or `flex` to avoid layout shifts.
- **Error boundaries per screen.** Wrap each screen in an error boundary so a
  crash in one screen doesn't kill the whole app.

## Patterns

### Component with StyleSheet

```tsx
// components/user-card.tsx
import { View, Text, Pressable, StyleSheet } from "react-native";

interface Props {
  user: User;
  onPress: (id: string) => void;
}

export function UserCard({ user, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={() => onPress(user.id)}>
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.email}>{user.email}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  email: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
});
```

### Optimized FlatList

```tsx
import { FlatList } from "react-native";
import { useCallback } from "react";

export function UserList({ users }: { users: User[] }) {
  const renderItem = useCallback(
    ({ item }: { item: User }) => (
      <UserCard user={item} onPress={handlePress} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: User) => item.id, []);

  return (
    <FlatList
      data={users}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews
      ItemSeparatorComponent={Separator}
      ListEmptyComponent={<EmptyState message="No users found" />}
    />
  );
}
```

### Platform-specific code

```typescript
// Via Platform.select for small differences
import { Platform, StyleSheet } from "react-native";

const styles = StyleSheet.create({
  shadow: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
  }),
});
```

```
// Via file extensions for divergent implementations
components/
  date-picker.ios.tsx     # uses @react-native-community/datetimepicker iOS mode
  date-picker.android.tsx # uses Android-specific picker
  date-picker.tsx         # re-export (optional, if you want a unified import)
```

### Safe area handling

```tsx
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ScreenContainer({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {children}
    </View>
  );
}
```

### Reanimated animation

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

export function AnimatedCard({ children }: { children: ReactNode }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(0.95);
  };

  const onPressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  );
}
```

## Anti-patterns

```tsx
// ❌ ScrollView with map — renders all items, no virtualization
<ScrollView>
  {users.map((u) => <UserCard key={u.id} user={u} />)}
</ScrollView>

// ✅ FlatList virtualizes off-screen items
<FlatList
  data={users}
  renderItem={({ item }) => <UserCard user={item} />}
  keyExtractor={(item) => item.id}
/>
```

```tsx
// ❌ Inline styles — new object every render
<View style={{ padding: 16, backgroundColor: "#fff" }}>

// ✅ StyleSheet.create — static reference
<View style={styles.card}>
```

```tsx
// ❌ Hardcoded dimensions
<View style={{ width: 375, height: 812 }}>

// ✅ Responsive layout
<View style={{ flex: 1, padding: 16 }}>
```

```tsx
// ❌ Anonymous function in FlatList renderItem
<FlatList
  renderItem={({ item }) => (
    <UserCard user={item} onPress={() => nav(item.id)} />
  )}
/>;

// ✅ Extracted and memoized
const renderItem = useCallback(
  ({ item }) => <UserCard user={item} onPress={handlePress} />,
  [],
);
<FlatList renderItem={renderItem} />;
```

```tsx
// ❌ No safe area handling
<View style={{ paddingTop: 44 }}> {/* assumes iPhone X notch */}

// ✅ Dynamic safe area
const insets = useSafeAreaInsets();
<View style={{ paddingTop: insets.top }}>
```

## Checklist

- [ ] Functional components only, no class components
- [ ] All styles via `StyleSheet.create`, no inline objects
- [ ] Lists use `FlatList` / `SectionList`, never `ScrollView` + `.map()`
- [ ] `FlatList` has `keyExtractor`, `initialNumToRender`, and
      `ListEmptyComponent`
- [ ] Safe areas handled via `useSafeAreaInsets()` or `SafeAreaView`
- [ ] No hardcoded screen dimensions — flexbox and responsive layout
- [ ] Platform-specific code uses file extensions or `Platform.select`
- [ ] Animations use Reanimated, not `Animated` API for complex cases
- [ ] Images have explicit dimensions and use a caching library
- [ ] Error boundaries wrap each screen
