# Environment & Configuration

Rules and patterns for managing environment variables and application
configuration. Apply on top of `conventions.md` and `security-basics.md`.

## Rules

- **Validate env vars at startup.** Parse and validate all environment variables
  on application boot using Zod or a similar schema library. Fail fast with a
  clear error message listing every missing or invalid variable. Never read
  `process.env` directly in business logic.
- **Single config module.** Create one `config.ts` that reads, validates, and
  exports typed configuration. All other modules import from config, never from
  `process.env`. This gives you one place to see every external dependency.
  ```ts
  // config.ts
  const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(["development", "production", "test"]),
  });
  export const config = envSchema.parse(process.env);
  ```
- **Use `.env` files for local development only.** `.env` files are for
  developer convenience. Production, staging, and CI must inject env vars
  through the platform (Docker, Kubernetes, CI secrets). Never commit `.env`
  files — `.env.example` with placeholder values is required.
- **Separate secrets from config.** Secrets (API keys, DB passwords, tokens)
  must come from env vars or a secrets manager. Never hardcode secrets. Never
  put secrets in config files, even "encrypted" ones.
- **Environment-specific behavior via NODE_ENV.** Use `NODE_ENV` for the three
  standard environments: `development`, `production`, `test`. Use feature flags
  for everything else — never add custom NODE_ENV values like `staging`.
- **Type-safe config throughout.** After validation, config values are typed.
  Use these types — never cast `process.env.PORT` to number inline. If a config
  value needs transformation (URL parsing, boolean coercion), do it in the
  config module.
- **Document every env var.** Maintain `.env.example` with every variable,
  grouped by service, with comments explaining purpose and format. This is the
  source of truth for what the app needs to run.
- **No conditional imports based on env.** Don't `require` different modules
  based on `NODE_ENV`. Use dependency injection or config-driven behavior
  instead. Conditional imports make the dependency graph unpredictable.
- **Defaults only for non-critical values.** `PORT`, `LOG_LEVEL`, pagination
  limits — safe to default. `DATABASE_URL`, `JWT_SECRET`, API keys — must be
  explicitly provided, crash if missing.
- **Frontend env vars are public.** Variables bundled into frontend code
  (`VITE_*`, `NEXT_PUBLIC_*`) are visible to users. Never put secrets in
  frontend env vars. Validate them at build time.

## Anti-Patterns

- Reading `process.env.X` scattered across the codebase.
- Committing `.env` files with real credentials.
- Using `dotenv` in production — env should already be injected.
- Silently falling back to defaults for critical config (DB URL, secrets).
- Multiple config files for different environments (config.dev.ts,
  config.prod.ts).
