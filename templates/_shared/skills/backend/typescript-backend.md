# TypeScript (Backend)

Rules and patterns for strict TypeScript usage in backend applications. Apply on
top of `conventions.md`.

## Rules

- **Strict mode always.** Enable `strict: true` in `tsconfig.json`. Additionally
  enable `noUncheckedIndexedAccess` and `noPropertyAccessFromIndexType` for
  maximum safety.
- **No `any`.** Use `unknown` for truly unknown types and narrow with type
  guards. If you must use `any`, add a `// eslint-disable` comment with
  justification.
- **Branded types for domain identifiers.** Use branded types for IDs, currency
  amounts, and units to prevent accidental mixing: `UserId` and `OrderId` are
  different types even though both are strings.
- **Discriminated unions for error handling.** Return `Result<T, E>` types
  instead of throwing exceptions for expected failure paths. Reserve `throw` for
  unexpected errors.
- **Use `satisfies` over type assertions.** Prefer
  `const config = { ... } satisfies Config` over
  `const config = { ... } as Config`. `satisfies` validates without widening.
- **Type middleware and request objects.** Extend Express/Fastify types via
  declaration merging for typed `req.user`, `req.session`, etc. Never use
  `(req as any).user`.
- **Use generics in the service layer.** Generic repository/service patterns
  reduce duplication while preserving type safety. Don't duplicate CRUD
  implementations per entity.
- **Infer types from schemas.** Derive types from Zod schemas, Prisma models, or
  Drizzle tables. Don't maintain parallel type definitions that can drift.
- **Use `const` assertions for literal types.** Use `as const` on config
  objects, enum-like maps, and string arrays to preserve literal types.
- **Keep `tsconfig.json` minimal.** Extend from a shared config package. Only
  override what's necessary per app/package.

## Patterns

### Strict tsconfig

```json
// packages/config-typescript/node.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noPropertyAccessFromIndexType": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "isolatedModules": true
  }
}
```

### Branded types

```typescript
// types/branded.ts
declare const brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [brand]: B };

export type UserId = Brand<string, "UserId">;
export type OrderId = Brand<string, "OrderId">;
export type Cents = Brand<number, "Cents">;

// Constructor functions
export const UserId = (id: string) => id as UserId;
export const OrderId = (id: string) => id as OrderId;
export const Cents = (amount: number) => amount as Cents;

// Usage — compiler prevents mixing
function getOrder(orderId: OrderId): Promise<Order> { ... }

getOrder(UserId("abc")); // ❌ Type error
getOrder(OrderId("abc")); // ✅
```

### Discriminated union for results

```typescript
// types/result.ts
type Success<T> = { ok: true; data: T };
type Failure<E> = { ok: false; error: E };
export type Result<T, E = AppError> = Success<T> | Failure<E>;

// Usage in service
async function createUser(
  dto: CreateUserDto,
): Promise<Result<User, "EMAIL_TAKEN">> {
  const exists = await usersRepo.findByEmail(dto.email);
  if (exists) {
    return { ok: false, error: "EMAIL_TAKEN" };
  }
  const user = await usersRepo.create(dto);
  return { ok: true, data: user };
}

// Caller handles both paths explicitly
const result = await createUser(dto);
if (!result.ok) {
  // result.error is typed as "EMAIL_TAKEN"
  return res.status(409).json({ error: { code: result.error } });
}
// result.data is typed as User
res.status(201).json({ data: result.data });
```

### Declaration merging for Express

```typescript
// types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user: {
        id: UserId;
        email: string;
        roles: string[];
      };
    }
  }
}

// Now req.user is typed everywhere
app.get("/me", authMiddleware, (req, res) => {
  const userId = req.user.id; // typed as UserId
  res.json({ userId });
});
```

### Type inference from Zod schema

```typescript
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(["user", "admin", "editor"]).default("user"),
});

// Infer type — no duplicate type definition
type CreateUserDto = z.infer<typeof createUserSchema>;

// Same pattern with Drizzle
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
type User = InferSelectModel<typeof users>;
type NewUser = InferInsertModel<typeof users>;
```

### Generic repository

```typescript
// Abstract base for common CRUD
abstract class BaseService<T extends { id: string }> {
  constructor(protected readonly repo: Repository<T>) {}

  async findById(id: string): Promise<T | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repo.find(options);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}

// Concrete service adds domain-specific methods
class UsersService extends BaseService<User> {
  constructor(@InjectRepository(User) repo: Repository<User>) {
    super(repo);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }
}
```

### Const assertions

```typescript
// Config with literal types preserved
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number]; // "GET" | "POST" | ...

const ERROR_CODES = {
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 422,
} as const;
type ErrorCode = keyof typeof ERROR_CODES; // "NOT_FOUND" | "CONFLICT" | "VALIDATION"
```

## Anti-patterns

```typescript
// ❌ Using any
const data: any = req.body;
(req as any).user = decoded;

// ✅ Use unknown + narrowing or declaration merging
const data: unknown = req.body;
const parsed = createUserSchema.parse(data); // typed after validation
```

```typescript
// ❌ Parallel type definitions that drift
// types/user.ts
interface User {
  id: string;
  email: string;
  name: string;
}
// prisma/schema.prisma — separate definition, may not match

// ✅ Infer from single source
import { User } from "@prisma/client"; // generated from schema
```

```typescript
// ❌ Type assertion instead of satisfies
const config = {
  port: 3000,
  host: "localhost",
} as AppConfig; // may be missing fields, no error

// ✅ satisfies validates completeness
const config = {
  port: 3000,
  host: "localhost",
} satisfies AppConfig; // error if fields missing
```

```typescript
// ❌ Mixing IDs of different entities
function getOrder(orderId: string) { ... }
function getUser(userId: string) { ... }
getOrder(userId); // no error — both are strings

// ✅ Branded types prevent misuse
function getOrder(orderId: OrderId) { ... }
getOrder(userId); // ❌ Type error: UserId is not OrderId
```

## Checklist

- [ ] `strict: true` and `noUncheckedIndexedAccess` enabled
- [ ] No `any` in codebase (or each instance justified with comment)
- [ ] Branded types used for domain IDs and units
- [ ] Discriminated unions used for expected error paths
- [ ] `satisfies` used instead of `as` for config validation
- [ ] Express/Fastify request types extended via declaration merging
- [ ] Types inferred from schemas (Zod, Prisma, Drizzle), not duplicated
- [ ] `as const` used on literal config objects and string arrays
- [ ] Generic base classes for shared CRUD patterns
- [ ] `tsconfig.json` extends shared config, minimal overrides
