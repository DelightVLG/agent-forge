# React Navigation

Rules and patterns for React Navigation in React Native. Apply on top of
`react-native.md` and `conventions.md`.

## Rules

- **Typed navigation always.** Define `RootStackParamList` and related param
  lists. Use `NativeStackScreenProps` or `useNavigation<>()` with explicit
  types. Never navigate with untyped strings.
- **One navigator per concern.** Use Stack for linear flows, Tabs for top-level
  sections, Drawer for side menus. Nest navigators only when the UX requires it.
- **Screen options in the navigator, not the screen.** Define default `options`
  and `screenOptions` in the navigator. Override in individual screens only when
  needed.
- **Pass minimal params.** Pass IDs, not full objects. Fetch data on the
  destination screen. Params are serialized — large objects cause performance
  issues and stale data.
- **Deep linking config at the top.** Define the `linking` config in
  `NavigationContainer`. Map every screen that needs a URL to a path pattern.
- **Reset instead of nested navigate for auth flows.** After login/logout, use
  `CommonActions.reset()` to clear the navigation stack. Don't leave protected
  screens in the back stack.
- **Avoid nesting more than 3 levels.** Deeply nested navigators are confusing
  and slow. Flatten when possible.
- **Use `useFocusEffect` for screen-level side effects.** Not `useEffect` —
  screens in a stack stay mounted. `useFocusEffect` runs when the screen is
  actually visible.

## Patterns

### Typed param lists

```typescript
// navigation/types.ts
export type RootStackParamList = {
  Home: undefined;
  UserDetail: { userId: string };
  Settings: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: { referralCode?: string };
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  ProfileTab: undefined;
  SettingsTab: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

### Stack navigator

```tsx
// navigation/root-stack.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitleVisible: false,
        headerTintColor: '#111',
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen
        name="UserDetail"
        component={UserDetailScreen}
        options={{ title: 'User' }}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
```

### Tab navigator

```tsx
// navigation/main-tabs.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, User, Settings } from 'lucide-react-native';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings color={color} size={24} />,
        }}
      />
    </Tab.Navigator>
  );
}
```

### Typed navigation in screen

```tsx
// screens/home-screen.tsx
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  return (
    <View>
      <Pressable
        onPress={() => navigation.navigate('UserDetail', { userId: '123' })}
      >
        <Text>View User</Text>
      </Pressable>
    </View>
  );
}
```

### Deep linking config

```tsx
// navigation/linking.ts
import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['myapp://', 'https://myapp.com'],
  config: {
    screens: {
      Home: '',
      UserDetail: 'users/:userId',
      Settings: 'settings',
    },
  },
};
```

```tsx
// App.tsx
<NavigationContainer linking={linking} fallback={<LoadingScreen />}>
  <RootStack />
</NavigationContainer>
```

### Auth flow with stack reset

```typescript
import { CommonActions, useNavigation } from '@react-navigation/native';

function useLogout() {
  const navigation = useNavigation();

  return () => {
    clearAuthTokens();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      }),
    );
  };
}
```

### useFocusEffect for screen data

```tsx
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

export function ProfileScreen() {
  useFocusEffect(
    useCallback(() => {
      refreshProfile();

      return () => {
        // cleanup on blur
      };
    }, []),
  );

  return <View>{/* ... */}</View>;
}
```

## Anti-patterns

```tsx
// ❌ Passing full objects as params
navigation.navigate('UserDetail', { user: fullUserObject });

// ✅ Pass only the ID, fetch on the destination
navigation.navigate('UserDetail', { userId: user.id });
```

```tsx
// ❌ Untyped navigation — runtime crash if param is missing
navigation.navigate('UserDetail'); // missing userId

// ✅ TypeScript catches it at compile time
navigation.navigate('UserDetail', { userId: '123' }); // required by ParamList
```

```tsx
// ❌ useEffect in a stacked screen — doesn't re-run on focus
useEffect(() => {
  fetchData();
}, []);

// ✅ useFocusEffect — runs when screen is visible
useFocusEffect(
  useCallback(() => {
    fetchData();
  }, []),
);
```

```tsx
// ❌ Navigate after logout — protected screens still in stack
navigation.navigate('Login');

// ✅ Reset stack — clean slate
navigation.dispatch(
  CommonActions.reset({
    index: 0,
    routes: [{ name: 'Login' }],
  }),
);
```

```tsx
// ❌ 4+ levels of nested navigators
<Stack>
  <Tabs>
    <Stack>
      <Drawer>
        <Screen />  // deeply buried
      </Drawer>
    </Stack>
  </Tabs>
</Stack>

// ✅ Flatten — max 2-3 levels
<Stack>
  <Tabs>
    <Screen />
  </Tabs>
</Stack>
```

## Checklist

- [ ] All param lists typed — `RootStackParamList`, etc.
- [ ] Global `ReactNavigation.RootParamList` declaration for `useNavigation()`
- [ ] Screen options set in navigator, overridden per-screen only when needed
- [ ] Params are minimal (IDs only), not full data objects
- [ ] Deep linking config defined with all linkable screens
- [ ] Auth flow uses `CommonActions.reset()`, not `navigate()`
- [ ] `useFocusEffect` used for screen-level data fetching
- [ ] Navigator nesting no deeper than 3 levels
- [ ] All navigators use typed props (`NativeStackScreenProps`, etc.)
