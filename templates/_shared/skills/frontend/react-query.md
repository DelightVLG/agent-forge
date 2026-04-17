# React Query (TanStack Query)

Rules and patterns for server state management with TanStack Query. Apply on top
of `react.md` and `conventions.md`.

## Rules

- **One query per data source.** Each API endpoint gets its own `useQuery` hook
  wrapper. Never fetch multiple unrelated endpoints in one query.
- **Structured query keys.** Use arrays with a hierarchy:
  `["users", "list", { page, filter }]`. Never use plain strings.
- **Factory pattern for keys.** Centralize keys in a `queryKeys` factory so
  invalidation is consistent and typo-free.
- **Set `staleTime` explicitly.** The default (`0`) causes refetches on every
  mount. Set a sensible value per query (e.g. 30s for dashboards, 5min for
  reference data).
- **Mutations invalidate, not refetch.** After a mutation, call
  `queryClient.invalidateQueries()` — don't manually refetch.
- **Optimistic updates for instant UX.** Use `onMutate` to update the cache
  immediately, `onError` to roll back, `onSettled` to revalidate.
- **Error and loading states are mandatory.** Every `useQuery` consumer must
  handle `isLoading`, `isError`, and empty-data states.
- **No `useEffect` + `fetch`.** If you need server data, use `useQuery`. If you
  need to mutate, use `useMutation`. Full stop.
- **Prefetch on hover/focus** for navigations that are likely. Use
  `queryClient.prefetchQuery()` to eliminate perceived latency.
- **Keep query functions pure.** The `queryFn` must not read or write local
  state. It receives the `queryKey` and returns a promise.

## Patterns

### Query key factory

```typescript
// lib/query-keys.ts
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};
```

### Custom query hook

```typescript
// hooks/use-users.ts
import { useQuery } from '@tanstack/react-query';
import { userKeys } from '@/lib/query-keys';
import { usersApi } from '@/lib/api/users';

export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => usersApi.getList(filters),
    staleTime: 30_000,
  });
}
```

### Mutation with invalidation

```typescript
// hooks/use-create-user.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userKeys } from '@/lib/query-keys';
import { usersApi } from '@/lib/api/users';

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
```

### Optimistic update

```typescript
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => itemsApi.toggleFavorite(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: itemKeys.detail(id) });
      const previous = queryClient.getQueryData(itemKeys.detail(id));

      queryClient.setQueryData(itemKeys.detail(id), (old: Item) => ({
        ...old,
        isFavorite: !old.isFavorite,
      }));

      return { previous };
    },

    onError: (_err, id, context) => {
      queryClient.setQueryData(itemKeys.detail(id), context?.previous);
    },

    onSettled: (_data, _err, id) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.detail(id) });
    },
  });
}
```

### Prefetch on hover

```tsx
function UserLink({ id, name }: { id: string; name: string }) {
  const queryClient = useQueryClient();

  const prefetch = () => {
    queryClient.prefetchQuery({
      queryKey: userKeys.detail(id),
      queryFn: () => usersApi.getById(id),
      staleTime: 60_000,
    });
  };

  return (
    <Link to={`/users/${id}`} onMouseEnter={prefetch}>
      {name}
    </Link>
  );
}
```

### Infinite query for pagination

```typescript
export function useUsersFeed() {
  return useInfiniteQuery({
    queryKey: userKeys.lists(),
    queryFn: ({ pageParam }) => usersApi.getList({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
```

## Anti-patterns

```typescript
// ❌ String query key — typo-prone, can't invalidate hierarchically
useQuery({ queryKey: 'users', queryFn: getUsers });

// ✅ Array key from factory
useQuery({
  queryKey: userKeys.list(filters),
  queryFn: () => getUsers(filters),
});
```

```typescript
// ❌ useEffect + fetch instead of useQuery
const [users, setUsers] = useState([]);
useEffect(() => {
  fetch('/api/users')
    .then((r) => r.json())
    .then(setUsers);
}, []);

// ✅ useQuery handles caching, deduplication, refetching
const { data: users } = useUsers(filters);
```

```typescript
// ❌ Manual refetch after mutation
const mutation = useMutation({ mutationFn: createUser });
const handleSubmit = async (data) => {
  await mutation.mutateAsync(data);
  await refetch(); // manually calling refetch
};

// ✅ Invalidate — React Query decides when/how to refetch
const mutation = useCreateUser(); // invalidates on success
```

```typescript
// ❌ No staleTime — refetches on every mount
useQuery({ queryKey: userKeys.list(filters), queryFn: getUsers });

// ✅ Explicit staleTime
useQuery({
  queryKey: userKeys.list(filters),
  queryFn: getUsers,
  staleTime: 30_000,
});
```

## Checklist

- [ ] Query key factory centralized, no string keys
- [ ] `staleTime` set explicitly for each query
- [ ] Mutations use `invalidateQueries`, not manual refetch
- [ ] Loading, error, and empty states handled in every consumer
- [ ] No `useEffect` + `fetch` patterns — `useQuery` used instead
- [ ] Optimistic updates implemented for user-facing mutations
- [ ] Prefetching used for predictable navigations
- [ ] Query functions are pure — no side effects or local state reads
- [ ] `QueryClientProvider` wraps the app with sensible global defaults
