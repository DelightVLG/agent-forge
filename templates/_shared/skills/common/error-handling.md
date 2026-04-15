# Error Handling

Rules and patterns for consistent error handling across the stack. Apply on top
of `conventions.md`.

## Rules

- **Define an error hierarchy.** Create a base `AppError` class extending
  `Error` with `code`, `statusCode`, and `isOperational` fields. Derive specific
  errors: `ValidationError`, `NotFoundError`, `AuthError`, `ConflictError`.
  Never throw plain strings or generic `Error`.
- **Operational vs programmer errors.** Operational errors (bad input, missing
  resource, network timeout) are expected — handle them gracefully with proper
  HTTP status codes. Programmer errors (null reference, type mismatch) are bugs
  — crash and restart in production, fix immediately.
- **Centralize exception handling.** Use a single global exception filter /
  middleware. In NestJS: `@Catch()` exception filter. In Express:
  `app.use((err, req, res, next) => ...)` as the last middleware. Map `AppError`
  subclasses to HTTP responses. Log unexpected errors and return generic 500.
- **Consistent error response shape.** All API error responses must follow one
  schema:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }
  ```
  Never leak stack traces, internal paths, or SQL errors to the client.
- **Fail fast at boundaries.** Validate input (DTOs, query params, env vars) at
  the entry point. Return 400 immediately — don't let bad data propagate deeper
  into the system.
- **Never swallow errors silently.** Every `catch` block must either: re-throw,
  return an error response, or log with sufficient context. Empty `catch {}` is
  forbidden.
- **Use Result pattern for expected failures.** For operations that commonly
  fail (parsing, lookups), prefer returning `{ ok, data, error }` objects over
  throwing. Reserve exceptions for truly exceptional situations.
- **Add context when re-throwing.** If catching and re-throwing, wrap the
  original error:
  `throw new AppError("Order failed", { cause: originalError })`. Preserve the
  full error chain for debugging.
- **React error boundaries.** Wrap route-level components in `ErrorBoundary`.
  Show a user-friendly fallback UI. Log the error to the reporting service.
  Never let a component error crash the entire app.
- **Async errors must be caught.** Every `async` call must have error handling —
  `.catch()` on promises, `try/catch` in async functions. Unhandled promise
  rejections crash Node.js in production.

## Anti-Patterns

- Returning `null` or `-1` to signal errors — use Result or throw.
- Catching errors just to log them and re-throw without adding context.
- Using HTTP 200 with `{ success: false }` — use proper status codes.
- Generic `catch (e) { console.log(e) }` without any recovery or response.
- Different error shapes from different endpoints.
