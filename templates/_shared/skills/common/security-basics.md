# Security Basics

Baseline security rules for every application. Apply on top of `conventions.md`.
For auth-specific rules see `auth.md`.

## Rules

- **Validate all external input at the boundary.** HTTP handlers, form
  submissions, WebSocket messages, CLI arguments — anything from outside the
  system must be validated before use. Use Zod, class-validator, or Joi.
- **Parameterize all database queries.** Never string-interpolate user input
  into SQL, MongoDB queries, or any query language. Use parameterized queries or
  ORM methods exclusively.
- **Escape output by default.** Use framework-provided escaping (React JSX,
  NestJS serializers). If you must render raw HTML, add a comment explaining why
  and ensure the source is trusted.
- **Authn ≠ authz.** Authentication (who are you?) and authorization (can you do
  this?) are separate checks. Apply both on every protected route.
- **Rate-limit all public endpoints.** Auth endpoints: strict limits (see
  `auth.md`). API endpoints: reasonable limits per IP/user. Use middleware like
  `@nestjs/throttler` or `express-rate-limit`.
- **Log security events, never secrets.** Log: login attempts, permission
  denials, input validation failures, rate limit hits. Never log: passwords,
  tokens, API keys, PII in plain text.
- **Dependencies must be maintained.** Prefer packages with >1k weekly
  downloads, recent commits, and no known vulnerabilities. Run `pnpm audit` in
  CI and block on critical/high findings.
- **HTTPS everywhere.** Never serve over plain HTTP in production. Redirect HTTP
  → HTTPS. Set `Strict-Transport-Security` header.
- **CORS: explicit allowlist.** Never use `origin: "*"` in production. List
  allowed origins explicitly.
- **Security headers.** Set at minimum:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Content-Security-Policy` (at least `default-src 'self'`) Use `helmet`
    middleware in Express/NestJS.
- **No secrets in source code or git history.** Use environment variables. If a
  secret is accidentally committed, rotate it immediately — removing from git
  history is not enough.
- **Principle of least privilege.** Database users should have only the
  permissions they need. API tokens should have minimal scopes. Service accounts
  should not be admin.

## Patterns

### Input validation at boundary

```typescript
// Zod schema for API input
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100),
  age: z.number().int().min(13).max(150).optional(),
});

// In route handler
const result = createUserSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({ errors: result.error.flatten() });
}
const validatedData = result.data; // typed and safe
```

### Parameterized queries

```typescript
// ✅ Parameterized (Prisma)
const user = await prisma.user.findUnique({
  where: { email: input.email },
});

// ✅ Parameterized (raw SQL with tagged template)
const user = await sql`SELECT * FROM users WHERE email = ${input.email}`;

// ✅ Parameterized (pg driver)
const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [
  input.email,
]);
```

### Security headers with helmet

```typescript
// main.ts (NestJS)
import helmet from 'helmet';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  }),
);
```

### CORS configuration

```typescript
// main.ts
app.enableCors({
  origin: ['https://app.example.com', 'https://admin.example.com'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
});
```

### Rate limiting

```typescript
// NestJS with @nestjs/throttler
@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: 1000, limit: 3 }, // 3 req/sec
        { name: 'medium', ttl: 60000, limit: 60 }, // 60 req/min
      ],
    }),
  ],
})
export class AppModule {}
```

### Secure logging

```typescript
// ❌ Leaking sensitive data
logger.info('User login', { email, password, token });

// ✅ Redacted
logger.info('User login', {
  email,
  passwordProvided: !!password,
  tokenPrefix: token?.slice(0, 8) + '...',
});
```

## Anti-patterns

```typescript
// ❌ String interpolation in SQL
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ Parameterized query
const query = `SELECT * FROM users WHERE email = $1`;
await pool.query(query, [email]);
```

```typescript
// ❌ Trusting client input without validation
app.post('/users', (req, res) => {
  db.users.create(req.body); // anything can be in req.body
});

// ✅ Validate first
app.post('/users', (req, res) => {
  const data = createUserSchema.parse(req.body);
  db.users.create(data);
});
```

```typescript
// ❌ Wildcard CORS
app.enableCors({ origin: '*' });

// ✅ Explicit allowlist
app.enableCors({ origin: ['https://app.example.com'] });
```

```tsx
// ❌ Raw HTML rendering without justification
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ If truly needed, sanitize and comment
// Rendering markdown preview — input sanitized by DOMPurify
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(markdown) }} />
```

```typescript
// ❌ Overprivileged database user
// Using postgres superuser for the application

// ✅ Dedicated user with minimal permissions
// CREATE USER app_user WITH PASSWORD '...';
// GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
```

## Checklist

- [ ] All external input validated at the boundary (Zod / class-validator)
- [ ] All database queries parameterized (no string interpolation)
- [ ] Output escaped by default; raw rendering justified and sanitized
- [ ] Auth and authz are separate checks on every protected route
- [ ] Rate limiting on all public endpoints
- [ ] Security headers set via `helmet` or equivalent
- [ ] CORS configured with explicit origin allowlist
- [ ] HTTPS enforced with HSTS header
- [ ] No secrets in source code — environment variables only
- [ ] `pnpm audit` runs in CI, blocks on critical/high
- [ ] Security events logged without leaking secrets or PII
- [ ] Database and API credentials follow least-privilege principle
