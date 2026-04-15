# Express

Rules and patterns for building Express applications. Apply on top of
`conventions.md` and `security-basics.md`.

## Rules

- **Middleware order matters.** Apply in this order: security (`helmet`,
  `cors`), body parsing, logging, auth, routes, error handler. The error handler
  must be last.
- **Controllers are thin.** Route handlers validate input, call a service, and
  send a response. No business logic in route handlers.
- **Use Router for modular routes.** Group related endpoints in separate Router
  instances. Mount them under a prefix in the main app.
- **Always use async error handling.** Wrap async handlers to catch rejected
  promises. Use a library like `express-async-errors` or a wrapper function.
  Never let unhandled promise rejections crash the server.
- **One global error handler.** Define a single `(err, req, res, next)`
  middleware that maps exceptions to consistent error responses. Log the error
  and return a structured error envelope.
- **Validate input at the boundary.** Use Zod, Joi, or class-validator to
  validate `req.body`, `req.params`, and `req.query` before any processing.
- **No `app.listen` in the module export.** Export the `app` instance and start
  the server in a separate entry file. This allows testing with `supertest`
  without starting the server.
- **Use `express.json()` with a size limit.** Set `limit: "100kb"` (or
  appropriate) to prevent large payload attacks.
- **Graceful shutdown.** Listen for `SIGTERM` / `SIGINT`, stop accepting new
  connections, drain existing requests, then exit.
- **No state in the app object.** Express apps must be stateless. Use external
  stores (Redis, DB) for sessions, cache, and shared state.

## Patterns

### App structure

```
src/
  app.ts              # Express app setup (middleware, routes)
  server.ts           # app.listen, graceful shutdown
  routes/
    index.ts          # mount all routers
    users.router.ts
    orders.router.ts
  middleware/
    error-handler.ts
    validate.ts
    auth.ts
  services/
    users.service.ts
    orders.service.ts
```

### App setup

```typescript
// app.ts
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { router } from "./routes";
import { errorHandler } from "./middleware/error-handler";

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: ["https://app.example.com"], credentials: true }));

// Parsing
app.use(express.json({ limit: "100kb" }));

// Routes
app.use("/api/v1", router);

// Error handler — must be last
app.use(errorHandler);

export { app };
```

### Modular router

```typescript
// routes/users.router.ts
import { Router } from "express";
import { usersService } from "../services/users.service";
import { validate } from "../middleware/validate";
import { createUserSchema } from "../schemas/user.schema";

const router = Router();

router.get("/", async (req, res) => {
  const users = await usersService.findAll(req.query);
  res.json({ data: users });
});

router.post("/", validate(createUserSchema), async (req, res) => {
  const user = await usersService.create(req.body);
  res.status(201).json({ data: user });
});

export { router as usersRouter };
```

### Validation middleware

```typescript
// middleware/validate.ts
import { ZodSchema } from "zod";
import { AppError } from "../errors/app-error";

function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Invalid input",
        400,
        result.error.flatten().fieldErrors,
      );
    }
    req.body = result.data;
    next();
  };
}
```

### Global error handler

```typescript
// middleware/error-handler.ts
function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, fields: err.details },
    });
  }

  logger.error("Unhandled error", { error: err.message, stack: err.stack });
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Internal server error" },
  });
}
```

### Graceful shutdown

```typescript
// server.ts
import { app } from "./app";

const server = app.listen(3000, () => {
  logger.info("Server started on port 3000");
});

function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  // Force exit after 10s
  setTimeout(() => process.exit(1), 10000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

## Anti-patterns

```typescript
// ❌ Business logic in route handler
router.post("/users", async (req, res) => {
  const exists = await db.user.findUnique({ where: { email: req.body.email } });
  if (exists) return res.status(409).json({ error: "exists" });
  const hashed = await bcrypt.hash(req.body.password, 12);
  const user = await db.user.create({
    data: { ...req.body, password: hashed },
  });
  res.status(201).json(user);
});

// ✅ Thin handler delegates to service
router.post("/users", validate(createUserSchema), async (req, res) => {
  const user = await usersService.create(req.body);
  res.status(201).json({ data: user });
});
```

```typescript
// ❌ Unhandled async errors — crashes the server
router.get("/users/:id", async (req, res) => {
  const user = await usersService.findById(req.params.id); // throws, no catch
  res.json(user);
});

// ✅ Use express-async-errors or wrap handlers
import "express-async-errors"; // patches Express to catch async errors
```

```typescript
// ❌ app.listen in the same file as app setup
const app = express();
app.use(router);
app.listen(3000); // can't test without starting the server

// ✅ Separate app from server
// app.ts — exports app
// server.ts — imports app and calls listen
```

```typescript
// ❌ No body size limit
app.use(express.json()); // accepts payloads of any size

// ✅ Set a reasonable limit
app.use(express.json({ limit: "100kb" }));
```

## Checklist

- [ ] Middleware applied in correct order (security → parsing → auth → routes →
      errors)
- [ ] Route handlers are thin — business logic in services
- [ ] Routes organized with `Router` and mounted under prefixes
- [ ] Async errors are caught (via wrapper or `express-async-errors`)
- [ ] Single global error handler returns consistent error envelope
- [ ] Input validated at the boundary with Zod/Joi
- [ ] `app` exported separately from `server.listen`
- [ ] `express.json` has a size limit
- [ ] Graceful shutdown handles SIGTERM/SIGINT
- [ ] Security middleware applied (helmet, cors, rate-limit)
