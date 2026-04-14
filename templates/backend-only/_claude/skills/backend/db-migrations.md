# Database Migrations

- Every schema change is a migration file. Never edit old migrations.
- Migrations reversible when feasible (`up` and `down`).
- Never drop columns in the same deploy as the code that stops using them —
  two-phase.
- Seed data separate from schema migrations.
- Test migrations on prod-shaped data before merging when feasible.
