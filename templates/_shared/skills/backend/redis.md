# Redis

Rules and patterns for working with Redis. Apply on top of `conventions.md`.

## Rules

- **Cache-aside as the default strategy.** Read from cache first; on miss, read
  from DB, then populate cache. Use write-through only when stale reads are
  unacceptable.
- **Always set TTL.** Every key must have an expiration. No immortal keys unless
  explicitly justified (e.g. feature flags). Default TTL: 5–15 minutes for
  cache, 24h for sessions.
- **Use key namespaces.** Prefix keys with the service/domain:
  `users:123:profile`, `cache:orders:list`, `lock:payment:456`. Never use bare
  keys.
- **Serialize with JSON, not custom formats.** Use `JSON.stringify` /
  `JSON.parse`. If performance is critical, use MessagePack — but document the
  choice.
- **Connection pooling.** Use a single Redis client instance per process (or a
  pool). Never create a new connection per request.
- **Handle connection failures gracefully.** Cache misses should fall through to
  the database. A Redis outage must not crash the application.
- **Use Redis data structures appropriately.** Strings for simple cache. Hashes
  for objects. Sorted sets for leaderboards/rankings. Streams for event queues.
  Don't encode everything as JSON strings.
- **Distributed locks via Redlock pattern.** Set lock with
  `SET key value NX EX ttl`. Always set a TTL on locks. Always release locks in
  a `finally` block.
- **Never use `KEYS *` in production.** Use `SCAN` for iteration. `KEYS` blocks
  the server on large datasets.
- **Monitor memory.** Set `maxmemory` and a eviction policy (`allkeys-lru` for
  cache, `noeviction` for queues). Alert when memory usage exceeds 80%.

## Patterns

### Cache-aside

```typescript
async function getUserCached(userId: string): Promise<User> {
  const cacheKey = `users:${userId}:profile`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const user = await db.users.findById(userId);
  if (user) {
    await redis.set(cacheKey, JSON.stringify(user), 'EX', 900); // 15 min
  }
  return user;
}
```

### Cache invalidation

```typescript
async function updateUser(userId: string, data: UpdateUserDto): Promise<User> {
  const user = await db.users.update(userId, data);

  // Invalidate cache after write
  await redis.del(`users:${userId}:profile`);

  return user;
}
```

### Distributed lock

```typescript
async function withLock<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const lockKey = `lock:${key}`;
  const lockValue = randomUUID();
  const ttlSec = Math.ceil(ttlMs / 1000);

  const acquired = await redis.set(lockKey, lockValue, 'EX', ttlSec, 'NX');
  if (!acquired) {
    throw new ConflictError(`Resource ${key} is locked`);
  }

  try {
    return await fn();
  } finally {
    // Release only if we still own the lock
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await redis.eval(script, 1, lockKey, lockValue);
  }
}
```

### Rate limiting (sliding window)

```typescript
async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowSec * 1000;

  const multi = redis.multi();
  multi.zremrangebyscore(key, 0, windowStart);
  multi.zadd(key, now, `${now}:${randomUUID()}`);
  multi.zcard(key);
  multi.expire(key, windowSec);

  const results = await multi.exec();
  const count = results[2][1] as number;

  return count <= limit;
}
```

### Session storage

```typescript
async function createSession(
  userId: string,
  metadata: SessionMeta,
): Promise<string> {
  const sessionId = randomUUID();
  const key = `sessions:${sessionId}`;

  await redis.hset(key, {
    userId,
    createdAt: Date.now().toString(),
    ip: metadata.ip,
    userAgent: metadata.userAgent,
  });
  await redis.expire(key, 7 * 24 * 3600); // 7 days

  return sessionId;
}

async function getSession(sessionId: string): Promise<SessionData | null> {
  const key = `sessions:${sessionId}`;
  const data = await redis.hgetall(key);
  return Object.keys(data).length > 0 ? (data as SessionData) : null;
}
```

## Anti-patterns

```typescript
// ❌ No TTL — key lives forever
await redis.set('cache:users:list', JSON.stringify(users));

// ✅ Always set expiration
await redis.set('cache:users:list', JSON.stringify(users), 'EX', 900);
```

```typescript
// ❌ Bare key names
await redis.set('data', value);
await redis.set('123', value);

// ✅ Namespaced keys
await redis.set('users:123:profile', value);
await redis.set('cache:orders:list:page1', value);
```

```typescript
// ❌ KEYS * in production — blocks the event loop
const allKeys = await redis.keys('users:*');

// ✅ Use SCAN for iteration
async function* scanKeys(pattern: string) {
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(
      cursor,
      'MATCH',
      pattern,
      'COUNT',
      100,
    );
    cursor = next;
    yield* keys;
  } while (cursor !== '0');
}
```

```typescript
// ❌ New connection per request
app.get('/users/:id', async (req, res) => {
  const client = new Redis(); // connection leak
  const data = await client.get(`users:${req.params.id}`);
  res.json(data);
});

// ✅ Shared client instance
const redis = new Redis(process.env.REDIS_URL);

app.get('/users/:id', async (req, res) => {
  const data = await redis.get(`users:${req.params.id}`);
  res.json(data);
});
```

```typescript
// ❌ App crashes when Redis is down
const cached = await redis.get(key); // throws, no catch

// ✅ Graceful degradation
let cached: string | null = null;
try {
  cached = await redis.get(key);
} catch (err) {
  logger.warn('Redis unavailable, falling through to DB', {
    error: err.message,
  });
}
```

## Checklist

- [ ] Every key has a TTL (no immortal keys without justification)
- [ ] Keys use namespaced format (`domain:id:field`)
- [ ] Single Redis client instance per process (connection pooling)
- [ ] Cache-aside pattern used for read-heavy data
- [ ] Cache invalidated on writes
- [ ] Application handles Redis connection failures gracefully
- [ ] `SCAN` used instead of `KEYS` for iteration
- [ ] Distributed locks have TTL and are released in `finally`
- [ ] `maxmemory` and eviction policy configured
- [ ] Rate limiting uses sliding window or token bucket
