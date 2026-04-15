# Zustand

Rules and patterns for state management with Zustand. Apply on top of `react.md`
and `conventions.md`.

## Rules

- **One store per domain.** Split state by feature (`useAuthStore`,
  `useCartStore`), not by type. Never create a single monolithic store.
- **Selectors always.** Never subscribe to the entire store. Use
  `useCartStore((s) => s.items)` so the component only re-renders when `items`
  changes.
- **Actions inside the store.** Define mutations as store methods, not as
  external functions that call `setState`. This keeps state logic co-located.
- **Immer for nested updates.** Use the `immer` middleware for stores with
  deeply nested state. For flat state, plain spread is fine.
- **Persist sparingly.** Only persist what must survive a page reload (auth
  token, user preferences). Never persist server-derived data — refetch it.
- **No business logic in components.** Components call store actions; they don't
  compute derived state inline. Put computed values in the store or in a
  selector.
- **Devtools in development.** Wrap stores with `devtools` middleware. Name each
  store for easy identification in Redux DevTools.
- **TypeScript interfaces for state.** Define explicit `State` and `Actions`
  types. Never use `any` for store slices.
- **Prefer server state tools** (React Query / TanStack Query) for data that
  comes from an API. Zustand is for client-only state (UI toggles, forms,
  selections).

## Patterns

### Basic store with typed actions

```typescript
// stores/use-cart-store.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface CartItem {
  id: string;
  name: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  devtools(
    (set) => ({
      items: [],

      addItem: (item) =>
        set(
          (state) => {
            const existing = state.items.find((i) => i.id === item.id);
            if (existing) {
              return {
                items: state.items.map((i) =>
                  i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
                ),
              };
            }
            return { items: [...state.items, { ...item, quantity: 1 }] };
          },
          false,
          "cart/addItem",
        ),

      removeItem: (id) =>
        set(
          (state) => ({ items: state.items.filter((i) => i.id !== id) }),
          false,
          "cart/removeItem",
        ),

      clear: () => set({ items: [] }, false, "cart/clear"),
    }),
    { name: "CartStore" },
  ),
);
```

### Selectors and derived state

```typescript
// Atomic selector — component re-renders only when count changes
const itemCount = useCartStore((s) => s.items.length);

// Derived selector with useShallow for object stability
import { useShallow } from "zustand/react/shallow";

const { items, addItem } = useCartStore(
  useShallow((s) => ({ items: s.items, addItem: s.addItem })),
);
```

### Persist middleware

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThemeState {
  mode: "light" | "dark";
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "light",
      toggle: () =>
        set((s) => ({ mode: s.mode === "light" ? "dark" : "light" })),
    }),
    { name: "theme-storage" },
  ),
);
```

### Immer for nested updates

```typescript
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface FormState {
  fields: {
    personal: { name: string; email: string };
    address: { city: string; zip: string };
  };
  updateField: <
    S extends keyof FormState["fields"],
    K extends keyof FormState["fields"][S],
  >(
    section: S,
    key: K,
    value: FormState["fields"][S][K],
  ) => void;
}

export const useFormStore = create<FormState>()(
  immer((set) => ({
    fields: {
      personal: { name: "", email: "" },
      address: { city: "", zip: "" },
    },
    updateField: (section, key, value) =>
      set((state) => {
        state.fields[section][key] = value;
      }),
  })),
);
```

## Anti-patterns

```typescript
// ❌ Subscribing to the entire store — re-renders on any change
const store = useCartStore();

// ✅ Select only what's needed
const items = useCartStore((s) => s.items);
```

```typescript
// ❌ Mutating state outside the store
const items = useCartStore.getState().items;
items.push(newItem); // direct mutation!

// ✅ Use a store action
useCartStore.getState().addItem(newItem);
```

```typescript
// ❌ Persisting server data
persist(
  (set) => ({
    users: [], // fetched from API — will go stale
  }),
  { name: "users-storage" },
);

// ✅ Use React Query for server data, persist only client state
```

```typescript
// ❌ One mega-store for everything
const useStore = create(() => ({
  user: null,
  cart: [],
  theme: "light",
  notifications: [],
  modalOpen: false,
  // ... 30 more fields
}));

// ✅ Split by domain
const useAuthStore = create(() => ({ user: null }));
const useCartStore = create(() => ({ items: [] }));
const useUIStore = create(() => ({ theme: "light", modalOpen: false }));
```

## Checklist

- [ ] One store per domain, not a monolithic store
- [ ] Components use atomic selectors, never subscribe to entire store
- [ ] Actions are defined inside the store, not in components
- [ ] `devtools` middleware enabled with named stores
- [ ] `persist` only used for client-only data (preferences, tokens)
- [ ] Server-fetched data managed by React Query, not Zustand
- [ ] Nested state uses `immer` middleware
- [ ] State and action types explicitly defined
- [ ] `useShallow` used when selecting multiple values
