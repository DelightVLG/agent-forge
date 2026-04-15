# Database Migrations

Rules and patterns for managing database schema changes safely. Apply on top of
`conventions.md`.

## Rules

- **Every schema change is a migration file.** Never modify the database schema
  manually or through ad-hoc SQL. All changes must be tracked in version
  control.
- **Never edit old migrations.** Once a migration is committed and applied, it
  is immutable. Create a new migration to fix issues.
- **Migrations must be reversible when feasible.** Provide both `up` and `down`
  methods. If a migration is truly irreversible (data deletion), document it
  explicitly.
- **Two-phase column removal.** Phase 1: deploy code that stops using the
  column. Phase 2 (next deploy): drop the column via migration. Never drop a
  column and remove code in the same deploy.
- **Two-phase column rename.** Phase 1: add new column, backfill data, update
  code to write both. Phase 2: switch reads to new column. Phase 3: drop old
  column.
- **Seed data is separate from schema migrations.** Seeds live in their own
  files and can be re-run safely (idempotent).
- **Test migrations on prod-shaped data before merging** when feasible. A
  migration that works on an empty DB may lock a 10M-row table for minutes.
- **Migration names are descriptive and timestamped.** Format:
  `YYYYMMDDHHMMSS_description.ts`. Example:
  `20240115120000_add_users_email_index.ts`.
- **One concern per migration.** Don't mix table creation with data backfill.
  Don't combine index creation with column changes.
- **Avoid locking operations on large tables.** Use `CREATE INDEX CONCURRENTLY`,
  add columns with defaults via backfill, and avoid
  `ALTER TABLE ... ADD COLUMN DEFAULT` on large tables in PostgreSQL < 11.

## Patterns

### Migration file structure

```typescript
// migrations/20240115120000_add_users_email_index.ts
import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("users", (table) => {
    table.index("email", "idx_users_email");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("users", (table) => {
    table.dropIndex("email", "idx_users_email");
  });
}
```

### Two-phase column removal

```
# Phase 1 — code deploy (migration 001)
# Remove all references to `legacy_status` in application code
# Deploy code that no longer reads/writes `legacy_status`

# Phase 2 — schema deploy (migration 002)
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("orders", (table) => {
    table.dropColumn("legacy_status");
  });
}
```

### Idempotent seed

```typescript
// seeds/001_default_roles.ts
export async function seed(knex: Knex): Promise<void> {
  const roles = ["admin", "user", "editor"];

  for (const name of roles) {
    await knex("roles").insert({ name }).onConflict("name").ignore();
  }
}
```

### Non-locking index creation (PostgreSQL)

```sql
-- Migration for large tables — avoid table lock
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_id
  ON orders (user_id);
```

## Anti-patterns

```typescript
// ❌ Editing an existing migration after it was applied
// migrations/20240101_create_users.ts — adding a column to an old migration

// ✅ Create a new migration
// migrations/20240115_add_users_phone.ts
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("users", (table) => {
    table.string("phone").nullable();
  });
}
```

```typescript
// ❌ Drop column and remove code in same deploy
// risk: rolling deploy means old instances still need the column
await knex.schema.alterTable("users", (t) => t.dropColumn("legacy_field"));

// ✅ Two-phase: code stops using it first, next deploy drops it
```

```typescript
// ❌ Mixing schema and data in one migration
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("categories", ...);
  await knex("categories").insert([{ name: "General" }]); // seed data here
}

// ✅ Separate migration from seed
// migrations/001_create_categories.ts — schema only
// seeds/001_default_categories.ts — data only
```

```typescript
// ❌ Vague migration name
// 20240115_update.ts

// ✅ Descriptive name
// 20240115120000_add_users_email_unique_index.ts
```

## Checklist

- [ ] Every schema change has a corresponding migration file
- [ ] No previously-applied migrations have been edited
- [ ] Reversible migrations have both `up` and `down` methods
- [ ] Column removals follow two-phase approach
- [ ] Seed data is in separate files, not in schema migrations
- [ ] Migration tested against production-sized dataset (when applicable)
- [ ] Migration names are timestamped and descriptive
- [ ] Large table operations use non-locking alternatives
- [ ] One concern per migration file
