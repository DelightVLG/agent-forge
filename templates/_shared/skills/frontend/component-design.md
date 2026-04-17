# Frontend Component Design

Rules and patterns for designing React components. Apply on top of `react.md`
and `conventions.md`.

## Rules

- **Composition over prop explosion.** If a component has more than 8 props,
  split it. Use children, slots (render props), or compound components instead
  of adding more configuration props.
- **Co-locate everything.** Component, test, types, and styles live in one
  folder. Don't scatter related files across global directories.
- **Design all states upfront.** Every component must handle loading, error,
  empty, and success states from the start — never retrofit them.
- **Single responsibility.** A component either renders UI or manages logic —
  not both. Extract logic into custom hooks; keep the component as a thin view
  layer.
- **Controlled inputs for forms.** Use controlled components unless there's an
  explicit performance reason for uncontrolled.
- **Prop drilling limit: 2 levels.** Beyond that, lift state to context, a state
  manager, or restructure via composition.
- **Explicit `children` over implicit nesting.** Accept `ReactNode` for flexible
  composition. Don't build rigid container components.
- **Avoid boolean prop cascades.** If you have `isLoading`, `isError`,
  `isEmpty`, use a discriminated union status type instead.
- **Forward refs on reusable primitives.** Buttons, inputs, and other base
  components must forward refs for focus management and integration with forms.

## Patterns

### Compound component

```tsx
// tabs/tabs.tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

interface TabsContextValue {
  active: string;
  setActive: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('useTabs must be used within <Tabs>');
  return ctx;
}

export function Tabs({
  defaultValue,
  children,
}: {
  defaultValue: string;
  children: ReactNode;
}) {
  const [active, setActive] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div role="tablist">{children}</div>
    </TabsContext.Provider>
  );
}

export function TabTrigger({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const { active, setActive } = useTabs();
  return (
    <button
      role="tab"
      aria-selected={active === id}
      onClick={() => setActive(id)}
    >
      {children}
    </button>
  );
}

export function TabContent({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const { active } = useTabs();
  if (active !== id) return null;
  return <div role="tabpanel">{children}</div>;
}
```

### Discriminated union for component state

```tsx
type ViewState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'empty' }
  | { status: 'success'; data: T };

interface Props {
  state: ViewState<User[]>;
}

export function UserList({ state }: Props) {
  switch (state.status) {
    case 'loading':
      return <Skeleton count={5} />;
    case 'error':
      return <ErrorBanner message={state.error} />;
    case 'empty':
      return <EmptyState message="No users found" />;
    case 'success':
      return (
        <ul>
          {state.data.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </ul>
      );
  }
}
```

### Forwarded ref primitive

```tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';

interface Props extends ComponentPropsWithoutRef<'input'> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, className, id, ...props }, ref) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        ref={ref}
        id={id}
        aria-invalid={!!error}
        className={cn(
          'rounded border px-3 py-2',
          error && 'border-red-500',
          className,
        )}
        {...props}
      />
      {error && <p role="alert">{error}</p>}
    </div>
  ),
);

Input.displayName = 'Input';
```

### Co-located folder structure

```
components/
  user-card/
    user-card.tsx
    user-card.test.tsx
    user-card.types.ts
    index.ts              # re-exports UserCard
```

## Anti-patterns

```tsx
// ❌ Boolean prop cascade
interface Props {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  data?: User[];
}

// ✅ Discriminated union — only valid combinations are possible
interface Props {
  state: ViewState<User[]>;
}
```

```tsx
// ❌ Prop explosion — component does too much
<DataTable
  data={data}
  columns={columns}
  sortable
  filterable
  paginated
  selectable
  expandable
  exportable
  onSort={...}
  onFilter={...}
  onPageChange={...}
  onSelect={...}
  onExpand={...}
  onExport={...}
/>

// ✅ Composed from smaller primitives
<DataTable data={data} columns={columns}>
  <DataTable.Toolbar>
    <DataTable.Filter />
    <DataTable.Export />
  </DataTable.Toolbar>
  <DataTable.Pagination />
</DataTable>
```

```tsx
// ❌ Logic-heavy component — mixing data fetching with rendering
export function UserDashboard() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');
  // ... 60 lines of effects and handlers
  return <div>...</div>;
}

// ✅ Hook extracts logic, component is a thin view
export function UserDashboard() {
  const { users, filter, setFilter, state } = useUserDashboard();
  return (
    <UserDashboardView state={state} filter={filter} onFilter={setFilter} />
  );
}
```

## Checklist

- [ ] No component has more than 8 props — split or compose
- [ ] Component, test, and types co-located in one folder
- [ ] Loading, error, and empty states handled from the start
- [ ] No prop drilling beyond 2 levels
- [ ] Logic extracted to hooks — component is a thin view
- [ ] Discriminated unions used instead of boolean prop cascades
- [ ] Reusable primitives forward refs
- [ ] Compound pattern used for complex multi-part widgets
