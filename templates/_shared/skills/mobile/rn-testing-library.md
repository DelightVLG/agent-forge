# React Native Testing Library

Rules and patterns for testing React Native components. Apply on top of
`react-native.md` and `conventions.md`.

## Rules

- **Test behavior, not implementation.** Assert on what the user sees (text,
  accessibility labels) and does (press, scroll), not on component state or hook
  internals.
- **Query priority.** `getByRole` > `getByLabelText` > `getByText` >
  `getByTestId`. Use `testID` only as a last resort when no accessible query
  fits.
- **`userEvent` over `fireEvent`.** Use `@testing-library/react-native`'s
  `userEvent` for press, type, and scroll — it simulates the full event
  lifecycle. Reserve `fireEvent` for events `userEvent` doesn't support.
- **Mock native modules explicitly.** Create `jest.setup.ts` with mocks for
  modules like `react-native-reanimated`, `expo-*`, and navigation. Don't let
  tests fail with "native module not found".
- **MSW for network mocking.** Intercept HTTP at the network layer with MSW.
  Never mock `fetch` or API client functions directly.
- **Async-aware assertions.** Use `findBy*` queries or `waitFor` for assertions
  on async-rendered content. Never use `setTimeout` or fixed delays.
- **One behavior per test.** A test can have multiple `expect` calls, but they
  should verify one cohesive user interaction or outcome.
- **Test all screen states.** Cover loading, success, error, and empty states
  for every data-driven screen.
- **Co-locate tests.** Place `*.test.tsx` next to the component, not in a global
  `__tests__/` directory.
- **No snapshot tests for components.** Snapshots are brittle and provide no
  behavioral insight. Test visible outcomes instead.

## Patterns

### Basic component test

```tsx
// user-card.test.tsx
import { render, screen } from '@testing-library/react-native';
import { userEvent } from '@testing-library/react-native';
import { UserCard } from './user-card';

const mockUser = { id: '1', name: 'Alice', email: 'alice@example.com' };

describe('UserCard', () => {
  it('renders user name and email', () => {
    render(<UserCard user={mockUser} onPress={jest.fn()} />);

    expect(screen.getByText('Alice')).toBeOnTheScreen();
    expect(screen.getByText('alice@example.com')).toBeOnTheScreen();
  });

  it('calls onPress with user id when pressed', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    render(<UserCard user={mockUser} onPress={onPress} />);

    await user.press(screen.getByRole('button', { name: 'Alice' }));

    expect(onPress).toHaveBeenCalledWith('1');
  });
});
```

### Testing async data loading

```tsx
// user-list-screen.test.tsx
import { render, screen } from '@testing-library/react-native';
import { UserListScreen } from './user-list-screen';
import { renderWithProviders } from '@/test/render-with-providers';

describe('UserListScreen', () => {
  it('shows loading state then users', async () => {
    renderWithProviders(<UserListScreen />);

    expect(screen.getByText(/loading/i)).toBeOnTheScreen();

    expect(await screen.findByText('Alice')).toBeOnTheScreen();
    expect(screen.getByText('Bob')).toBeOnTheScreen();
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json(null, { status: 500 });
      }),
    );

    renderWithProviders(<UserListScreen />);

    expect(await screen.findByText(/failed to load/i)).toBeOnTheScreen();
  });

  it('shows empty state when no users', async () => {
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json([]);
      }),
    );

    renderWithProviders(<UserListScreen />);

    expect(await screen.findByText(/no users found/i)).toBeOnTheScreen();
  });
});
```

### Render helper with providers

```tsx
// test/render-with-providers.tsx
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';

export function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>{ui}</NavigationContainer>
    </QueryClientProvider>,
  );
}
```

### MSW setup for React Native

```typescript
// test/mocks/server.ts
import { setupServer } from 'msw/native';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```typescript
// test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ]);
  }),
];
```

```typescript
// jest.setup.ts
import { server } from './test/mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Mocking native modules

```typescript
// jest.setup.ts
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
```

### Testing navigation

```tsx
import { render, screen } from '@testing-library/react-native';
import { userEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

jest.mock('expo-router');

describe('HomeScreen', () => {
  it('navigates to user detail on press', async () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });

    const user = userEvent.setup();
    render(<HomeScreen />);

    await user.press(screen.getByText('View Profile'));

    expect(push).toHaveBeenCalledWith('/users/123');
  });
});
```

## Anti-patterns

```tsx
// ❌ Testing internal state
const { result } = renderHook(() => useCounter());
expect(result.current.count).toBe(0);
act(() => result.current.increment());
expect(result.current.count).toBe(1);

// ✅ Test via the component that uses the hook
render(<Counter />);
expect(screen.getByText('0')).toBeOnTheScreen();
await user.press(screen.getByRole('button', { name: /increment/i }));
expect(screen.getByText('1')).toBeOnTheScreen();
```

```tsx
// ❌ testID as first choice
screen.getByTestId('submit-button');

// ✅ Accessible query
screen.getByRole('button', { name: /submit/i });
```

```tsx
// ❌ Fixed timeout for async content
await new Promise((r) => setTimeout(r, 2000));
expect(screen.getByText('Alice')).toBeOnTheScreen();

// ✅ Async-aware query
expect(await screen.findByText('Alice')).toBeOnTheScreen();
```

```tsx
// ❌ Snapshot test — brittle, no behavioral insight
expect(tree).toMatchSnapshot();

// ✅ Behavioral assertion
expect(screen.getByText('Alice')).toBeOnTheScreen();
expect(screen.getByRole('button', { name: /edit/i })).toBeEnabled();
```

```tsx
// ❌ Mocking fetch directly
jest.spyOn(global, "fetch").mockResolvedValue(...);

// ✅ MSW at the network boundary
server.use(http.get("/api/users", () => HttpResponse.json(mockUsers)));
```

## Checklist

- [ ] Tests assert on visible behavior, not internal state
- [ ] Query priority: `getByRole` > `getByLabelText` > `getByText` >
      `getByTestId`
- [ ] `userEvent` used for all user interactions
- [ ] Network mocked via MSW, not direct `fetch` mocks
- [ ] All native modules mocked in `jest.setup.ts`
- [ ] Async content tested with `findBy*` or `waitFor`, no timeouts
- [ ] Loading, error, and empty states tested
- [ ] Tests co-located with components
- [ ] `renderWithProviders` helper for consistent test setup
- [ ] No snapshot tests for component output
