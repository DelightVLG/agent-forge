# Prisma

Rules and patterns for working with Prisma ORM. Apply on top of `conventions.md`
and `db-migrations.md`.

## Rules

- **Schema is the single source of truth.** All models, relations, and enums
  live in `prisma/schema.prisma`. Never modify the database schema outside of
  Prisma migrations.
- **Use `prisma migrate dev` in development, `prisma migrate deploy` in
  CI/production.** Never run `migrate dev` in production — it can reset data.
- **Select only what you need.** Use `select` or `include` explicitly. Never
  fetch entire relations without limiting fields. Avoid
  `include: { posts: true }` on unbounded relations.
- **Use transactions for multi-step writes.** Use `prisma.$transaction()` for
  operations that must be atomic. Prefer interactive transactions over the array
  syntax for complex flows.
- **Validate at the application layer, not Prisma.** Prisma enforces DB
  constraints but doesn't provide input validation. Use Zod or class-validator
  before calling Prisma.
- **Avoid N+1 queries.** Use `include` for related data in a single query. For
  list views, batch-load relations instead of querying in a loop.
- **Use enums for fixed value sets.** Define enums in the schema, not as string
  columns with application-level validation.
- **Connection pooling via `connection_limit` and `pool_timeout`.** Set
  `connection_limit` in the connection string for serverless environments. Use
  PgBouncer or Prisma Accelerate for high-concurrency scenarios.
- **Seed data via `prisma db seed`.** Define seed logic in `prisma/seed.ts`.
  Seeds must be idempotent — safe to run multiple times.
- **Keep the Prisma Client up to date.** Run `prisma generate` after every
  schema change. Add it to `postinstall` in `package.json`.

## Patterns

### Schema definition

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  USER
  ADMIN
  EDITOR
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      Role     @default(USER)
  posts     Post[]
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String   @map("author_id")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([authorId])
  @@map("posts")
}
```

### Selective queries

```typescript
// Fetch only needed fields
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
  },
});

// Include relations with field selection
const userWithPosts = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    posts: {
      where: { published: true },
      select: { id: true, title: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    },
  },
});
```

### Interactive transaction

```typescript
async function transferCredits(fromId: string, toId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    const sender = await tx.user.findUniqueOrThrow({
      where: { id: fromId },
      select: { credits: true },
    });

    if (sender.credits < amount) {
      throw new AppError('INSUFFICIENT_CREDITS', 'Not enough credits', 422);
    }

    await tx.user.update({
      where: { id: fromId },
      data: { credits: { decrement: amount } },
    });

    await tx.user.update({
      where: { id: toId },
      data: { credits: { increment: amount } },
    });
  });
}
```

### Cursor-based pagination

```typescript
async function getUsers(cursor?: string, limit = 20) {
  const users = await prisma.user.findMany({
    take: limit + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    orderBy: { createdAt: 'desc' },
  });

  const hasMore = users.length > limit;
  if (hasMore) users.pop();

  return {
    data: users,
    pagination: {
      cursor: users.at(-1)?.id ?? null,
      hasMore,
    },
  };
}
```

### Idempotent seed

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      role: 'ADMIN',
    },
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## Anti-patterns

```typescript
// ❌ Fetching everything — unbounded relation
const user = await prisma.user.findUnique({
  where: { id },
  include: { posts: true, comments: true, likes: true },
});

// ✅ Select only what the UI/API needs
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    posts: { select: { id: true, title: true }, take: 10 },
  },
});
```

```typescript
// ❌ N+1: querying in a loop
const users = await prisma.user.findMany();
for (const user of users) {
  const posts = await prisma.post.findMany({ where: { authorId: user.id } });
}

// ✅ Single query with include
const users = await prisma.user.findMany({
  include: { posts: { select: { id: true, title: true } } },
});
```

```typescript
// ❌ Multi-step write without transaction
await prisma.user.update({
  where: { id: fromId },
  data: { credits: { decrement: 100 } },
});
await prisma.user.update({
  where: { id: toId },
  data: { credits: { increment: 100 } },
});
// If second query fails, credits are lost

// ✅ Wrap in transaction
await prisma.$transaction([
  prisma.user.update({
    where: { id: fromId },
    data: { credits: { decrement: 100 } },
  }),
  prisma.user.update({
    where: { id: toId },
    data: { credits: { increment: 100 } },
  }),
]);
```

```typescript
// ❌ Running migrate dev in production
// prisma migrate dev — may reset data!

// ✅ Use migrate deploy in production
// prisma migrate deploy — applies pending migrations only
```

## Checklist

- [ ] `prisma/schema.prisma` is the single source of truth
- [ ] `prisma generate` in `postinstall` script
- [ ] `migrate dev` in development, `migrate deploy` in CI/production
- [ ] Queries use `select` or `include` — no unbounded fetches
- [ ] Multi-step writes wrapped in `$transaction`
- [ ] No N+1 queries — relations loaded in a single query
- [ ] Enums used for fixed value sets
- [ ] Seeds are idempotent (use `upsert`)
- [ ] Connection pooling configured for the deployment environment
- [ ] Indexes defined on foreign keys and frequently queried columns
