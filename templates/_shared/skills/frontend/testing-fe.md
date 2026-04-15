# Frontend Testing

Rules and patterns for testing React applications. Apply on top of `react.md`
and `conventions.md`.

## Rules

- **Test behavior, not implementation.** Assert on what the user sees and does
  (text, roles, interactions), not on component internals (state, props, hooks).
- **Query priority.** Follow Testing Library's priority: `getByRole` >
  `getByLabelText` > `getByText` > `getByTestId`. Use `getByTestId` only as a
  last resort.
- **Mock at the network boundary.** Use MSW (Mock Service Worker) to intercept
  HTTP requests. Never mock `fetch`, `axios`, or internal API functions
  directly.
- **One assertion focus per test.** A test can have multiple `expect`
  statements, but they should all verify one behavior (e.g. "submitting a form
  shows success and clears fields").
- **No framework internals.** Don't test that `useState` was called or that a
  hook returned a specific value. Test the outcome visible to the user.
- **`userEvent` over `fireEvent`.** `userEvent` simulates real browser
  interactions (typing, clicking with focus). Use it for all user actions.
- **Async aware.** Use `findBy*` queries or `waitFor` for assertions on async
  data. Never use `setTimeout` or fixed delays.
- **Test error states.** Happy path is not enough. Test loading, error, empty,
  and edge cases.
- **E2E for critical flows.** Use Playwright for cross-page user journeys
  (login, checkout, onboarding). Keep the suite small and focused.
- **Co-locate tests.** Place `*.test.tsx` next to the component file, not in a
  global `__tests__/` directory.

## Patterns

### Component test with Testing Library

```tsx
// user-card.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserCard } from "./user-card";

const mockUser = { id: "1", name: "Alice", email: "alice@example.com" };

describe("UserCard", () => {
  it("renders user name and email", () => {
    render(<UserCard user={mockUser} onEdit={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Alice" })).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  it("calls onEdit with user id when edit button is clicked", async () => {
    const onEdit = vi.fn();
    render(<UserCard user={mockUser} onEdit={onEdit} />);

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));

    expect(onEdit).toHaveBeenCalledWith("1");
  });
});
```

### MSW for network mocking

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/users", () => {
    return HttpResponse.json([
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
    ]);
  }),

  http.post("/api/users", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: "3", ...body }, { status: 201 });
  }),

  http.get("/api/users/:id", ({ params }) => {
    return HttpResponse.json({ id: params.id, name: "Alice" });
  }),
];
```

```typescript
// mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

```typescript
// setup-tests.ts
import { server } from "./mocks/server";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Testing async data loading

```tsx
import { render, screen } from "@testing-library/react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { UserList } from "./user-list";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

it("shows users after loading", async () => {
  renderWithProviders(<UserList />);

  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  expect(await screen.findByText("Alice")).toBeInTheDocument();
  expect(screen.getByText("Bob")).toBeInTheDocument();
});
```

### Testing error state

```tsx
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";

it("shows error message when API fails", async () => {
  server.use(
    http.get("/api/users", () => {
      return HttpResponse.json({ message: "Server error" }, { status: 500 });
    }),
  );

  renderWithProviders(<UserList />);

  expect(await screen.findByRole("alert")).toHaveTextContent(/failed to load/i);
});
```

### Playwright E2E for critical flow

```typescript
// e2e/login.spec.ts
import { test, expect } from "@playwright/test";

test("user can log in and see dashboard", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill("alice@example.com");
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  await expect(page.getByText("Welcome, Alice")).toBeVisible();
});
```

## Anti-patterns

```tsx
// ❌ Testing implementation details
expect(component.state.isOpen).toBe(true);
expect(useToggle).toHaveBeenCalled();

// ✅ Testing visible behavior
expect(screen.getByRole("dialog")).toBeInTheDocument();
```

```tsx
// ❌ getByTestId as first choice
screen.getByTestId("submit-btn");

// ✅ Accessible query
screen.getByRole("button", { name: /submit/i });
```

```tsx
// ❌ fireEvent for user interactions
fireEvent.change(input, { target: { value: "test" } });

// ✅ userEvent simulates real behavior
await userEvent.type(input, "test");
```

```tsx
// ❌ Fixed delay for async
await new Promise((r) => setTimeout(r, 1000));
expect(screen.getByText("Alice")).toBeInTheDocument();

// ✅ Async-aware query
expect(await screen.findByText("Alice")).toBeInTheDocument();
```

```tsx
// ❌ Mocking fetch directly
vi.spyOn(global, "fetch").mockResolvedValue(...)

// ✅ MSW at the network boundary
server.use(http.get("/api/users", () => HttpResponse.json(mockData)));
```

## Checklist

- [ ] Tests assert on visible behavior, not internal state
- [ ] Query priority followed: `getByRole` > `getByLabelText` > `getByText`
- [ ] `userEvent` used for all user interactions
- [ ] Network mocked via MSW, not `vi.spyOn(fetch)`
- [ ] Async operations use `findBy*` or `waitFor`, no `setTimeout`
- [ ] Error and empty states tested, not just happy path
- [ ] Tests co-located with components
- [ ] Provider wrappers extracted into reusable `renderWithProviders`
- [ ] Playwright E2E covers critical user journeys
- [ ] No snapshot tests for component output (test behavior instead)
