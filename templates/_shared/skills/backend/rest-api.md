# REST API Design

Rules and patterns for designing RESTful APIs. Apply on top of `conventions.md`
and `security-basics.md`.

## Rules

- **RESTful resource naming.** Plural nouns for collections (`/users`,
  `/orders`). Nested sparingly and max one level deep (`/users/:id/sessions`).
  No verbs in URLs.
- **Correct HTTP status codes.** `200` OK, `201` Created, `204` No Content,
  `400` Bad Request, `401` Unauthorized, `403` Forbidden, `404` Not Found, `409`
  Conflict, `422` Unprocessable Entity, `5xx` Server Error.
- **Consistent error envelope.** Define once, reuse everywhere:
  ```json
  { "error": { "code": "VALIDATION_FAILED", "message": "...", "fields": {} } }
  ```
- **Version from day one if the API is public.** Use URL-based versioning
  (`/v1/users`). Internal APIs may skip versioning initially.
- **Cursor-based pagination for unbounded lists.** Offset pagination is
  acceptable for admin/internal APIs with bounded datasets.
- **Idempotency keys for state-changing operations** that charge money, send
  messages, or create resources. Accept via `Idempotency-Key` header.
- **Use proper HTTP methods.** `GET` for reads (cacheable, no side effects).
  `POST` for creation. `PUT` for full replacement. `PATCH` for partial update.
  `DELETE` for removal.
- **Filter, sort, and search via query parameters.** Use consistent naming:
  `?status=active&sort=-createdAt&search=query`. Never use POST for read
  operations.
- **Response envelopes for collections.** Always wrap collections with metadata:
  `{ "data": [...], "pagination": { "cursor": "...", "hasMore": true } }`.
- **HATEOAS is optional** but hypermedia links are useful for public APIs.
  Include `self` links at minimum.

## Patterns

### Resource endpoints

```
GET    /v1/users              # list users (paginated)
POST   /v1/users              # create user
GET    /v1/users/:id          # get user by ID
PATCH  /v1/users/:id          # partial update
DELETE /v1/users/:id          # delete user
GET    /v1/users/:id/orders   # user's orders (nested, one level)
```

### Cursor-based pagination

```typescript
// Request
GET /v1/users?limit=20&cursor=eyJpZCI6MTAwfQ

// Response
{
  "data": [...],
  "pagination": {
    "cursor": "eyJpZCI6MTIwfQ",
    "hasMore": true,
    "limit": 20
  }
}

// Implementation
async function paginate(query: SelectQueryBuilder, cursor?: string, limit = 20) {
  if (cursor) {
    const { id } = decodeCursor(cursor);
    query.where("id > :id", { id });
  }

  const items = await query.orderBy("id", "ASC").take(limit + 1).getMany();
  const hasMore = items.length > limit;
  if (hasMore) items.pop();

  return {
    data: items,
    pagination: {
      cursor: items.length ? encodeCursor(items[items.length - 1].id) : null,
      hasMore,
      limit,
    },
  };
}
```

### Error envelope

```typescript
// Consistent error response
export class ApiError {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number,
    public readonly fields?: Record<string, string[]>,
  ) {}

  toResponse() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.fields && { fields: this.fields }),
      },
    };
  }
}

// Usage in exception filter
response.status(error.statusCode).json(error.toResponse());
```

### Idempotency key

```typescript
// Middleware
async function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const key = req.headers['idempotency-key'] as string;
  if (!key) return next();

  const cached = await redis.get(`idempotency:${key}`);
  if (cached) {
    const { status, body } = JSON.parse(cached);
    return res.status(status).json(body);
  }

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    redis.set(
      `idempotency:${key}`,
      JSON.stringify({
        status: res.statusCode,
        body,
      }),
      'EX',
      86400,
    );
    return originalJson(body);
  };

  next();
}
```

### Filtering and sorting

```typescript
// GET /v1/orders?status=active&sort=-createdAt&limit=20
function parseSort(sort: string): { field: string; order: 'ASC' | 'DESC' } {
  const order = sort.startsWith('-') ? 'DESC' : 'ASC';
  const field = sort.replace(/^-/, '');
  return { field, order };
}
```

## Anti-patterns

```
# ❌ Verbs in URLs
POST /v1/getUsers
POST /v1/createUser
POST /v1/deleteUser/123

# ✅ Nouns + HTTP methods
GET    /v1/users
POST   /v1/users
DELETE /v1/users/123
```

```typescript
// ❌ Inconsistent error shapes
res.status(400).json({ msg: 'bad input' });
res.status(404).json({ error: 'not found' });
res.status(422).json({ errors: ['invalid email'] });

// ✅ Consistent error envelope everywhere
res.status(400).json({
  error: {
    code: 'VALIDATION_FAILED',
    message: 'Invalid input',
    fields: { email: ['required'] },
  },
});
```

```typescript
// ❌ Using POST for read operations
app.post("/v1/users/search", (req, res) => { ... });

// ✅ GET with query parameters
app.get("/v1/users?search=john&role=admin", (req, res) => { ... });
```

```
# ❌ Deeply nested resources
GET /v1/companies/1/departments/5/teams/3/members/42/tasks

# ✅ Flat resources with filters
GET /v1/tasks?memberId=42
GET /v1/members/42/tasks  (one level of nesting max)
```

```typescript
// ❌ Returning bare arrays
res.json([user1, user2]);

// ✅ Wrapped with metadata
res.json({ data: [user1, user2], pagination: { hasMore: false } });
```

## Checklist

- [ ] Resource URLs use plural nouns, no verbs
- [ ] HTTP methods match their semantics (GET reads, POST creates, etc.)
- [ ] Status codes are correct and consistent
- [ ] Error responses follow a single envelope format
- [ ] Collections are paginated (cursor-based for public APIs)
- [ ] Filtering and sorting use query parameters
- [ ] Collection responses wrapped with pagination metadata
- [ ] Idempotency keys used for payment/messaging endpoints
- [ ] API versioned if public-facing
- [ ] Nesting limited to one level maximum
