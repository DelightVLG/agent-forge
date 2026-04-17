# TypeScript (Frontend)

Rules and patterns for typing React and frontend code. Apply on top of
`react.md` and `conventions.md`.

## Rules

- **No `any`.** Use `unknown` when the type is truly unknown, then narrow. If
  you type something as `any`, you've turned off the compiler for that path.
- **Props as interfaces, not `FC`.** Define a `Props` interface and type the
  function parameter. Avoid `React.FC` — it obscures children handling and
  doesn't add value.
- **Discriminated unions for state.** Model loading/error/success as a union
  with a `status` literal, not separate booleans. The compiler ensures
  exhaustive handling.
- **Infer where possible.** Let TypeScript infer return types of functions and
  hook results. Only annotate when the inferred type is wrong or too wide.
- **Strict mode always.** `strict: true` in `tsconfig.json`. Never set
  `strictNullChecks` or `noImplicitAny` to `false`.
- **`satisfies` over `as`.** Use `satisfies` to validate a value matches a type
  while keeping the narrowest inferred type. Reserve `as` for rare cases where
  you genuinely know more than the compiler.
- **Generic components for reusable patterns.** Table, List, Select — make them
  generic over the data type.
- **Shared types in a `types/` directory** at the package level. Co-locate
  component-specific types with the component.
- **`type` for unions and intersections, `interface` for shapes.** Use
  `interface` for object shapes that might be extended; `type` for everything
  else.

## Patterns

### Discriminated union for async state

```typescript
type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; data: T };

function renderState<T>(state: AsyncState<T>, render: (data: T) => ReactNode) {
  switch (state.status) {
    case "idle":
      return null;
    case "loading":
      return <Spinner />;
    case "error":
      return <ErrorBanner message={state.error} />;
    case "success":
      return render(state.data);
  }
}
```

### Generic component

```tsx
interface Props<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
}

export function List<T>({
  items,
  renderItem,
  keyExtractor,
  emptyMessage,
}: Props<T>) {
  if (items.length === 0) {
    return <p>{emptyMessage ?? 'No items'}</p>;
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={keyExtractor(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

// Usage — T is inferred as User
<List
  items={users}
  renderItem={(user) => <UserCard user={user} />}
  keyExtractor={(user) => user.id}
/>;
```

### Event handler typing

```tsx
interface Props {
  onChange: (value: string) => void;
}

export function SearchInput({ onChange }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return <input type="search" onChange={handleChange} />;
}
```

### satisfies for config objects

```typescript
const routes = {
  home: '/',
  users: '/users',
  userDetail: '/users/:id',
} satisfies Record<string, string>;

// routes.home is typed as "/" (literal), not string
```

### Type narrowing with type guards

```typescript
interface ApiError {
  code: string;
  message: string;
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value
  );
}

// Usage
catch (err) {
  if (isApiError(err)) {
    showToast(err.message); // safely narrowed
  } else {
    showToast("An unexpected error occurred");
  }
}
```

### Typed context

```typescript
interface AuthContextValue {
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
```

## Anti-patterns

```typescript
// ❌ any disables type checking
const data: any = await fetch('/api').then((r) => r.json());
data.whatever.you.want; // no error, no safety

// ✅ unknown + narrowing
const data: unknown = await fetch('/api').then((r) => r.json());
if (isUserResponse(data)) {
  console.log(data.name); // safe
}
```

```tsx
// ❌ React.FC obscures children and adds no value
const UserCard: React.FC<Props> = ({ user }) => { ... };

// ✅ Plain function with typed props
function UserCard({ user }: Props) { ... }
```

```typescript
// ❌ as for type assertion instead of validation
const user = data as User; // might be wrong at runtime

// ✅ satisfies or runtime validation
const user = userSchema.parse(data); // Zod validates at runtime
```

```typescript
// ❌ Separate booleans for state
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError] = useState(false);
const [data, setData] = useState<User[] | null>(null);
// What if isLoading AND isError are both true?

// ✅ Discriminated union — impossible states are unrepresentable
const [state, setState] = useState<AsyncState<User[]>>({ status: 'idle' });
```

```typescript
// ❌ Over-annotating what TypeScript can infer
const name: string = 'Alice';
const double: (n: number) => number = (n) => n * 2;

// ✅ Let inference work
const name = 'Alice';
const double = (n: number) => n * 2;
```

## Checklist

- [ ] `strict: true` in tsconfig, no `any` in codebase
- [ ] Props typed as interface, not using `React.FC`
- [ ] Async state modeled as discriminated union, not separate booleans
- [ ] `satisfies` used instead of `as` for type-safe config
- [ ] Generic components for reusable list/table/select patterns
- [ ] Type guards used for runtime narrowing of `unknown`
- [ ] Context typed with non-null assertion hook pattern
- [ ] Event handlers properly typed (`React.ChangeEvent<HTMLInputElement>`)
- [ ] Shared types in `types/`, component types co-located
- [ ] Return types inferred, not manually annotated
