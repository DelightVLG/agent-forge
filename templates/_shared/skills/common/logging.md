# Logging & Observability

Rules and patterns for structured logging and observability. Apply on top of
`conventions.md`.

## Rules

- **Use structured logging.** Use `pino` (preferred) or `winston`. Never use
  `console.log` in production code. Log entries must be JSON objects with
  consistent fields: `level`, `message`, `timestamp`, `requestId`, `service`.
- **Log levels have meaning.** `error` — something broke and needs attention.
  `warn` — something unexpected but handled. `info` — significant business
  events (user created, order placed, deploy started). `debug` — detailed flow
  for troubleshooting. Default to `info` in production, `debug` in development.
- **Correlation IDs everywhere.** Generate a unique `requestId` (UUID) at the
  API gateway or first middleware. Pass it through all layers — HTTP headers,
  service calls, queue messages, database queries. Include it in every log
  entry.
- **Log at boundaries.** Log incoming requests (method, path, userId) and
  outgoing responses (status, duration). Log external service calls (what, to
  where, how long). Log queue message processing (received, completed, failed).
- **Never log secrets.** Passwords, tokens, API keys, credit card numbers, PII
  in plain text — never. Use allowlist-based serialization for request bodies.
  Redact sensitive headers (`Authorization`, `Cookie`).
- **Log errors with context.** Include: what operation failed, what input caused
  it, the error message and stack trace, the correlation ID. Without context, a
  log entry is noise.
- **Request logging middleware.** Add a middleware that logs every HTTP
  request/response with: method, path, status code, response time in ms,
  requestId. In NestJS use an interceptor, in Express use `morgan` or custom
  middleware.
- **Health checks.** Expose `GET /health` (liveness) and `GET /ready`
  (readiness) endpoints. Liveness: process is alive. Readiness: dependencies
  (DB, Redis, external APIs) are reachable. Return status and dependency
  details.
- **Performance tracking.** Log slow operations (queries > 100ms, API calls >
  1s). Track response time percentiles. Use `process.hrtime.bigint()` or
  `performance.now()` for precise timing.
- **Log rotation and retention.** Never write unbounded log files. Use stdout in
  containers (let the platform handle collection). In non-containerized
  environments, configure rotation (daily, max 100MB per file, 14 days
  retention).

## Anti-Patterns

- Logging entire request/response bodies (bloats logs, leaks data).
- Using string interpolation in log messages instead of structured fields.
- Logging inside tight loops (floods logs, kills performance).
- Missing correlation IDs — makes distributed debugging impossible.
- `console.error` in catch blocks instead of proper logger with context.
