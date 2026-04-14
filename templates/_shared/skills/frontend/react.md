# React

Rules and patterns for React applications. Apply on top of `conventions.md`.

## Rules

- **One component per file.** File name matches the component: `UserCard.tsx` →
  `export function UserCard`.
- **Functional components only.** Never use class components in new code.
- **Props via destructuring** in the function signature. Define a `Props` type
  (or interface) above the component, not inline.
- **Co-locate related files.** Hooks, types, utils, and tests live next to the
  component that uses them, not in global folders.
- **Custom hooks for reusable logic.** If two components share the same
  `useState` + `useEffect` combo, extract it into a `use*.ts` hook.
- **Avoid prop drilling beyond 2 levels.** Use context, composition
  (children/render props), or a state manager instead.
- **Never mutate state directly.** Always return new references in setState and
  reducers.
- **Memoize intentionally.** Use `React.memo`, `useMemo`, `useCallback` only
  when you've identified a measurable render bottleneck — not by default.
- **Side effects in `useEffect`** must have correct dependency arrays. Never
  suppress the exhaustive-deps lint rule.
- **Error boundaries** around route-level and feature-level boundaries. Show a
  fallback UI, never a white screen.
- **Lazy-load heavy routes/features** with `React.lazy` + `Suspense`.
- **Keys must be stable and unique.** Never use array index as key if the list
  can be reordered or filtered.

## Patterns

### Component with typed props

```tsx
// UserCard.tsx
interface Props {
  user: UserDto;
  onEdit: (id: string) => void;
}

export function UserCard({ user, onEdit }: Props) {
  return (
    <div className="rounded-lg border p-4">
      <h3>{user.name}</h3>
      <button onClick={() => onEdit(user.id)}>Edit</button>
    </div>
  );
}
```

### Custom hook

```typescript
// use-debounced-value.ts
import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
```

### Composition over prop drilling

```tsx
// ❌ Passing theme 3 levels deep
<App theme={theme}>
  <Layout theme={theme}>
    <Sidebar theme={theme} />
  </Layout>
</App>

// ✅ Context + composition
<ThemeProvider value={theme}>
  <Layout>
    <Sidebar />
  </Layout>
</ThemeProvider>
```

### Error boundary wrapper

```tsx
// ErrorBoundary.tsx
import { Component, type ReactNode } from "react";

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
```

## Anti-patterns

```tsx
// ❌ Inline object in JSX — creates new reference every render
<UserCard style={{ margin: 8 }} />;

// ✅ Stable reference
const cardStyle = { margin: 8 };
<UserCard style={cardStyle} />;
```

```tsx
// ❌ Index as key on a filterable list
{
  users.map((u, i) => <UserCard key={i} user={u} />);
}

// ✅ Stable unique key
{
  users.map((u) => <UserCard key={u.id} user={u} />);
}
```

```tsx
// ❌ Suppressing lint
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => { fetchData(); }, []);

// ✅ Correct dependencies
const fetchData = useCallback(() => { ... }, [userId]);
useEffect(() => { fetchData(); }, [fetchData]);
```

```tsx
// ❌ Logic-heavy component (150+ lines)
export function Dashboard() {
  // ... 100 lines of state, effects, handlers
  return <div>...</div>;
}

// ✅ Extract hooks and sub-components
export function Dashboard() {
  const { stats, isLoading } = useDashboardStats();
  const { filters, updateFilter } = useDashboardFilters();
  return <DashboardView stats={stats} filters={filters} />;
}
```

## Checklist

- [ ] One component per file, name matches export
- [ ] Props typed with an interface/type, not `any`
- [ ] No prop drilling beyond 2 levels
- [ ] `useEffect` dependency arrays are correct (no lint suppression)
- [ ] Keys are stable and unique (no index keys on dynamic lists)
- [ ] Error boundaries around route/feature boundaries
- [ ] Heavy routes are lazy-loaded
- [ ] No premature memoization without measured need
- [ ] Custom hooks extracted for shared stateful logic
