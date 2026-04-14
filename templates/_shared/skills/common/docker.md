# Docker

Rules and patterns for containerizing applications. Apply on top of
`conventions.md`.

## Rules

- **Multi-stage builds always.** Separate `build` and `runtime` stages. The
  final image must not contain compilers, dev-dependencies, or source code.
- **Minimal base images.** Use `node:22-alpine` (or `node:22-slim`) for Node.js.
  Avoid full Debian images unless a native dependency requires glibc.
- **Non-root user.** Run the app as a non-root user in production. Add
  `USER node` (or a custom user) after copying files.
- **`.dockerignore` is mandatory.** At minimum exclude: `node_modules`, `.git`,
  `dist`, `.env*`, `*.md`, `coverage/`, `.turbo/`.
- **Copy lockfile first** (`package.json` + `pnpm-lock.yaml`), install
  dependencies, then copy source. This maximizes layer caching.
- **One process per container.** Don't run multiple services in one container.
  Use `docker-compose` to orchestrate multi-service setups.
- **Health checks.** Define `HEALTHCHECK` in every Dockerfile or `healthcheck`
  in compose. Use a lightweight endpoint (`/health` returning 200).
- **No secrets in images.** Never `COPY .env` or use `ARG` for secrets. Pass
  secrets via environment variables at runtime or use Docker secrets.
- **Pin image tags.** Use `node:22.x-alpine`, not `node:latest` or
  `node:alpine`. Pin to a minor version for reproducibility.
- **Graceful shutdown.** Use `exec` form for CMD (`CMD ["node", "dist/main"]`,
  not `CMD node dist/main`) so the process receives SIGTERM directly.

## Patterns

### Multi-stage Node.js build

```dockerfile
# ── Build stage ────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies first (layer cache)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/*/package.json ./packages/
RUN pnpm install --frozen-lockfile

# Build
COPY . .
RUN pnpm build

# ── Runtime stage ──────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=build /app/package.json /app/pnpm-lock.yaml ./
COPY --from=build /app/dist ./dist

RUN pnpm install --prod --frozen-lockfile

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

### docker-compose for local development

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      target: build # use build stage for dev (has devDependencies)
    volumes:
      - .:/app
      - /app/node_modules # anonymous volume to preserve node_modules
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    command: pnpm dev

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: app
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s

volumes:
  pgdata:
```

### .dockerignore

```
node_modules
.git
.gitignore
dist
coverage
.env*
*.md
.turbo
.next
.expo
```

## Anti-patterns

```dockerfile
# ❌ Single stage — final image has devDependencies and source
FROM node:22
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
CMD ["node", "dist/main.js"]

# ✅ Multi-stage — slim runtime image
FROM node:22-alpine AS build
# ... build steps ...

FROM node:22-alpine AS runtime
COPY --from=build /app/dist ./dist
# ... prod install, USER node, HEALTHCHECK ...
```

```dockerfile
# ❌ Shell form CMD — PID 1 is /bin/sh, app doesn't get SIGTERM
CMD npm start

# ✅ Exec form — node process is PID 1
CMD ["node", "dist/main.js"]
```

```dockerfile
# ❌ Secrets baked into image
COPY .env .env
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# ✅ Secrets at runtime
# Pass via: docker run -e DATABASE_URL=... or env_file in compose
```

```dockerfile
# ❌ Floating tag
FROM node:latest

# ✅ Pinned tag
FROM node:22.12-alpine
```

## Checklist

- [ ] Multi-stage build — final image has no devDependencies or source
- [ ] Base image is Alpine/slim and tag is pinned to minor version
- [ ] `.dockerignore` excludes `node_modules`, `.git`, `.env*`
- [ ] Lockfile + package.json copied before source (layer caching)
- [ ] Running as non-root user (`USER node`)
- [ ] CMD uses exec form (`["node", "..."]`)
- [ ] HEALTHCHECK defined
- [ ] No secrets in image layers
- [ ] `docker-compose` services have health checks and `depends_on` conditions
