# Next.js

Rules and patterns for Next.js applications using App Router. Apply on top of
`react.md` and `conventions.md`.

## Rules

- **App Router only.** All new routes go in `app/`, not `pages/`. Never mix the
  two routers in the same project.
- **Server Components by default.** Only add `"use client"` when the component
  needs browser APIs, event handlers, or hooks (`useState`, `useEffect`, etc.).
  Push `"use client"` as far down the tree as possible.
- **Layouts for shared UI.** Use `layout.tsx` for persistent shells (nav,
  sidebar). Never re-render the layout on navigation — that's the whole point.
- **Loading/error/not-found per route segment.** Place `loading.tsx`,
  `error.tsx`, `not-found.tsx` next to the `page.tsx` that needs them.
- **Route Handlers for API logic.** Place in `app/api/.../route.ts`. Keep them
  thin — validate input, call a service, return `NextResponse.json()`.
- **Server Actions for mutations.** Use `"use server"` functions for form
  submissions and data mutations instead of client-side `fetch` to API routes.
- **Fetch with caching and revalidation.** Use the extended `fetch()` with
  `{ next: { revalidate: N } }` or `{ cache: "no-store" }`. Never roll your own
  caching layer on top.
- **Metadata API for SEO.** Export `metadata` or `generateMetadata()` from
  `page.tsx` / `layout.tsx`. Never use `<Head>` or manual `<meta>` tags.
- **`next/image` for all images.** Always specify `width`/`height` or use
  `fill`. Never use raw `<img>`.
- **`next/link` for all internal links.** Never use `<a href>` for client-side
  navigation.
- **Environment variables:** public vars must start with `NEXT_PUBLIC_`. Server-
  only vars must not.

## Patterns

### Route structure

```
app/
  layout.tsx          # root layout (html, body, providers)
  page.tsx            # home page
  loading.tsx         # root loading fallback
  not-found.tsx       # root 404
  (auth)/
    login/page.tsx
    register/page.tsx
  dashboard/
    layout.tsx        # dashboard shell with sidebar
    page.tsx
    loading.tsx
    settings/
      page.tsx
  api/
    users/
      route.ts        # GET /api/users, POST /api/users
      [id]/
        route.ts      # GET /api/users/:id, PATCH, DELETE
```

### Server Component with data fetching

```tsx
// app/dashboard/page.tsx
import { getStats } from '@/lib/api/stats';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const stats = await getStats(); // runs on server, no useEffect

  return (
    <div>
      <h1>Dashboard</h1>
      <StatsGrid stats={stats} />
    </div>
  );
}
```

### Client island inside Server Component

```tsx
// app/dashboard/page.tsx (Server Component)
import { SearchFilter } from './search-filter'; // client component

export default async function DashboardPage() {
  const data = await getData();
  return (
    <div>
      <SearchFilter /> {/* interactive part */}
      <DataTable data={data} /> {/* static, stays on server */}
    </div>
  );
}
```

```tsx
// app/dashboard/search-filter.tsx
'use client';

import { useState } from 'react';

export function SearchFilter() {
  const [query, setQuery] = useState('');
  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

### Server Action for mutation

```tsx
// app/users/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { usersService } from '@/lib/services/users';

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  await usersService.create({ name });
  revalidatePath('/users');
}
```

```tsx
// app/users/create-form.tsx
'use client';

import { createUser } from './actions';

export function CreateUserForm() {
  return (
    <form action={createUser}>
      <input name="name" required />
      <button type="submit">Create</button>
    </form>
  );
}
```

### Route Handler

```typescript
// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { usersService } from '@/lib/services/users';

export async function GET() {
  const users = await usersService.findAll();
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const body = await request.json();
  const user = await usersService.create(body);
  return NextResponse.json(user, { status: 201 });
}
```

## Anti-patterns

```tsx
// ❌ "use client" at the top of a page that doesn't need it
'use client';
export default function AboutPage() {
  return <div>About us</div>; // no interactivity — should be Server Component
}

// ✅ No directive needed — it's a Server Component by default
export default function AboutPage() {
  return <div>About us</div>;
}
```

```tsx
// ❌ useEffect for data fetching in a page component
"use client";
export default function UsersPage() {
  const [users, setUsers] = useState([]);
  useEffect(() => { fetch("/api/users").then(...) }, []);
}

// ✅ Fetch directly in Server Component
export default async function UsersPage() {
  const users = await getUsers();
  return <UserList users={users} />;
}
```

```tsx
// ❌ Raw <img> tag
<img src="/hero.png" />;

// ✅ next/image with dimensions
import Image from 'next/image';
<Image src="/hero.png" width={1200} height={600} alt="Hero" />;
```

```tsx
// ❌ Exposing server secret to client
const key = process.env.NEXT_PUBLIC_SECRET_KEY; // leaked!

// ✅ Server-only var (no NEXT_PUBLIC_ prefix)
const key = process.env.SECRET_KEY; // only available on server
```

## Checklist

- [ ] All routes use App Router (`app/`), no `pages/` directory
- [ ] `"use client"` only where strictly needed, pushed to leaf components
- [ ] Each route segment has `loading.tsx` and `error.tsx` where appropriate
- [ ] Data fetching happens in Server Components, not via `useEffect`
- [ ] Mutations use Server Actions or Route Handlers
- [ ] All images use `next/image` with proper dimensions
- [ ] All internal links use `next/link`
- [ ] Metadata exported via `metadata` or `generateMetadata()`
- [ ] No `NEXT_PUBLIC_` prefix on server-only secrets
- [ ] `fetch()` calls specify caching/revalidation strategy
