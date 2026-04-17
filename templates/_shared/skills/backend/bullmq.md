# BullMQ (Queues & Background Jobs)

Rules and patterns for queue-based processing with BullMQ. Apply on top of
`conventions.md` and `redis.md`.

## Rules

- **One queue per domain concern.** `email-queue`, `payment-queue`,
  `image-processing-queue` — not a single `jobs` queue. This gives independent
  scaling, monitoring, and failure isolation.
- **Jobs are serializable data.** Job data must be plain JSON — no class
  instances, no functions, no circular references. Include only IDs and
  parameters needed to perform the work. Read fresh state from the database
  inside the processor.
- **Idempotent processors.** Every job processor must be safe to run multiple
  times with the same input. Use `jobId` for deduplication. Check state before
  acting (e.g., don't send an email if already sent). BullMQ retries on failure
  — your processor must handle that.
- **Set explicit job options.** Always configure:
  - `attempts`: max retries (typically 3–5)
  - `backoff`: `{ type: "exponential", delay: 1000 }`
  - `removeOnComplete`: `{ age: 86400 }` (24h) or `{ count: 1000 }`
  - `removeOnFail`: `{ age: 604800 }` (7 days) for debugging
- **Graceful shutdown.** Call `worker.close()` on `SIGTERM`/`SIGINT`. This lets
  in-progress jobs finish before the process exits. Set a reasonable
  `drainDelay` (5–30s) to avoid hanging.
- **Concurrency per worker.** Set `concurrency` based on the job type: CPU-bound
  work (image processing) → 1–2. I/O-bound work (API calls, emails) → 5–10.
  Never set unlimited concurrency.
- **Use named processors for different job types in one queue.** If a queue
  handles multiple job types, use named processors instead of a single processor
  with a `switch` statement.
- **Progress tracking for long jobs.** Call `job.updateProgress(percent)` for
  jobs that take > 5s. Expose progress to the UI via polling or WebSocket.
- **Dead letter handling.** Monitor failed jobs. Set up alerting when failed
  count exceeds threshold. Build an admin endpoint or use Bull Board to inspect,
  retry, or remove failed jobs.
- **Separate worker processes.** Run workers in dedicated processes, not inside
  the API server. This prevents queue processing from affecting API latency and
  allows independent scaling.

## Patterns

```ts
// Queue definition
const emailQueue = new Queue('email', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 604800 },
  },
});

// Adding a job
await emailQueue.add(
  'welcome',
  { userId: '123' },
  { jobId: `welcome-${userId}` },
);

// Worker
const worker = new Worker(
  'email',
  async (job) => {
    // Idempotent: check before acting
    const user = await db.user.findUnique({ where: { id: job.data.userId } });
    if (user.welcomeEmailSent) return;
    await sendEmail(user.email, 'welcome');
    await db.user.update({
      where: { id: user.id },
      data: { welcomeEmailSent: true },
    });
  },
  { connection: redisConnection, concurrency: 5 },
);
```

## Anti-Patterns

- Passing entire database records as job data instead of IDs.
- Processing jobs inside the API server process.
- Missing retry/backoff configuration — jobs fail once and are lost.
- No monitoring of failed jobs — silent failures accumulate.
- Using `removeOnComplete: true` (immediate removal) — prevents debugging.
