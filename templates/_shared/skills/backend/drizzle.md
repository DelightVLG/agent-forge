# Drizzle

Rules and patterns for working with Drizzle ORM. Apply on top of
`conventions.md` and `db-migrations.md`.

## Rules

- **Schema as code.** Define tables, columns, and relations in TypeScript files.
  The schema is the source of truth — not the database.
- **Use `drizzle-kit` for migrations.** Generate migrations with
  `drizzle-kit generate`, apply with `drizzle-kit migrate`. Never write
  migration SQL by hand unless `drizzle-kit` can't express the change.
- **Type-safe queries always.** Use the Drizzle query builder, not raw SQL. Fall
  back to `sql` tagged template only for complex queries that the builder can't
  express.
- **Define relations explicitly.** Use `relations()` helper for declaring
  one-to-one, one-to-many, and many-to-many relationships. This enables the
  relational query API.
- **Use prepared statements for hot queries.** Call `.prepare()` on frequently
  executed queries to skip SQL generation overhead.
- **Transactions for multi-step writes.** Use `db.transaction()` for operations
  that must be atomic.
- **Select only needed columns.** Use
  `.select({ id: users.id, name: users.name })` instead of `select()` (which
  fetches all columns).
- **Connection pooling.** Use `postgres` (node-postgres) with a pool, or
  `@neondatabase/serverless` for serverless. Never create connections per
  request.
- **One schema file per domain.** Organize schemas in `src/db/schema/` with one
  file per table or bounded context. Re-export from a barrel `index.ts`.
- **Keep Drizzle Kit config in `drizzle.config.ts`.** Define `schema`, `out`,
  `driver`, and `dbCredentials` in the config file. Don't scatter config across
  multiple places.

## Patterns

### Schema definition

```typescript
// src/db/schema/users.ts
import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["user", "admin", "editor"]);

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: roleEnum("role").default("user").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));
```

### Database client setup

```typescript
// src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

export const db = drizzle(pool, { schema });
```

### Type-safe queries

```typescript
import { eq, and, desc, ilike } from "drizzle-orm";

// Select specific columns
const userList = await db
  .select({ id: users.id, email: users.email, name: users.name })
  .from(users)
  .where(eq(users.role, "admin"))
  .orderBy(desc(users.createdAt));

// Insert with returning
const [newUser] = await db
  .insert(users)
  .values({ email: "user@example.com", name: "User", passwordHash: hash })
  .returning({ id: users.id, email: users.email });

// Update
await db
  .update(users)
  .set({ name: "New Name", updatedAt: new Date() })
  .where(eq(users.id, userId));

// Delete
await db.delete(users).where(eq(users.id, userId));
```

### Relational queries

```typescript
// Fetch user with posts (uses relations defined in schema)
const userWithPosts = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    posts: {
      columns: { id: true, title: true },
      where: eq(posts.published, true),
      orderBy: desc(posts.createdAt),
      limit: 10,
    },
  },
});
```

### Prepared statements

```typescript
const getUserById = db
  .select()
  .from(users)
  .where(eq(users.id, sql.placeholder("id")))
  .prepare("get_user_by_id");

// Execute — skips SQL generation
const user = await getUserById.execute({ id: userId });
```

### Transaction

```typescript
async function transferCredits(fromId: string, toId: string, amount: number) {
  await db.transaction(async (tx) => {
    const [sender] = await tx
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, fromId))
      .for("update");

    if (sender.credits < amount) {
      throw new AppError("INSUFFICIENT_CREDITS", "Not enough credits", 422);
    }

    await tx
      .update(users)
      .set({ credits: sql`credits - ${amount}` })
      .where(eq(users.id, fromId));
    await tx
      .update(users)
      .set({ credits: sql`credits + ${amount}` })
      .where(eq(users.id, toId));
  });
}
```

### Drizzle Kit config

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

## Anti-patterns

```typescript
// ❌ Select all columns when only a few are needed
const users = await db.select().from(users);

// ✅ Select specific columns
const users = await db.select({ id: users.id, name: users.name }).from(users);
```

```typescript
// ❌ Raw SQL for simple queries
const result = await db.execute(sql`SELECT * FROM users WHERE id = ${id}`);

// ✅ Use the type-safe query builder
const result = await db.select().from(users).where(eq(users.id, id));
```

```typescript
// ❌ Multi-step write without transaction
await db
  .update(users)
  .set({ credits: sql`credits - 100` })
  .where(eq(users.id, fromId));
await db
  .update(users)
  .set({ credits: sql`credits + 100` })
  .where(eq(users.id, toId));

// ✅ Wrap in transaction
await db.transaction(async (tx) => {
  await tx
    .update(users)
    .set({ credits: sql`credits - 100` })
    .where(eq(users.id, fromId));
  await tx
    .update(users)
    .set({ credits: sql`credits + 100` })
    .where(eq(users.id, toId));
});
```

```typescript
// ❌ Hand-written migration SQL
// drizzle/0001_manual_change.sql — written manually, may drift from schema

// ✅ Generated migration
// pnpm drizzle-kit generate — generates SQL from schema diff
```

```typescript
// ❌ Schema spread across random files
// src/routes/users.ts — table definition here
// src/services/posts.ts — another table definition here

// ✅ Schema organized in src/db/schema/
// src/db/schema/users.ts
// src/db/schema/posts.ts
// src/db/schema/index.ts — barrel export
```

## Checklist

- [ ] Schema defined in TypeScript in `src/db/schema/`
- [ ] Relations declared with `relations()` helper
- [ ] Migrations generated via `drizzle-kit generate`
- [ ] Queries use the type-safe builder, not raw SQL
- [ ] Only needed columns selected in queries
- [ ] Multi-step writes wrapped in `db.transaction()`
- [ ] Prepared statements used for frequently executed queries
- [ ] Connection pooling configured
- [ ] `drizzle.config.ts` defines all configuration
- [ ] Indexes on foreign keys and frequently queried columns
