# Vite + React

Rules and patterns for Vite-based React projects. Apply on top of `react.md` and
`conventions.md`.

## Rules

- **`vite.config.ts` is the single config.** Don't scatter build config across
  multiple files. Plugins, aliases, proxy, and build options all live here.
- **Path aliases via `resolve.alias`.** Map `@/` to `src/` in both
  `vite.config.ts` and `tsconfig.json`. Keep them in sync.
- **Environment variables via `import.meta.env`.** Only variables prefixed with
  `VITE_` are exposed to client code. Never use `process.env` in client code.
- **Proxy API in dev.** Configure `server.proxy` to forward `/api` requests to
  the backend. Never hard-code `localhost:3001` in client code.
- **Code split by route.** Use `React.lazy()` for route-level components. Vite
  handles chunk splitting automatically.
- **Optimize deps explicitly.** If a large CJS dependency causes slow dev
  startup, add it to `optimizeDeps.include`.
- **No barrel re-exports in app code.** Vite tree-shakes well, but barrel files
  (`index.ts` re-exporting 50 modules) slow down HMR. Keep barrels at package
  boundaries only.
- **Test with Vitest.** Use Vitest (shares Vite's config and transforms) for
  unit and integration tests. Don't add Jest — they conflict.
- **Assets in `public/` for static, `src/assets/` for processed.** Files in
  `public/` are served as-is. Files in `src/assets/` go through the build
  pipeline (hashing, optimization).

## Patterns

### Vite config with common plugins

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
});
```

### tsconfig path alias sync

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### Environment variables

```bash
# .env
VITE_API_URL=https://api.example.com
VITE_APP_TITLE=My App
DATABASE_URL=postgres://...  # NOT exposed to client
```

```typescript
// src/lib/config.ts
export const config = {
  apiUrl: import.meta.env.VITE_API_URL,
  appTitle: import.meta.env.VITE_APP_TITLE,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;
```

```typescript
// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_TITLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### Route-level code splitting

```tsx
// src/router.tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';

const Dashboard = lazy(() => import('@/pages/dashboard'));
const Settings = lazy(() => import('@/pages/settings'));

export const router = createBrowserRouter([
  {
    path: '/dashboard',
    element: (
      <Suspense fallback={<Spinner />}>
        <Dashboard />
      </Suspense>
    ),
  },
  {
    path: '/settings',
    element: (
      <Suspense fallback={<Spinner />}>
        <Settings />
      </Suspense>
    ),
  },
]);
```

### Vitest config

```typescript
// vitest.config.ts (or inside vite.config.ts)
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

## Anti-patterns

```typescript
// ❌ process.env in client code — undefined in Vite
const url = process.env.API_URL;

// ✅ import.meta.env with VITE_ prefix
const url = import.meta.env.VITE_API_URL;
```

```typescript
// ❌ Hard-coded backend URL
fetch('http://localhost:4000/api/users');

// ✅ Relative path + dev proxy
fetch('/api/users');
// vite.config: server.proxy["/api"] → http://localhost:4000
```

```typescript
// ❌ Jest in a Vite project — config conflicts, different transforms
// jest.config.ts + babel.config.ts + ...

// ✅ Vitest — shares Vite config, zero extra setup
// vitest.config.ts (or test block in vite.config.ts)
```

```typescript
// ❌ Barrel file re-exporting everything in app code
// src/components/index.ts
export { Button } from './button';
export { Input } from './input';
// ... 40 more — slows HMR

// ✅ Import directly
import { Button } from '@/components/button';
```

```typescript
// ❌ Missing VITE_ prefix — variable is undefined at runtime
// .env
API_KEY = secret123;

// ✅ Prefixed for client exposure
// .env
VITE_API_KEY = public - key - 123;
```

## Checklist

- [ ] `@/` alias configured in both `vite.config.ts` and `tsconfig.json`
- [ ] Environment variables use `VITE_` prefix and `import.meta.env`
- [ ] `ImportMetaEnv` interface declared in `vite-env.d.ts`
- [ ] API proxy configured in `server.proxy`, no hard-coded URLs
- [ ] Route-level code splitting with `React.lazy` + `Suspense`
- [ ] Vitest used for testing, not Jest
- [ ] No barrel files in app code (only at package boundaries)
- [ ] Static assets in `public/`, processed assets in `src/assets/`
- [ ] Build produces vendor chunk for React/React DOM
- [ ] No `process.env` in client code
